#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/// <reference path="./types/deno.d.ts" />

import { Bot } from 'https://deno.land/x/grammy@v1.21.1/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EnBot } from './supabase/functions/enbot-webhook/bot.ts';

// Load environment variables from .local.env file
import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';

const env = await load({ envPath: './.local.env' });

// Initialize Supabase client
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Bot configuration
const botToken = env.TELEGRAM_BOT_TOKEN;
const allowedGroupIds =
  env.ALLOWED_GROUP_ID?.split(',').map((id) => parseInt(id.trim())) || [];
const adminUserIds =
  env.ADMIN_USER_IDS?.split(',').map((id) => parseInt(id.trim())) || [];

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  Deno.exit(1);
}

if (!allowedGroupIds) {
  console.error('❌ ALLOWED_GROUP_ID is required');
  Deno.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required');
  Deno.exit(1);
}

// Prepare Google Sheets configuration for development
const googleSheetsConfig = {
  GOOGLE_SERVICE_ACCOUNT_KEY: env.GOOGLE_SERVICE_ACCOUNT_KEY,
  GOOGLE_SPREADSHEET_ID: env.GOOGLE_SPREADSHEET_ID,
  GOOGLE_SHEET_NAME: env.GOOGLE_SHEET_NAME,
};

console.log('🚀 Starting EnBot in local development mode...');
console.log(`📱 Bot Token: ${botToken.substring(0, 10)}...`);
console.log(`👥 Allowed Group ID: ${allowedGroupIds.join(', ')}`);
console.log(`👑 Admin User IDs: ${adminUserIds.join(', ')}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}`);
console.log('📊 Google Sheets Config:');
console.log(
  `  - Service Account Key: ${
    googleSheetsConfig.GOOGLE_SERVICE_ACCOUNT_KEY ? 'Loaded ✅' : 'Missing ❌'
  }`,
);
console.log(
  `  - Spreadsheet ID: ${
    googleSheetsConfig.GOOGLE_SPREADSHEET_ID ? 'Loaded ✅' : 'Missing ❌'
  }`,
);
console.log(
  `  - Sheet Name: ${
    googleSheetsConfig.GOOGLE_SHEET_NAME || 'Transactions (default)'
  }`,
);
console.log('---');

// Initialize Grammy bot for local development
const telegramBot = new Bot(botToken);

// Initialize our custom bot logic (development mode)
const enBot = new EnBot(
  botToken,
  allowedGroupIds,
  adminUserIds,
  supabase,
  true, // isDevelopment = true for local dev
  googleSheetsConfig,
);

// Set up Grammy bot handlers using our existing EnBot logic
telegramBot.on('message', async (ctx) => {
  const update = {
    update_id: ctx.update.update_id,
    message: ctx.message,
  };

  console.log(
    `📨 Received message from ${ctx.from?.first_name}: "${ctx.message.text}"`,
  );
  await enBot.processUpdate(update);
});

telegramBot.on('callback_query', async (ctx) => {
  const update = {
    update_id: ctx.update.update_id,
    callback_query: ctx.callbackQuery,
  };

  console.log(`🔘 Received callback query: ${ctx.callbackQuery.data}`);
  await enBot.processUpdate(update);
});

// Clear any existing webhook first
console.log('🗑️ Clearing webhook for local development...');
try {
  await enBot.deleteWebhook();
  console.log('✅ Webhook cleared successfully');
} catch (error) {
  console.log(
    '⚠️ Could not clear webhook (might not be set):',
    error instanceof Error ? error.message : error,
  );
}

// Start the bot with polling
console.log('🚀 Starting Grammy bot with polling...');
console.log('💡 Send a message to your bot to test!');
console.log('🛑 Press Ctrl+C to stop');

// Start polling
telegramBot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} started successfully!`);
  },
});

// Graceful shutdown
const handleShutdown = async () => {
  console.log('\n🛑 Shutting down local bot...');
  await telegramBot.stop();

  // Optionally restore webhook for production
  // await enBot.setupWebhook('https://your-production-webhook-url');

  console.log('✅ Local bot stopped');
  Deno.exit(0);
};

// Handle shutdown signals
globalThis.addEventListener('unload', handleShutdown);
Deno.addSignalListener('SIGINT', handleShutdown);
Deno.addSignalListener('SIGTERM', handleShutdown);
