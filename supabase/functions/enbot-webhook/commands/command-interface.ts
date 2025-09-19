// Command interface and base classes
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  UserSession,
} from '../types.ts';
import { TelegramClient } from '../telegram-client.ts';
import { SessionManager } from '../session-manager.ts';
import type { GoogleSheetsClient } from '../google-sheets-client.ts';

export interface CommandContext {
  supabase: SupabaseClient;
  telegram: TelegramClient;
  sessionManager: SessionManager;
  googleSheetsClient?: GoogleSheetsClient;
  userId: number;
  chatId: number;
  message?: TelegramMessage;
  callbackQuery?: TelegramCallbackQuery;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  shouldContinue?: boolean;
  nextStep?: string;
}

export interface CommandSession extends UserSession {
  commandType: string;
  commandData: Record<string, unknown>;
}

export abstract class BaseCommand {
  protected context: CommandContext;
  protected commandName: string;

  constructor(context: CommandContext, commandName: string) {
    this.context = context;
    this.commandName = commandName;
  }

  /**
   * Get the command name (e.g., 'transaction', 'quote')
   */
  getCommandName(): string {
    return this.commandName;
  }

  /**
   * Get the session key for this command
   */
  protected getSessionKey(): string {
    return `${this.commandName}_${this.context.userId}_${this.context.chatId}`;
  }

  /**
   * Save command session to database
   */
  protected async saveSession(session: CommandSession): Promise<void> {
    await this.context.sessionManager.saveSession({
      ...session,
      userId: this.context.userId,
      chatId: this.context.chatId,
    }, this.commandName);
  }

  /**
   * Load command session from database
   */
  protected async loadSession(): Promise<CommandSession | null> {
    const persistedSession = await this.context.sessionManager.loadSession(
      this.context.userId,
      this.context.chatId,
      this.commandName, // Load session specific to this command
    );
    if (!persistedSession) return null;

    // Convert from snake_case database format to camelCase in-memory format
    const memorySession = this.context.sessionManager.persistedToMemory(
      persistedSession,
    );

    return {
      ...memorySession,
      commandType: this.commandName,
      commandData: persistedSession.transaction_data || {},
    };
  }

  /**
   * Delete command session
   */
  protected async deleteSession(): Promise<void> {
    await this.context.sessionManager.deleteSession(
      this.context.userId,
      this.context.chatId,
      this.commandName,
    );
  }

  /**
   * Delete user session
   */
  protected async deleteUserSession(): Promise<void> {
    await this.context.sessionManager.deleteSession(
      this.context.userId,
      this.context.chatId,
    );
  }
  /**
   * Check if user has an active session for this command
   */
  protected async hasActiveSession(): Promise<boolean> {
    return await this.context.sessionManager.hasActiveSession(
      this.context.userId,
      this.context.chatId,
      this.commandName,
    );
  }

  /**
   * Send message with command context
   */
  protected async sendMessage(
    text: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    const result = await this.context.telegram.sendMessage(
      this.context.chatId,
      text,
      options,
    );
    await this.context.sessionManager.saveMessageId(
      this.context.userId,
      this.context.chatId,
      result.message_id,
    );
    return result;
  }

  /**
   * Answer callback query
   */
  protected async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    chatId?: number | string,
    messageId?: number,
  ): Promise<void> {
    await this.context.telegram.answerCallbackQuery(
      callbackQueryId,
      text || '',
      chatId,
      messageId,
    );
  }

  /**
   * Synchronize transaction with Google Sheets and mark as synced
   */
  protected async syncTransactionToGoogleSheets(
    transactionId: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if Google Sheets client is available
      if (!this.context.googleSheetsClient) {
        console.warn(
          '⚠️ Google Sheets client not available, skipping sync for transaction',
          transactionId,
        );
        console.warn(
          'Configure GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SPREADSHEET_ID env vars',
        );
        return {
          success: false,
          error: 'Google Sheets not configured - sync skipped',
        };
      }

      // Fetch transaction from database
      const { data: transaction, error: fetchError } = await this.context
        .supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        console.error('❌ Failed to fetch transaction:', fetchError);
        return { success: false, error: 'Transaction not found' };
      }

      // Convert JSONB payload to Google Sheets format
      const payload = transaction.payload;
      const googleSheetsRow = {
        id: transaction.id,
        family: payload.family || '',
        category: payload.category || '',
        amount: parseFloat(payload.amount) || 0,
        year: payload.year || '',
        month: payload.month || '',
        description: payload.description || '',
        recordedBy: payload.recorded_by || '',
        recordedAt: payload.recorded_at || transaction.created_at,
        chatId: transaction.chat_id,
      };

      // Push to Google Sheets
      await this.context.googleSheetsClient.pushTransaction(googleSheetsRow);

      // Update transaction as synced in database
      const { error: updateError } = await this.context.supabase
        .from('transactions')
        .update({
          is_synced: true,
          synced_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('❌ Failed to update sync status:', updateError);
        return { success: false, error: 'Failed to update sync status' };
      }

      console.log(
        `✅ Transaction ${transactionId} successfully synced to Google Sheets`,
      );
      return { success: true };
    } catch (error) {
      console.error('❌ Error syncing transaction to Google Sheets:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown sync error';
      return { success: false, error: errorMessage };
    }
  }
  protected getTransactionPayload(
    session: CommandSession,
  ): Record<string, unknown> {
    // split the period into month and year
    const [month, year] = session.transactionData.period!.split('-');
    return {
      category: session.transactionData.category || '',
      amount: session.transactionData.amount || '',
      year: year,
      month: month,
      description: session.transactionData.description || '',
      family: session.transactionData.family || '',
      recorded_at: new Date().toISOString(),
      recorded_by: `@${
        this.context.message?.from?.username || this.context.userId
      }`,
    };
  }
  canHandleCommand(
    message: TelegramMessage,
  ): Promise<boolean> | boolean {
    return message.text === `/${this.commandName}`;
  }
  canHandleCallback(
    _callbackQuery: TelegramCallbackQuery,
  ): Promise<boolean> | boolean {
    return false;
  }
  abstract execute(): Promise<CommandResult>;
  abstract getHelpText(): string;
  getDescription(): string {
    return 'Nessuna descrizione fornita per questo comando.';
  }
}

export interface CommandStatic {
  new (context: CommandContext): Command;
  commandName: string;
  description: string;
}

export interface Command {
  canHandleCommand(
    message: TelegramMessage,
  ): Promise<boolean> | boolean;
  canHandleCallback(
    _callbackQuery: TelegramCallbackQuery,
  ): Promise<boolean> | boolean;
  execute(): Promise<CommandResult>;
  getHelpText(): string;
  getDescription(): string;
  getCommandName(): string;
}
