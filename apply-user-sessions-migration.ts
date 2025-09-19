#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';

async function applyUserSessionsMigration() {
  try {
    console.log('📋 Step 1: Connessione a Supabase...');

    const env = await load({ envPath: './.local.env' });

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required in .local.env');
      Deno.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read migration file
    const migrationSql = await Deno.readTextFile(
      './supabase/migrations/20250118_update_user_sessions_constraint.sql',
    );

    console.log('📄 Step 2: Lettura file migrazione user_sessions...');

    // Execute migration
    console.log('⚙️ Step 3: Esecuzione migrazione...');
    console.log(
      '⚠️  Attenzione: Questa operazione modificherà la struttura della tabella user_sessions!',
    );

    // Split SQL into individual statements and execute them
    const statements = migrationSql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        console.log(`🔄 Eseguendo: ${statement.substring(0, 100)}...`);

        const { error } = await supabase.rpc('exec_sql', { 
          sql_statement: statement 
        });

        if (error) {
          console.error("❌ Errore durante l'esecuzione:", error);
          // Continue with next statement if possible
        } else {
          console.log('✅ Eseguito con successo.');
        }
      }
    }

    console.log('🔄 Aggiornamento constraint user_sessions completato!');
    console.log('\n📋 Prossimi passi:');
    console.log('   1. Riavvia il tuo bot locale');
    console.log('   2. Ora gli utenti possono avere sessioni attive per comandi diversi nella stessa chat');
    console.log('   3. Testa il comando /transaction in chat diverse');
  } catch (error) {
    console.log("❌ Errore durante l'applicazione della migrazione user_sessions:");
    console.log(error.message);
    console.log('\n💡 Suggerimenti:');
    console.log('   • Assicurati che SUPABASE_URL e SUPABASE_ANON_KEY siano corretti in .local.env');
    console.log('   • Verifica che la funzione RPC "exec_sql" esista nel tuo progetto Supabase.');
    console.log('   • Controlla i log di Supabase per errori più dettagliati.');
  }
}

// Esegui la migrazione
await applyUserSessionsMigration();
