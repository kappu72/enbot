// Google Sheets client utility for pushing transaction data
import type { LegacyTransaction } from './types.ts';

export interface GoogleSheetsConfig {
  serviceAccountKey: string; // Base64 encoded service account JSON
  spreadsheetId: string;
  sheetName?: string; // Optional sheet name, defaults to 'Transactions'
}

export interface GoogleSheetsRow {
  id?: number;
  family: string;
  category: string;
  amount: number;
  period: string;
  contact: string;
  recordedBy: string;
  recordedAt: string;
  chatId: number;
}

export interface GoogleAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
}

export class GoogleSheetsClient {
  private config: GoogleSheetsConfig;
  private accessToken: GoogleAuthToken | null = null;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Google APIs using service account credentials
   */
  private async authenticate(): Promise<void> {
    try {
      // Decode the base64 service account key
      const serviceAccountJson = JSON.parse(
        atob(this.config.serviceAccountKey),
      );

      // Create JWT for Google OAuth2
      const jwt = await this.createJWT(serviceAccountJson);

      // Exchange JWT for access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Authentication failed: ${error}`);
      }

      const tokenData = await response.json() as GoogleAuthToken;
      tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
      this.accessToken = tokenData;

      console.log('✅ Successfully authenticated with Google Sheets API');
    } catch (error) {
      console.error('❌ Google Sheets authentication error:', error);
      throw error;
    }
  }

  /**
   * Create JWT for Google OAuth2 authentication
   */
  private async createJWT(serviceAccount: any): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now,
    };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(
      /[+/=]/g,
      (match) => {
        const replacements: { [key: string]: string } = {
          '+': '-',
          '/': '_',
          '=': '',
        };
        return replacements[match];
      },
    );

    const encodedPayload = btoa(JSON.stringify(payload)).replace(
      /[+/=]/g,
      (match) => {
        const replacements: { [key: string]: string } = {
          '+': '-',
          '/': '_',
          '=': '',
        };
        return replacements[match];
      },
    );

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Import the private key
    const privateKeyData = serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\\n/g, '')
      .replace(/\n/g, '');

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      Uint8Array.from(atob(privateKeyData), (c) => c.charCodeAt(0)),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign'],
    );

    // Sign the token
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(unsignedToken),
    );

    const encodedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signature)),
    )
      .replace(/[+/=]/g, (match) => {
        const replacements: { [key: string]: string } = {
          '+': '-',
          '/': '_',
          '=': '',
        };
        return replacements[match];
      });

    return `${unsignedToken}.${encodedSignature}`;
  }

  /**
   * Check if access token is valid and refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (
      !this.accessToken ||
      (this.accessToken.expires_at && Date.now() >= this.accessToken.expires_at)
    ) {
      await this.authenticate();
    }
  }

  /**
   * Get spreadsheet information and create sheet if it doesn't exist
   */
  private async ensureSheetExists(): Promise<string> {
    await this.ensureValidToken();

    const sheetName = this.config.sheetName || 'Transactions';

    try {
      // Get spreadsheet information
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken!.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get spreadsheet info: ${response.statusText}`,
        );
      }

      const spreadsheet = await response.json();
      const existingSheet = spreadsheet.sheets?.find((sheet: any) =>
        sheet.properties?.title === sheetName
      );

      if (existingSheet) {
        return sheetName;
      }

      // Create the sheet if it doesn't exist
      await this.createSheet(sheetName);
      return sheetName;
    } catch (error) {
      console.error('❌ Error ensuring sheet exists:', error);
      throw error;
    }
  }

  /**
   * Create a new sheet with headers
   */
  private async createSheet(sheetName: string): Promise<void> {
    await this.ensureValidToken();

    const requests = [
      {
        addSheet: {
          properties: {
            title: sheetName,
            gridProperties: {
              rowCount: 1000,
              columnCount: 10,
            },
          },
        },
      },
    ];

    // Create the sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken!.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create sheet: ${response.statusText}`);
    }

    // Add headers to the new sheet
    await this.addHeaders(sheetName);
    console.log(`✅ Created sheet "${sheetName}" with headers`);
  }

  /**
   * Add headers to the sheet
   */
  private async addHeaders(sheetName: string): Promise<void> {
    const headers = [
      'ID',
      'Family',
      'Category',
      'Amount',
      'Period',
      'Contact',
      'Recorded By',
      'Recorded At',
      'Chat ID',
    ];

    const range = `${sheetName}!A1:I1`;

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken!.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
        }),
      },
    );
  }

  /**
   * Convert transaction to Google Sheets row format
   */
  private transactionToRow(
    transaction: LegacyTransaction | GoogleSheetsRow,
  ): (string | number)[] {
    return [
      transaction.id || '',
      transaction.family,
      transaction.category,
      transaction.amount,
      transaction.period,
      transaction.contact,
      transaction.recordedBy,
      transaction.recordedAt,
      transaction.chatId,
    ];
  }

  /**
   * Push a single transaction to Google Sheets
   */
  async pushTransaction(
    transaction: LegacyTransaction | GoogleSheetsRow,
  ): Promise<void> {
    try {
      const sheetName = await this.ensureSheetExists();
      await this.ensureValidToken();

      const row = this.transactionToRow(transaction);
      const range = `${sheetName}!A:I`;

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken!.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [row],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to append transaction: ${error}`);
      }

      console.log(
        `✅ Successfully pushed transaction to Google Sheets: ${transaction.family} - €${transaction.amount}`,
      );
    } catch (error) {
      console.error('❌ Error pushing transaction to Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Push multiple transactions to Google Sheets
   */
  async pushTransactions(
    transactions: (LegacyTransaction | GoogleSheetsRow)[],
  ): Promise<void> {
    if (transactions.length === 0) {
      console.log('ℹ️ No transactions to push to Google Sheets');
      return;
    }

    try {
      const sheetName = await this.ensureSheetExists();
      await this.ensureValidToken();

      const rows = transactions.map((transaction) =>
        this.transactionToRow(transaction)
      );
      const range = `${sheetName}!A:I`;

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken!.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: rows,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to append transactions: ${error}`);
      }

      console.log(
        `✅ Successfully pushed ${transactions.length} transactions to Google Sheets`,
      );
    } catch (error) {
      console.error('❌ Error pushing transactions to Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Get all transactions from Google Sheets
   */
  async getTransactions(): Promise<GoogleSheetsRow[]> {
    try {
      const sheetName = await this.ensureSheetExists();
      await this.ensureValidToken();

      const range = `${sheetName}!A2:I`; // Skip header row

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken!.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get transactions: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.values) {
        return [];
      }

      return data.values.map((row: any[]) => ({
        id: row[0] ? parseInt(row[0]) : undefined,
        family: row[1] || '',
        category: row[2] || '',
        amount: row[3] ? parseFloat(row[3]) : 0,
        period: row[4] || '',
        contact: row[5] || '',
        recordedBy: row[6] || '',
        recordedAt: row[7] || '',
        chatId: row[8] ? parseInt(row[8]) : 0,
      }));
    } catch (error) {
      console.error('❌ Error getting transactions from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Clear all data in the sheet (keeps headers)
   */
  async clearTransactions(): Promise<void> {
    try {
      const sheetName = await this.ensureSheetExists();
      await this.ensureValidToken();

      const range = `${sheetName}!A2:I`;

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}:clear`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken!.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to clear transactions: ${response.statusText}`);
      }

      console.log(
        '✅ Successfully cleared all transactions from Google Sheets',
      );
    } catch (error) {
      console.error(
        '❌ Error clearing transactions from Google Sheets:',
        error,
      );
      throw error;
    }
  }
}

/**
 * Factory function to create Google Sheets client from environment variables
 */
export function createGoogleSheetsClient(): GoogleSheetsClient | null {
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');

  if (!serviceAccountKey || !spreadsheetId) {
    console.warn(
      '⚠️ Google Sheets integration not configured. Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SPREADSHEET_ID',
    );
    return null;
  }

  return new GoogleSheetsClient({
    serviceAccountKey,
    spreadsheetId,
    sheetName: Deno.env.get('GOOGLE_SHEET_NAME') || 'Transactions',
  });
}
