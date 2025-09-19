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
  // Load environment variables
  const env = await load({ envPath: './.local.env' });
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY;
  const botToken = env.TELEGRAM_BOT_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !botToken) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_ANON_KEY');
    console.error('   - TELEGRAM_BOT_TOKEN');
    Deno.exit(1);
  }

  // Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Bot configuration
  const adminUserIds =
    env.ADMIN_USER_IDS?.split(',').map((id) => parseInt(id.trim())) || [];

  // Determine which groups to set up
  let groupIds: string[] = [];
  const groupIdsFromEnv = env.ALLOWED_GROUP_ID;
  const groupIdFromFlag = Deno.args.find((arg) => arg.startsWith('--group='))
    ?.split('=')[1];

  if (groupIdFromFlag) {
    console.log('🔧 Found --group flag, setting up for a single group.');
    groupIds.push(groupIdFromFlag);
  } else if (groupIdsFromEnv) {
    console.log(
      '🔧 Found ALLOWED_GROUP_ID env var, setting up for multiple groups.',
    );
    groupIds = groupIdsFromEnv.split(',').map((id) => id.trim());
  }

  // Instantiate EnBot
  const enBot = new EnBot(
    botToken,
    groupIds.map(Number),
    adminUserIds,
    supabase,
    false, // isDevelopment = true for setup script
  );

  if (groupIds.length === 0) {
    console.warn(
      '⚠️ No group IDs specified via --group flag or ALLOWED_GROUP_ID env var.',
    );
  } else {
    for (const id of groupIds) {
      try {
        await enBot.setupGroupCommands(id);
        console.log(`✅ Commands successfully set for group ${id}`);
      } catch (error) {
        console.error(
          `❌ Failed to set commands for group ${id}:`,
          error.message,
        );
      }
    }
  }
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
