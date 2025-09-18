#!/usr/bin/env -S deno run --allow-net --allow-env

// Simple script to test the deployed webhook
const WEBHOOK_URL = 'https://aifsjzwkpkvvinyotxvs.supabase.co/functions/v1/enbot-webhook/webhook';

const testUpdate = {
  update_id: 999999,
  message: {
    message_id: 1,
    from: {
      id: 123456789,
      first_name: "Test",
      username: "testuser"
    },
    chat: {
      id: -1001234567890, // Replace with your actual group ID
      type: "supergroup",
      title: "Test Group"
    },
    date: Math.floor(Date.now() / 1000),
    text: "/start"
  }
};

console.log('🧪 Testing webhook endpoint...');
console.log(`📡 URL: ${WEBHOOK_URL}`);
console.log(`📨 Sending test update:`, JSON.stringify(testUpdate, null, 2));

try {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testUpdate)
  });

  console.log(`📊 Response Status: ${response.status}`);
  
  const responseText = await response.text();
  console.log(`📋 Response Body:`, responseText);

  if (response.ok) {
    console.log('✅ Webhook test successful!');
  } else {
    console.log('❌ Webhook test failed!');
  }
} catch (error) {
  console.error('❌ Error testing webhook:', error);
}
