const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const N8N_WEBHOOK = 'http://localhost:5678/webhook/whatsapp-in';
const PORT = 3001;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
  },
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('WhatsApp is ready'));

client.on('message', async msg => {
  if (msg.fromMe || msg.from.endsWith('@g.us')) return;

  let from = msg.from;
  if (from.endsWith('@lid')) {
    const [info] = await client.getContactLidAndPhone([from]).catch(() => []);
    if (info?.pn) from = info.pn;
  }

  console.log('Message received:', from, '-', msg.body);
  try {
    await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        fromLid: msg.from !== from ? msg.from : undefined,
        body: msg.body,
        id: msg.id._serialized,
        timestamp: msg.timestamp,
      }),
    });
  } catch (e) {
    console.error('Could not reach n8n:', e.message);
  }
});

const app = express();
app.use(express.json());

async function idCandidates(target) {
  const [info] = await client.getContactLidAndPhone([target]).catch(() => []);
  return [...new Set([target, info?.pn, info?.lid].filter(Boolean))];
}

app.post('/send', async (req, res) => {
  try {
    let lastError;
    for (const candidate of await idCandidates(req.body.to)) {
      try {
        await client.sendMessage(candidate, req.body.text);
        console.log('Reply sent to', candidate);
        return res.json({ ok: true, sentTo: candidate });
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  } catch (e) {
    console.error('Send failed:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.listen(PORT, '127.0.0.1', () => console.log('Send API on port ' + PORT));

client.initialize();