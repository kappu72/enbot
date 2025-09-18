#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EnBot } from './supabase/functions/enbot-webhook/bot.ts';

// Load environment variables from .local.env file
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

const env = await load({ envPath: "./.local.env" });

// Initialize Supabase client
const supabaseUrl = env.SUPABASE_URL || Deno.env.get('SUPABASE_URL')!;
const supabaseKey = env.SUPABASE_ANON_KEY || Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Bot configuration
const botToken = env.TELEGRAM_BOT_TOKEN || Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const allowedGroupId = env.ALLOWED_GROUP_ID || Deno.env.get('ALLOWED_GROUP_ID')!;
const adminUserIds = (env.ADMIN_USER_IDS || Deno.env.get('ADMIN_USER_IDS'))?.split(',').map(id => parseInt(id.trim())) || [];

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  Deno.exit(1);
}

if (!allowedGroupId) {
  console.error('❌ ALLOWED_GROUP_ID is required');
  Deno.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required');
  Deno.exit(1);
}

console.log('🚀 Starting EnBot in local development mode...');
console.log(`📱 Bot Token: ${botToken.substring(0, 10)}...`);
console.log(`👥 Allowed Group ID: ${allowedGroupId}`);
console.log(`👑 Admin User IDs: ${adminUserIds.join(', ')}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}`);

// Initialize bot
const bot = new EnBot(botToken, allowedGroupId, adminUserIds, supabase);

// Polling configuration
let lastUpdateId = 0;
const POLLING_INTERVAL = 1000; // 1 second

async function pollForUpdates() {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const params = new URLSearchParams({
      offset: (lastUpdateId + 1).toString(),
      timeout: '10',
      limit: '100'
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      console.log(`📨 Received ${data.result.length} update(s)`);
      
      for (const update of data.result) {
        console.log(`🔄 Processing update ${update.update_id}`);
        await bot.processUpdate(update);
        lastUpdateId = update.update_id;
      }
    }
  } catch (error) {
    console.error('❌ Error polling for updates:', error);
  }
}

// Clear any existing webhook first
console.log('🗑️ Clearing webhook for local development...');
try {
  await bot.deleteWebhook();
  console.log('✅ Webhook cleared successfully');
} catch (error) {
  console.log('⚠️ Could not clear webhook (might not be set):', error.message);
}

// Start polling
console.log('🔄 Starting polling for updates...');
console.log('💡 Send a message to your bot to test!');
console.log('🛑 Press Ctrl+C to stop');

// Poll for updates
const pollInterval = setInterval(pollForUpdates, POLLING_INTERVAL);

// Graceful shutdown
const handleShutdown = async () => {
  console.log('\n🛑 Shutting down local bot...');
  clearInterval(pollInterval);
  
  // Optionally restore webhook for production
  // await bot.setupWebhook('https://your-production-webhook-url');
  
  console.log('✅ Local bot stopped');
  Deno.exit(0);
};

// Handle shutdown signals
globalThis.addEventListener('unload', handleShutdown);
Deno.addSignalListener('SIGINT', handleShutdown);
Deno.addSignalListener('SIGTERM', handleShutdown);
