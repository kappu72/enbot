#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';
import { createGoogleSheetsClient } from './supabase/functions/enbot-webhook/google-sheets-client.ts';

// Load environment variables
const env = await load({ envPath: './.local.env' });

// Set environment variables for the test
for (const [key, value] of Object.entries(env)) {
  Deno.env.set(key, value);
}

async function testGoogleSheetsIntegration() {
  console.log('🧪 Testing Google Sheets Integration...\n');

  try {
    // Test 1: Create client
    console.log('📋 Step 1: Creating Google Sheets client...');
    const client = createGoogleSheetsClient();

    if (!client) {
      console.log('❌ Failed: Google Sheets client could not be created');
      console.log('💡 Check your environment variables:');
      console.log('   - GOOGLE_SERVICE_ACCOUNT_KEY');
      console.log('   - GOOGLE_SPREADSHEET_ID');
      return;
    }
    console.log('✅ Google Sheets client created successfully');

    // Test 2: Push a test transaction
    console.log('\n📤 Step 2: Testing transaction push...');
    const testTransaction = {
      id: 999,
      family: 'Famiglia Test',
      category: 'quota mensile',
      amount: 25.50,
      period: '2024-01-15',
      contact: '@testuser',
      recordedBy: '@admin',
      recordedAt: new Date().toISOString(),
      chatId: 12345,
    };

    await client.pushTransaction(testTransaction);
    console.log('✅ Test transaction pushed successfully');

    // Test 3: Retrieve transactions
    console.log('\n📥 Step 3: Testing transaction retrieval...');
    const transactions = await client.getTransactions();
    console.log(
      `✅ Retrieved ${transactions.length} transactions from Google Sheets`,
    );

    if (transactions.length > 0) {
      console.log('📊 Latest transaction:');
      const latest = transactions[transactions.length - 1];
      console.log(`   Family: ${latest.family}`);
      console.log(`   Amount: €${latest.amount}`);
      console.log(`   Period: ${latest.period}`);
    }

    console.log(
      '\n🎉 All tests passed! Google Sheets integration is working correctly.',
    );
    console.log('\n📋 Next steps:');
    console.log('   1. Check your Google Sheet to see the test transaction');
    console.log('   2. You can now use /sync-sheets command in your bot');
    console.log(
      '   3. New transactions will automatically sync to Google Sheets',
    );
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log(error.message);
    console.log('\n🔧 Troubleshooting:');

    if (error.message.includes('Authentication failed')) {
      console.log('   • Check your service account key is valid');
      console.log('   • Verify base64 encoding is correct');
    } else if (error.message.includes('Failed to get spreadsheet info')) {
      console.log('   • Check your spreadsheet ID is correct');
      console.log(
        '   • Verify the service account email has access to the spreadsheet',
      );
      console.log(
        '   • Service account email: enbot-799@airy-cortex-472517-p7.iam.gserviceaccount.com',
      );
    } else if (error.message.includes('Failed to append transaction')) {
      console.log('   • Ensure the service account has "Editor" permissions');
      console.log('   • Check if the spreadsheet exists and is accessible');
    }

    console.log(
      '\n📖 For detailed setup instructions, see: docs/google-sheets-setup.md',
    );
  }
}

// Run the test
await testGoogleSheetsIntegration();
