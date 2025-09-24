#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * Script to setup bot commands in Telegram groups
 *
 * Usage:
 * - Global commands: deno run --allow-env --allow-net --allow-read setup-bot-commands.ts
 * - Group commands: deno run --allow-env --allow-net --allow-read setup-bot-commands.ts
 */
/// <reference path="./types/deno.d.ts" />

import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EnBot } from './supabase/functions/enbot-webhook/bot.ts';

async function main(): Promise<void> {
  // Determine environment
  const envArg = Deno.args.find((arg) => arg.startsWith('--env='))
    ?.split('=')[1];
  const envFile = envArg === 'prod' ? '.prod.env' : '.local.env';
  console.log(`🌍 Loading environment from ${envFile}`);

  // Load environment variables
  const env = await load({ envPath: `./${envFile}`, export: true });
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseApiKey = env.API_KEY;
  const botToken = env.TELEGRAM_BOT_TOKEN;

  if (!supabaseUrl || !supabaseApiKey || !botToken) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - API_KEY');
    console.error('   - TELEGRAM_BOT_TOKEN');
    Deno.exit(1);
  }

  // Supabase client
  const supabase = createClient(supabaseUrl, supabaseApiKey);

  // Bot configuration
  const adminUserIds =
    env.ADMIN_USER_IDS?.split(',').map((id) => parseInt(id.trim())) || [];

  // Determine which groups to set up
  const groupIdsFromEnv = env.ALLOWED_GROUP_ID;
  const groupIds: number[] = groupIdsFromEnv.split(',').map((id) =>
    Number(id.trim())
  );

  // Instantiate EnBot
  const enBot = new EnBot(
    botToken,
    groupIds,
    adminUserIds,
    supabase,
    false, // isDevelopment = true for setup script
  );
  await enBot.setupBotCommands();
}

// Run the setup immediately
(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
})();
