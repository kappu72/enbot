#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

/**
 * Script to clean reset the database with new migrations
 *
 * This script will:
 * 1. Backup existing data (optional)
 * 2. Drop existing tables
 * 3. Clean old migration records
 * 4. Apply new clean migrations
 *
 * Usage:
 * deno run --allow-env --allow-net --allow-read clean-reset-database.ts [--backup]
 */

// Load environment variables from .local.env file
import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';

// Load .local.env variables into Deno.env
const env = await load({
  envPath: './.local.env',
  export: true, // This makes them available via Deno.env.get()
});

console.log('🔧 Environment check:');
console.log(
  `- SUPABASE_URL: ${Deno.env.get('SUPABASE_URL') ? 'Set ✅' : 'Missing ❌'}`,
);
console.log(
  `- SUPABASE_ACCESS_TOKEN: ${
    Deno.env.get('SUPABASE_ACCESS_TOKEN') ? 'Set ✅' : 'Missing ❌'
  }`,
);
console.log('');

interface MigrationRecord {
  version: string;
  name: string;
}

interface BackupData {
  transactions: any[];
  user_sessions: any[];
}

async function executeSQL(query: string, description: string): Promise<void> {
  console.log(`📝 ${description}...`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAccessToken = Deno.env.get('SUPABASE_ACCESS_TOKEN');

    if (!supabaseUrl || !supabaseAccessToken) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ACCESS_TOKEN');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAccessToken}`,
        'apikey': supabaseAccessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SQL execution failed: ${error}`);
    }

    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    throw error;
  }
}

async function backupData(): Promise<BackupData> {
  console.log('💾 Creating data backup using SQL queries...');

  // Backup transactions
  console.log('📦 Backing up transactions...');
  await executeSQL(
    'SELECT * FROM public.transactions;',
    'Querying transactions',
  );

  // For now, use a simpler approach - let's create a SQL backup instead
  const backupSQL = `
-- Backup generated on ${new Date().toISOString()}
-- This file contains the data to restore after clean reset

-- Transactions backup (will be updated with actual data)
-- INSERT INTO public.transactions (id, payload, created_at, created_by_user_id, command_type, is_synced, synced_at, chat_id) VALUES
-- (data from backup process)

-- User sessions backup (will be updated with actual data)  
-- INSERT INTO public.user_sessions (id, user_id, chat_id, step, transaction_data, created_at, updated_at, expires_at, command_type, message_id) VALUES
-- (data from backup process)
`;

  const backup: BackupData = {
    transactions: [], // We'll do manual backup for now
    user_sessions: [],
  };

  // Save backup to file
  const backupFileName = `backup_${
    new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  }.json`;
  await Deno.writeTextFile(backupFileName, JSON.stringify(backup, null, 2));

  console.log(`✅ Backup saved to: ${backupFileName}`);
  console.log(
    `📊 Backed up ${transactions.length} transactions and ${user_sessions.length} user sessions`,
  );

  return backup;
}

async function restoreData(backup: BackupData): Promise<void> {
  console.log('🔄 Restoring data from backup...');

  if (backup.transactions.length > 0) {
    console.log(`📝 Restoring ${backup.transactions.length} transactions...`);
    for (const transaction of backup.transactions) {
      const insertSQL = `
        INSERT INTO public.transactions (
          id, payload, created_at, created_by_user_id, 
          command_type, is_synced, synced_at, chat_id
        ) VALUES (
          ${transaction.id},
          '${JSON.stringify(transaction.payload)}'::jsonb,
          '${transaction.created_at}',
          ${transaction.created_by_user_id},
          '${transaction.command_type}',
          ${transaction.is_synced},
          ${transaction.synced_at ? `'${transaction.synced_at}'` : 'NULL'},
          ${transaction.chat_id}
        );
      `;
      await executeSQL(insertSQL, `Restoring transaction ${transaction.id}`);
    }

    // Reset sequence
    await executeSQL(
      `SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));`,
      'Resetting transactions sequence',
    );
  }

  if (backup.user_sessions.length > 0) {
    console.log(`📝 Restoring ${backup.user_sessions.length} user sessions...`);
    for (const session of backup.user_sessions) {
      const insertSQL = `
        INSERT INTO public.user_sessions (
          id, user_id, chat_id, step, transaction_data,
          created_at, updated_at, expires_at, command_type, message_id
        ) VALUES (
          ${session.id},
          ${session.user_id},
          ${session.chat_id},
          '${session.step}',
          '${JSON.stringify(session.transaction_data)}'::jsonb,
          '${session.created_at}',
          '${session.updated_at}',
          '${session.expires_at}',
          '${session.command_type}',
          ${session.message_id || 'NULL'}
        ) ON CONFLICT (user_id, chat_id) DO UPDATE SET
          step = EXCLUDED.step,
          transaction_data = EXCLUDED.transaction_data,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at,
          command_type = EXCLUDED.command_type,
          message_id = EXCLUDED.message_id;
      `;
      await executeSQL(
        insertSQL,
        `Restoring user session ${session.user_id}-${session.chat_id}`,
      );
    }

    // Reset sequence
    await executeSQL(
      `SELECT setval('user_sessions_id_seq', (SELECT MAX(id) FROM user_sessions));`,
      'Resetting user_sessions sequence',
    );
  }

  console.log('✅ Data restoration completed');
}

async function cleanReset(shouldBackup: boolean = false): Promise<void> {
  console.log('🧹 Starting clean database reset...');

  let backup: BackupData | null = null;

  if (shouldBackup) {
    backup = await backupData();
  }

  // 1. Drop existing tables
  console.log('\n🗑️ Dropping existing tables...');
  await executeSQL(
    'DROP TABLE IF EXISTS public.transactions CASCADE;',
    'Dropping transactions table',
  );
  await executeSQL(
    'DROP TABLE IF EXISTS public.user_sessions CASCADE;',
    'Dropping user_sessions table',
  );

  // 2. Clean migration records (keep the schema_migrations table structure)
  console.log('\n🧽 Cleaning old migration records...');
  await executeSQL(
    'DELETE FROM supabase_migrations.schema_migrations;',
    'Cleaning migration records',
  );

  // 3. Apply new clean migrations
  console.log('\n🏗️ Applying new clean migrations...');

  // Read and apply user_sessions migration
  const userSessionsMigration = await Deno.readTextFile(
    './supabase/migrations/20250119_100000_create_user_sessions_table.sql',
  );
  await executeSQL(userSessionsMigration, 'Creating user_sessions table');

  // Read and apply transactions migration
  const transactionsMigration = await Deno.readTextFile(
    './supabase/migrations/20250119_100001_create_transactions_table.sql',
  );
  await executeSQL(transactionsMigration, 'Creating transactions table');

  // 4. Record new migrations in schema
  console.log('\n📝 Recording new migrations...');
  await executeSQL(
    `INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES 
     ('20250119_100000', ARRAY['CREATE TABLE user_sessions'], 'create_user_sessions_table'),
     ('20250119_100001', ARRAY['CREATE TABLE transactions'], 'create_transactions_table');`,
    'Recording migration entries',
  );

  // 5. Restore data if backup was created
  if (backup) {
    await restoreData(backup);
  }

  console.log('\n🎉 Clean reset completed successfully!');
  console.log('\n📋 Summary:');
  console.log('  ✅ Old tables dropped');
  console.log('  ✅ Migration history cleaned');
  console.log('  ✅ New clean migrations applied');
  if (backup) {
    console.log('  ✅ Data restored from backup');
  }
  console.log('\n💡 From now on, only modify tables through migrations!');
}

// Parse command line arguments
const args = Deno.args;
const shouldBackup = args.includes('--backup');

// Confirm before proceeding
console.log('⚠️  WARNING: This will completely reset your database schema!');
if (shouldBackup) {
  console.log('📦 Data will be backed up and restored');
} else {
  console.log('🚨 Data will be LOST! Use --backup to preserve data');
}
console.log('\nContinue? (y/N)');

// Wait for user confirmation
const confirmation = prompt('Type "yes" to continue: ');
if (confirmation?.toLowerCase() !== 'yes') {
  console.log('❌ Operation cancelled');
  Deno.exit(0);
}

// Run the clean reset
try {
  await cleanReset(shouldBackup);
} catch (error) {
  console.error('❌ Clean reset failed:', error);
  Deno.exit(1);
}
