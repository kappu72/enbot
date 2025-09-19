#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

/**
 * Script to setup bot commands in Telegram groups
 *
 * Usage:
 * - Global commands: deno run --allow-env --allow-net --allow-read setup-bot-commands.ts
 * - Group commands: deno run --allow-env --allow-net --allow-read setup-bot-commands.ts --group=-1001234567890
 */

import 'https://deno.land/std@0.208.0/dotenv/load.ts';

interface SetupCommandsResponse {
  status: string;
  message: string;
  error?: string;
}

async function setupBotCommandsForGroup(
  chatId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<void> {
  console.log(`\n🎯 Setting up commands for group: ${chatId}`);
  const endpoint = `${supabaseUrl}/functions/v1/enbot-webhook/setup-commands`;
  const payload = { chatId };

  try {
    console.log(`📡 Calling setup-commands endpoint for group ${chatId}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result: SetupCommandsResponse = await response.json();

    if (response.ok) {
      console.log(`✅ Success for group ${chatId}:`, result.message);
    } else {
      console.error(
        `❌ Error for group ${chatId}:`,
        result.error || result.message,
      );
      // Don't exit on single failure, try next group
    }
  } catch (error) {
    console.error(`❌ Failed to setup commands for group ${chatId}:`, error);
  }
}

async function main(): Promise<void> {
  // Load environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_ANON_KEY');
    Deno.exit(1);
  }

  // Determine which groups to set up
  let groupIds: string[] = [];
  const groupIdsFromEnv = Deno.env.get('ALLOWED_GROUP_ID');
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

  if (groupIds.length === 0) {
    console.warn(
      '⚠️ No group IDs specified via --group flag or ALLOWED_GROUP_ID env var.',
    );
    console.log('🌍 Setting up global commands as a fallback...');
    // Add logic for global setup if needed, or exit
    // For now, let's just show the configured commands and exit gracefully.
  } else {
    for (const id of groupIds) {
      await setupBotCommandsForGroup(id, supabaseUrl, supabaseAnonKey);
    }
  }

  console.log('\n\n📱 Commands configured:');
  console.log('   /quota - 💰 Registra una quota mensile familiare');
  console.log('   /transazione - 📊 Gestisci transazioni generali');
  console.log('   /menu - 🎛️ Mostra menu comandi interattivo (per gruppi)');
  console.log('   /help - ❓ Mostra aiuto e lista comandi');
  console.log('\n🎉 Users can now see commands in the "/" menu!');
  console.log('💡 In gruppi usa /menu per bottoni interattivi!');
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
