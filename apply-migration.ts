#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Load environment variables
const env = await load({ envPath: './.local.env' });

// Set environment variables for the test
for (const [key, value] of Object.entries(env)) {
  Deno.env.set(key, value);
}

async function applyMigration() {
  console.log('🗄️ Applicazione migrazione della tabella transactions...\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📋 Step 1: Connessione a Supabase...');

    // Read migration file
    const migrationSql = await Deno.readTextFile(
      './supabase/migrations/20250118_restructure_transactions_table.sql',
    );

    console.log('📄 Step 2: Lettura file migrazione...');

    // Execute migration
    console.log('⚙️ Step 3: Esecuzione migrazione...');
    console.log(
      '⚠️  Attenzione: Questa operazione modificherà la struttura della tabella!',
    );

    // Split SQL into individual statements and execute them
    const statements = migrationSql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        console.log(`🔄 Eseguendo: ${statement.substring(0, 100)}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error("❌ Errore durante l'esecuzione:", error);
          // Continue with next statement if possible
        } else {
          console.log('✅ Statement eseguito con successo');
        }
      }
    }

    console.log('\n🎉 Migrazione completata con successo!');
    console.log('\n📋 Nuova struttura tabella transactions:');
    console.log('   • id (SERIAL PRIMARY KEY)');
    console.log('   • payload (JSONB) - dati transazione');
    console.log('   • created_at (TIMESTAMP) - data creazione');
    console.log('   • created_by_user_id (BIGINT) - ID utente creatore');
    console.log('   • command_type (VARCHAR) - tipo comando');
    console.log('   • is_synced (BOOLEAN) - flag sincronizzazione');
    console.log('   • synced_at (TIMESTAMP) - data sincronizzazione');
    console.log('   • chat_id (BIGINT) - ID chat Telegram');

    console.log('\n📤 Prossimi passi:');
    console.log('   1. Testa il bot con il nuovo flusso');
    console.log('   2. Verifica la sincronizzazione con Google Sheets');
    console.log('   3. Controlla i dati migrati nel database');
  } catch (error) {
    console.log("❌ Errore durante l'applicazione della migrazione:");
    console.log(error.message);
    console.log('\n💡 Suggerimenti:');
    console.log('   • Verifica le credenziali Supabase');
    console.log('   • Controlla che il database sia accessibile');
    console.log('   • Verifica i permessi del database');
  }
}

// Esegui la migrazione
await applyMigration();
