# Google Sheets Integration Setup

This document explains how to set up Google Sheets integration for the EnBot Telegram bot to automatically sync transaction data.

## Prerequisites

1. Google Cloud Console access
2. A Google Sheets spreadsheet where you want to store the transaction data
3. Access to environment variables for the bot deployment

## Step 1: Create a Google Cloud Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a service account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Enter a name (e.g., "enbot-sheets-service")
   - Click "Create and Continue"
   - Skip role assignment for now (we'll handle permissions at the sheet level)
   - Click "Done"

5. Generate a service account key:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" format
   - Download the JSON file

## Step 2: Prepare the Service Account Key

1. Open the downloaded JSON file
2. Convert it to base64 encoding:
   ```bash
   # On macOS/Linux:
   base64 -i service-account-key.json

   # On Windows:
   certutil -encode service-account-key.json temp.txt && findstr /v /c:"-" temp.txt
   ```
3. Copy the base64 string (it will be very long)

## Step 3: Create or Prepare Google Sheets

1. Create a new Google Sheets document or use an existing one
2. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Extract the `SPREADSHEET_ID` part

3. Share the spreadsheet with the service account:
   - Open the spreadsheet
   - Click "Share" button
   - Add the service account email (found in the JSON file as `client_email`)
   - Give "Editor" permissions

## Step 4: Configure Environment Variables

Add the following environment variables to your bot configuration:

```bash
# Required
GOOGLE_SERVICE_ACCOUNT_KEY=your_base64_encoded_service_account_json
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_from_url

# Optional (defaults to "Transactions")
GOOGLE_SHEET_NAME=Transactions
```

### For Supabase Edge Functions:

1. Go to your Supabase project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the environment variables listed above

### For Local Development:

Add the variables to your `.local.env` file:

```env
GOOGLE_SERVICE_ACCOUNT_KEY=your_base64_encoded_service_account_json
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEET_NAME=Transactions
```

## Step 5: Test the Integration

1. Deploy your bot or restart your local development server
2. Send `/sync-sheets` command to the bot
3. The bot should show sync options if everything is configured correctly

## Available Commands

### `/sync-sheets`
Shows options for Google Sheets synchronization:
- **Sync All**: Exports all transactions from database to Google Sheets
- **Sync Recent**: Exports transactions from the last 7 days
- **Clear Sheets**: Removes all data from the sheet (keeps headers)

## Automatic Integration

When Google Sheets integration is properly configured:
- New transactions created via `/start` will automatically be pushed to Google Sheets
- If Google Sheets sync fails, the transaction is still saved to the database
- Users will be notified if there are sync issues

## Sheet Structure

The Google Sheets will have the following columns:
1. **ID** - Transaction ID
2. **Family** - Selected family name
3. **Category** - Transaction category
4. **Amount** - Transaction amount in EUR
5. **Period** - Transaction period (YYYY-MM-DD)
6. **Contact** - Contact username
7. **Recorded By** - User who recorded the transaction
8. **Recorded At** - Timestamp when recorded
9. **Chat ID** - Telegram chat ID

## Troubleshooting

### Common Issues

1. **"Google Sheets integration not configured"**
   - Check that `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SPREADSHEET_ID` are set
   - Verify the base64 encoding is correct

2. **"Authentication failed"**
   - Verify the service account JSON is valid
   - Check that the service account has access to the Google Sheets API

3. **"Failed to append transaction"**
   - Ensure the service account has "Editor" permissions on the spreadsheet
   - Verify the spreadsheet ID is correct

4. **"Failed to get spreadsheet info"**
   - Check that the spreadsheet exists and is accessible
   - Verify the service account email is shared on the spreadsheet

### Debug Mode

The bot logs Google Sheets operations to the console. Check your deployment logs for detailed error messages.

## Security Considerations

- Keep your service account key secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Regularly rotate service account keys
- Grant minimal necessary permissions to the service account
- Consider using Google Cloud IAM for more granular access control

## Advanced Configuration

### Multiple Sheets
You can configure different sheet names for different environments by setting `GOOGLE_SHEET_NAME` differently in each environment.

### Custom Sheet Structure
The current implementation uses a fixed sheet structure. To customize columns or add additional data, modify the `GoogleSheetsClient` class in `google-sheets-client.ts`.

### Batch Operations
Large sync operations are handled efficiently through the Google Sheets batch API to minimize API calls and improve performance.
