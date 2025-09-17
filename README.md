# Telegram Transaction Bot

A Telegram bot for managing cash transactions with form-based input and notification system.

## Features

- **Form-based Input**: Interactive conversation to collect transaction details
- **Family Selection**: Dropdown with predefined family options
- **Category Management**: Predefined categories (Quota Mensile, Quota Iscrizione, Altro)
- **Amount Tracking**: Euro-based amount input with validation
- **Period Management**: Date-based period tracking
- **Contact Notifications**: Send notifications to specified Telegram users
- **Group Restriction**: Limit bot usage to specific Telegram groups
- **Data Storage**: SQLite database for transaction persistence

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

### 3. Environment Configuration

1. Copy `env.example` to `.env`
2. Fill in your configuration:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ALLOWED_GROUP_ID=your_group_id_here
DATABASE_PATH=transactions.db
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Run the Bot

```bash
python bot.py
```

## Usage

1. **Start Transaction**: Use `/start` command in the authorized group
2. **Select Family**: Choose from predefined family options
3. **Select Category**: Choose transaction category
4. **Enter Amount**: Input amount in Euros (e.g., 25.50)
5. **Enter Period**: Input date in YYYY-MM-DD format
6. **Enter Contact**: Input username (e.g., @username)
7. **Confirmation**: Transaction is saved and notification sent

## Commands

- `/start` - Begin new transaction registration
- `/help` - Show help message
- `/cancel` - Cancel current operation

## Database Schema

The bot uses SQLite with the following schema:

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT NOT NULL,
    contact TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment on Render.com

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Configure build command: `pip install -r requirements.txt`
5. Configure start command: `python bot.py`

## Configuration

### Families
Edit the `FAMILIES` list in `bot.py` to customize family options:

```python
FAMILIES = [
    "Famiglia Rossi",
    "Famiglia Bianchi", 
    "Famiglia Verdi",
    "Famiglia Neri",
    "Famiglia Blu"
]
```

### Categories
Edit the `CATEGORIES` list in `bot.py` to customize categories:

```python
CATEGORIES = [
    "Quota Mensile",
    "Quota Iscrizione", 
    "Altro"
]
```

## Security

- Bot usage is restricted to specified Telegram groups
- All user inputs are validated
- Database operations use parameterized queries to prevent SQL injection
- Environment variables are used for sensitive configuration

## Troubleshooting

### Bot Not Responding
- Check if bot token is correct
- Verify group ID is correct
- Ensure bot is added to the group

### Notification Failures
- Verify username format (@username)
- Check if the target user has started a conversation with the bot
- Review bot logs for error details

### Database Issues
- Ensure write permissions in the application directory
- Check database file path configuration