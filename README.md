# EnBot - Telegram Bot for Cash Transaction Management

A TypeScript-based Telegram bot for managing cash transactions with form-based input and group restrictions.

## Features

- 📝 Form-based transaction input with dropdown selections
- 👥 Group restriction (only works in specified Telegram group)
- 💾 SQLite database for data storage
- 🔔 Automatic notifications to specified contacts
- 🚀 Deployed on Render.com

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

### 3. Environment Variables

Create a `.env` file with:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ALLOWED_GROUP_ID=your_group_id_here
DATABASE_PATH=./data/transactions.db
NODE_ENV=production
PORT=3000
```

### 4. Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the bot
npm start

# Or run in development mode
npm run dev
```

## Deployment on Render.com

### 1. Create Service

1. Go to [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Use the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

### 2. Environment Variables

Add these environment variables in Render dashboard:

- `TELEGRAM_BOT_TOKEN`: Your bot token
- `ALLOWED_GROUP_ID`: Your group ID
- `NODE_ENV`: `production`
- `PORT`: `3000`
- `DATABASE_PATH`: `/opt/render/project/data/transactions.db`

### 3. Deploy

The service will automatically deploy when you push to your repository.

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

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  period TEXT NOT NULL,
  contact TEXT NOT NULL,
  recordedBy TEXT NOT NULL,
  recordedAt TEXT NOT NULL,
  chatId INTEGER NOT NULL
);
```

## Security

- Bot only responds to messages from the specified group
- All user sessions are managed in memory
- Database is persistent and stored on disk

## License

MIT