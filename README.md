# EnBot - Telegram Bot for Cash Transaction Management

A TypeScript-based Telegram bot for managing cash transactions with form-based input and group restrictions, deployed on Supabase Edge Functions.

## Features

- 📝 Form-based transaction input with dropdown selections
- 👥 Group restriction (only works in specified Telegram group)
- 💾 PostgreSQL database via Supabase
- 🔔 Automatic notifications to specified contacts
- 🚀 Deployed on Supabase Edge Functions
- ⚡ Serverless architecture with global edge deployment

## Transaction Fields

- **Family**: Dropdown selection from predefined families
- **Category**: "quota mensile", "quota iscrizione", "altro"
- **Amount**: Numeric input in EUR
- **Period**: Date in YYYY-MM-DD format
- **Contact**: Telegram username (@username)

## Setup

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command
3. Follow instructions to create your bot
4. Save the bot token

### 2. Get Group ID

1. Add your bot to the desired group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` for your group (it will be negative for groups)

### 3. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Run the migration to create the transactions table:
   ```sql
   CREATE TABLE transactions (
     id SERIAL PRIMARY KEY,
     family TEXT NOT NULL,
     category TEXT NOT NULL,
     amount DECIMAL(10,2) NOT NULL,
     period TEXT NOT NULL,
     contact TEXT NOT NULL,
     recorded_by TEXT NOT NULL,
     recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     chat_id BIGINT NOT NULL
   );
   ```

### 4. Environment Variables

Configure these environment variables in your Supabase project:

- `TELEGRAM_BOT_TOKEN`: Your bot token from BotFather
- `ALLOWED_GROUP_ID`: Your Telegram group ID
- `ADMIN_USER_IDS`: Comma-separated list of admin user IDs (optional)
- `SUPABASE_URL`: Your Supabase project URL (auto-configured)
- `SUPABASE_ANON_KEY`: Your Supabase anon key (auto-configured)

## Deployment on Supabase Edge Functions

### 1. Deploy the Function

The bot is deployed as a Supabase Edge Function. The function code is located in:
- `supabase/functions/enbot-webhook/index.ts` - Main webhook handler
- `supabase/functions/enbot-webhook/bot.ts` - Bot logic

### 2. Configuration

The function is configured in `supabase/config.toml`:

```toml
[functions.enbot-webhook]
verify_jwt = false
```

This disables JWT verification to allow Telegram webhooks to reach the function.

### 3. Webhook Setup

After deployment, configure the Telegram webhook to point to your Edge Function:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/enbot-webhook/webhook"}'
```

### 4. Function Endpoints

- **Webhook**: `https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/enbot-webhook/webhook`
- **Health Check**: `https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/enbot-webhook/`

## Local Development

### 1. Setup Environment
```bash
# Copy the example file
cp .local.env.example .local.env

# Edit .local.env with your actual values
```

### 2. Development Scripts
```bash
# Local development with polling (recommended)
pnpm run dev

# Serve Edge Function locally (requires Supabase CLI)
pnpm run dev:serve

# Type check
pnpm run type-check

# Test deployed webhook
pnpm run test-webhook
```

### 3. Development Mode Features
- 🔄 **Hot reload**: Changes are automatically detected
- 📨 **Polling mode**: No webhook setup needed
- 🔍 **Type checking**: Full Deno TypeScript support
- 🧪 **Testing**: Built-in webhook testing

## Usage

### Commands

- `/start` - Begin a new transaction
- `/help` - Show help message
- `/cancel` - Cancel current transaction

### Transaction Flow

1. User sends `/start`
2. Bot shows family selection (dropdown)
3. User selects category (dropdown)
4. User enters amount in EUR
5. User enters period (YYYY-MM-DD)
6. User enters contact username (@username)
7. Bot saves transaction and sends notifications

## Database Schema

The bot uses a PostgreSQL table in Supabase:

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  family TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  period TEXT NOT NULL,
  contact TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chat_id BIGINT NOT NULL
);
```

## Architecture

- **Edge Functions**: Serverless TypeScript functions running on Deno
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT verification disabled for webhook endpoint
- **Sessions**: Managed in memory within function instances
- **Global Deployment**: Automatically deployed to edge locations worldwide

## Security

- Bot only responds to messages from the specified group or admin users
- Webhook endpoint is public but validates Telegram updates
- All user sessions are managed in memory within function scope
- Database access is secured through Supabase Row Level Security (if configured)

## License

MIT