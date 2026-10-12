const N8N_WEBHOOK =
  process.argv[4] ||
  process.env.N8N_WEBHOOK ||
  'http://localhost:5678/webhook/whatsapp-in';

let from = process.argv[2] || '923001234567@c.us';
const body = process.argv[3] || 'Test message from testsendevent.js';
if (/^\d+$/.test(from)) from += '@c.us';

const payload = {
  from,
  body,
  id: 'TEST-' + Date.now(),
  timestamp: Math.floor(Date.now() / 1000),
};

async function main() {
  console.log('POST', N8N_WEBHOOK);
  console.log('Payload:', JSON.stringify(payload));

  let res;
  try {
    res = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Could not reach n8n:', e.message);
    process.exit(1);
  }

  console.log('Response: HTTP', res.status, await res.text());

  if (res.status === 404) {
    console.log('404 means the webhook is not registered:');
    console.log('- production URL (/webhook/...): the workflow must be Active');
    console.log('- test URL (/webhook-test/...): the editor must be listening');
  }
}

main();
