import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EnBot } from './bot.ts';
import type { GoogleSheetsEnvConfig } from './google-sheets-client.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Bot configuration
const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const allowedGroupIds =
  Deno.env.get('ALLOWED_GROUP_ID')?.split(',').map((id) =>
    parseInt(id.trim())
  ) || [];
const adminUserIds =
  Deno.env.get('ADMIN_USER_IDS')?.split(',').map((id) => parseInt(id.trim())) ||
  [];

// Google Sheets configuration (production mode)
const googleSheetsConfig: GoogleSheetsEnvConfig = {
  GOOGLE_SERVICE_ACCOUNT_KEY: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY'),
  GOOGLE_SPREADSHEET_ID: Deno.env.get('GOOGLE_SPREADSHEET_ID'),
  GOOGLE_SHEET_NAME: Deno.env.get('GOOGLE_SHEET_NAME'),
};

// Initialize bot (production mode)
const bot = new EnBot(
  botToken,
  allowedGroupIds,
  adminUserIds,
  supabase,
  false, // isDevelopment
  googleSheetsConfig,
);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Health check endpoint
  if (
    url.pathname === '/enbot-webhook/health' ||
    url.pathname === '/enbot-webhook/' || url.pathname === '/enbot-webhook'
  ) {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'EnBot Telegram Webhook',
        mode: 'edge-function',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        env_check: {
          has_bot_token: !!botToken,
          has_group_id: !!allowedGroupIds.length,
          has_supabase_url: !!supabaseUrl,
          has_supabase_key: !!supabaseKey,
          google_sheets: {
            has_service_account_key: !!googleSheetsConfig
              .GOOGLE_SERVICE_ACCOUNT_KEY,
            has_spreadsheet_id: !!googleSheetsConfig.GOOGLE_SPREADSHEET_ID,
            sheet_name: googleSheetsConfig.GOOGLE_SHEET_NAME ||
              'Transactions (default)',
          },
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Webhook endpoint - NO JWT REQUIRED for Telegram webhooks
  if (url.pathname === '/enbot-webhook/webhook' && req.method === 'POST') {
    try {
      const update = await req.json();
      console.log('📨 Received webhook update:', update.update_id);

      await bot.processUpdate(update);

      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 404 for other paths
  return new Response(
    JSON.stringify({
      error: 'Not found',
      pathname: url.pathname,
      method: req.method,
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
