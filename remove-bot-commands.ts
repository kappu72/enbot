#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * Script to remove bot commands from Telegram groups
 *
 * Usage:
 * - Global commands: deno run --allow-env --allow-net --allow-read remove-bot-commands.ts
 * - Group commands: deno run --allow-env --allow-net --allow-read remove-bot-commands.ts --scope=group
 * - Specific group: deno run --allow-env --allow-net --allow-read remove-bot-commands.ts --scope=group --chat-id=-1001234567890
 */
/// <reference path="./types/deno.d.ts" />

import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EnBot } from './supabase/functions/enbot-webhook/bot.ts';
import type { TelegramBotCommandScope } from './supabase/functions/enbot-webhook/types.ts';

async function main(): Promise<void> {
  // Parse command line arguments
  const scopeArg = Deno.args.find((arg) => arg.startsWith('--scope='))
    ?.split('=')[1];
  const chatIdArg = Deno.args.find((arg) => arg.startsWith('--chat-id='))
    ?.split('=')[1];

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

  // Determine which groups to remove commands from
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
    false, // isDevelopment = false for removal script
  );

  // Determine scope for command removal
  let scope: TelegramBotCommandScope | undefined;

  if (scopeArg === 'group') {
    if (chatIdArg) {
      // Remove commands from a specific group
      scope = {
        type: 'chat',
        chat_id: parseInt(chatIdArg),
      };
      console.log(`🎯 Removing commands from specific group: ${chatIdArg}`);
    } else {
      // Remove commands from all allowed groups
      console.log(
        `🎯 Removing commands from all allowed groups: ${groupIds.join(', ')}`,
      );
      for (const groupId of groupIds) {
        scope = {
          type: 'chat',
          chat_id: groupId,
        };
        await enBot.removeBotCommands(scope);
      }
      console.log('✅ Commands removed from all groups');
      return;
    }
  } else if (scopeArg === 'all_group_chats') {
    scope = {
      type: 'all_group_chats',
    };
    console.log('🎯 Removing commands from all group chats');
  } else if (scopeArg === 'all_private_chats') {
    scope = {
      type: 'all_private_chats',
    };
    console.log('🎯 Removing commands from all private chats');
  } else if (scopeArg === 'all_chat_administrators') {
    scope = {
      type: 'all_chat_administrators',
    };
    console.log('🎯 Removing commands from all chat administrators');
  } else {
    // Default: remove global commands
    console.log('🎯 Removing global bot commands');
  }

  // Remove bot commands
  await enBot.removeBotCommands(scope);
}

// Run the removal immediately
(async () => {
  try {
    await main();
  } catch (error) {
    console.error('❌ Error removing bot commands:', error);
    Deno.exit(1);
  }
})();
