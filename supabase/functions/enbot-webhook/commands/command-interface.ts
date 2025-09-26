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

/**
 * Context object containing all the dependencies and current state for command execution
 * This context is passed to commands and contains everything needed to interact with
 * external services and manage user sessions.
 */
export interface CommandContext {
  /** Supabase client for database operations */
  supabase: SupabaseClient;
  /** Telegram client for sending messages and handling bot operations */
  telegram: TelegramClient;
  /** Session manager for persisting user interaction state */
  sessionManager: SessionManager;
  /** Google Sheets client for syncing transactions (optional) */
  googleSheetsClient?: GoogleSheetsClient;
  /** Telegram user ID of the current user */
  userId: number;
  /** Telegram chat ID where the interaction is happening */
  chatId: number;
  /** Username of the current user (extracted from message or callback query) */
  username?: string;
  /** Current message being processed (for text commands) */
  message?: TelegramMessage;
  /** Current callback query being processed (for inline buttons) */
  callbackQuery?: TelegramCallbackQuery;
}

/**
 * Result object returned by command execution
 * Indicates whether the command succeeded and provides feedback information
 */
export interface CommandResult {
  /** Whether the command execution was successful */
  success: boolean;
  /** Optional success or status message */
  message?: string;
  /** Optional error message if command failed */
  error?: string;
  /** Whether the command flow should continue (for multi-step commands) */
  shouldContinue?: boolean;
  /** Next step identifier for multi-step commands */
  nextStep?: string;
}

/**
 * Command-specific session data extending the base UserSession
 * Used to maintain state across multiple user interactions in a command flow
 */
export interface CommandSession extends UserSession {
  /** Type/name of the command this session belongs to */
  commandType: string;
  /** Command-specific data collected during the interaction flow */
  commandData: Record<string, unknown>;
}

/**
 * Abstract base class for all Telegram bot commands
 *
 * This class provides a foundation for implementing bot commands with session management,
 * message handling, and integration with external services. Commands are designed to handle
 * both simple one-shot interactions and complex multi-step workflows.
 *
 * ## Architecture Overview
 *
 * Commands follow a modular step-based architecture:
 * - **Steps**: Handle user input validation and presentation (e.g., AmountStep, PeriodStep)
 * - **Commands**: Orchestrate the flow between steps and handle completion logic
 * - **Sessions**: Maintain state across multiple user interactions
 * - **Context**: Provides access to all external dependencies and services
 *
 * ## Implementation Guide
 *
 * To create a new command:
 *
 * 1. **Extend BaseCommand**:
 *    ```typescript
 *    export class MyCommand extends BaseCommand {
 *      static commandName = 'mycommand';
 *      static description = '🎯 My command description';
 *    }
 *    ```
 *
 * 2. **Implement Required Methods**:
 *    - `execute()`: Main command logic
 *    - `getHelpText()`: Help text for users
 *    - `canHandleCommand()`: Command matching logic (optional override)
 *
 * 3. **Use Step System**: For multi-step workflows, use the composable step system:
 *    ```typescript
 *    const result = myStep.processInput(text, stepContext);
 *    if (result.success) {
 *      // Continue to next step or completion
 *    } else {
 *      // Handle validation error
 *      const errorContent = myStep.presentError(stepContext, result.error);
 *      await this.sendMessage(errorContent.text, errorContent.options);
 *    }
 *    ```
 *
 * 4. **Session Management**: Use sessions to maintain state:
 *    ```typescript
 *    const session = await this.loadCommandSession();
 *    session.transactionData.someField = validatedValue;
 *    await this.saveSession(session);
 *    ```
 *
 * ## Key Patterns
 *
 * - **Separation of Concerns**: Steps handle validation, commands handle orchestration
 * - **Error Handling**: Steps provide error presenters for consistent UX
 * - **Message Management**: Commands track message IDs for editing capabilities
 * - **State Persistence**: Sessions automatically save/restore user progress
 * - **External Integration**: Built-in support for database and Google Sheets sync
 *
 * @example
 * ```typescript
 * export class MyCommand extends BaseCommand {
 *   static commandName = 'mycommand';
 *   static description = '🎯 My command description';
 *
 *   override async execute(): Promise<CommandResult> {
 *     // Check for existing session
 *     const existingSession = await this.loadCommandSession();
 *     if (existingSession) {
 *       return await this.recoverSession(existingSession);
 *     }
 *
 *     // Start new workflow
 *     return await this.startWorkflow();
 *   }
 *
 *   override getHelpText(): string {
 *     return 'This command helps you do amazing things!';
 *   }
 * }
 * ```
 */
export abstract class BaseCommand implements Command {
  /** Command execution context containing all dependencies and current state */
  protected context: CommandContext;
  /** Name of this command (e.g., 'transaction', 'quota') */
  protected commandName: string;

  /**
   * Creates a new command instance
   * @param context - Execution context with dependencies and current state
   * @param commandName - Unique identifier for this command
   */
  constructor(context: CommandContext, commandName: string) {
    this.context = context;
    this.commandName = commandName;
  }

  /**
   * Get the command name (e.g., 'transaction', 'quota')
   * @returns The unique identifier for this command
   */
  getCommandName(): string {
    return this.commandName;
  }

  /**
   * Get the session key for this command
   * @returns A unique key combining command name, user ID, and chat ID
   * @protected
   */
  protected getSessionKey(): string {
    return `${this.commandName}_${this.context.userId}_${this.context.chatId}`;
  }

  /**
   * Save command session to database
   *
   * This method persists the current command state to the database, allowing
   * the command to resume from where it left off if the user returns later.
   *
   * @param session - The session data to save
   * @protected
   */
  protected async saveSession(session: CommandSession): Promise<void> {
    await this.context.sessionManager.saveSession({
      ...session,
      userId: this.context.userId,
      chatId: this.context.chatId,
    }, this.commandName);
  }

  /**
   * Load command-specific session from database
   *
   * Retrieves any existing session for this command and user. Returns null
   * if no active session exists. This is typically used at the start of
   * command execution to check if there's an ongoing workflow.
   *
   * @returns The active session for this command, or null if none exists
   * @protected
   */
  protected async loadCommandSession(): Promise<CommandSession | null> {
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
   *
   * Sends a message to the current chat and automatically tracks the message ID
   * in the command session. This enables the command to later edit this message
   * if needed (e.g., for error corrections or updates).
   *
   * @param text - The message text to send
   * @param options - Additional Telegram API options (keyboards, parse_mode, etc.)
   * @param isLastMessage - Whether this is the final message to preserve during cleanup
   * @returns Promise that resolves when message is sent and ID is saved
   * @protected
   */
  protected async sendMessage(
    text: string,
    options?: Record<string, unknown>,
    isLastMessage: boolean = false,
  ): Promise<void> {
    const result = await this.context.telegram.sendMessage(
      this.context.chatId,
      text,
      options,
    );
    console.log('🔍 Message sent:', result);

    try {
      // Track message in message tracking system
      await this.trackOutgoingMessage(result.message_id, isLastMessage);
    } catch (error) {
      console.warn('❌ Error tracking message:', error);
    }
    return result;
  }

  /**
   * Edit the last message sent by this command
   *
   * Updates the most recent message sent by this command. This is useful for
   * correcting validation errors or updating status messages without sending
   * new messages. Falls back to sending a new message if editing fails.
   *
   * Note: Some message types (e.g., messages with force_reply) cannot be edited.
   *
   * @param text - The new message text
   * @param options - Additional Telegram API options
   * @protected
   */
  protected async editLastMessage(
    text: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Get the last outgoing message ID for this session
      const lastOutgoingMessageId = await this.context.sessionManager
        .getLastOutgoingMessageId(
          this.context.userId,
          this.context.chatId,
          this.commandName,
        );

      if (!lastOutgoingMessageId) {
        console.warn('❌ No outgoing message ID found in session for editing');
        return;
      }

      const result = await this.context.telegram.editMessage(
        this.context.chatId,
        lastOutgoingMessageId,
        text,
        options,
      );
      console.log('🔍 Message edited:', result);
    } catch (error) {
      console.warn('❌ Error editing last message:', error);
      // Fallback: send new message if edit fails
      await this.sendMessage(text, options);
    }
  }

  /**
   * Edit a specific message by ID
   */
  protected async editMessage(
    messageId: number,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const result = await this.context.telegram.editMessage(
        this.context.chatId,
        messageId,
        text,
        options,
      );
      console.log('🔍 Message edited:', result);
    } catch (error) {
      console.warn(`❌ Error editing message ${messageId}:`, error);
      throw error;
    }
  }
  /**
   * Delete the last message sent by this command (based on session.messageId)
   * Falls back silently if no messageId is found.
   */
  protected async deleteLastMessage(): Promise<void> {
    try {
      // Get the last outgoing message ID for this session
      const lastOutgoingMessageId = await this.context.sessionManager
        .getLastOutgoingMessageId(
          this.context.userId,
          this.context.chatId,
          this.commandName,
        );

      if (!lastOutgoingMessageId) {
        console.warn('❌ No outgoing message ID found in session for deletion');
        return;
      }

      await this.context.telegram.deleteMessage(
        this.context.chatId,
        lastOutgoingMessageId,
      );
      console.log('🗑️ Message deleted:', lastOutgoingMessageId);
    } catch (error) {
      console.warn('❌ Error deleting last message:', error);
      // Do not throw, deletion is best-effort
    }
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
   *
   * This method provides built-in integration with Google Sheets for transaction
   * data. It fetches the transaction from the database, converts it to the appropriate
   * format, pushes it to Google Sheets, and marks it as synced.
   *
   * @param transactionId - Database ID of the transaction to sync
   * @returns Promise resolving to sync result with success status and optional error
   * @protected
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
  /**
   * Convert command session data to transaction payload format
   *
   * This helper method transforms the collected session data into a standardized
   * format suitable for database storage and Google Sheets sync. Override this
   * method in subclasses if you need custom payload formatting.
   *
   * @param session - The command session containing collected data
   * @returns Formatted transaction payload ready for database storage
   * @protected
   */
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
      recorded_by: `@${this.context.username || this.context.userId}`,
    };
  }

  /**
   * Determine if this command can handle the given message
   *
   * Default implementation matches messages that start with /{commandName}.
   * Supports both direct commands (/quota) and group commands with bot mention (/quota@botname).
   * Override this method for custom command matching logic.
   *
   * @param message - The incoming Telegram message
   * @returns true if this command should handle the message
   */
  canHandleCommand(
    message: TelegramMessage,
  ): Promise<boolean> | boolean {
    if (!message.text) return false;

    const commandPrefix = `/${this.commandName}`;

    // Match exact command: /quota
    if (message.text === commandPrefix) {
      return true;
    }

    // Match command with bot mention: /quota@botname
    if (message.text.startsWith(commandPrefix + '@')) {
      return true;
    }

    return false;
  }

  /**
   * Execute the main command logic
   *
   * This is the entry point for command execution. Implement your command's
   * main workflow here, including session management, step orchestration,
   * and completion handling.
   *
   * @returns Promise resolving to the command execution result
   */
  abstract execute(): Promise<CommandResult>;

  /**
   * Get help text for this command
   *
   * Provide user-friendly help text that explains what this command does
   * and how to use it. This is shown in help menus and error situations.
   *
   * @returns Help text string for users
   */
  abstract getHelpText(): string;

  /**
   * Get the description for this command
   *
   * Returns a brief description used in command menus. Override in subclasses
   * to provide meaningful descriptions. Should include an emoji and be concise.
   *
   * @returns Command description string
   */
  getDescription(): string {
    return 'Nessuna descrizione fornita per questo comando.';
  }

  // ===== MESSAGE TRACKING AND CLEANUP METHODS =====

  /**
   * Track an outgoing message (from bot)
   * @param messageId - The Telegram message ID
   * @param isLastMessage - Whether this is the final message to preserve
   */
  protected async trackOutgoingMessage(
    messageId: number,
    isLastMessage: boolean = false,
  ): Promise<void> {
    try {
      const sessionId = await this.context.sessionManager.getSessionId(
        this.context.userId,
        this.context.chatId,
        this.commandName,
      );

      if (sessionId) {
        await this.context.sessionManager.trackMessage(
          sessionId,
          messageId,
          'outgoing',
          isLastMessage,
        );
      } else {
        console.warn('❌ No session ID found for message tracking');
      }
    } catch (error) {
      console.warn('❌ Error tracking outgoing message:', error);
    }
  }

  /**
   * Track an incoming message (from user)
   * @param messageId - The Telegram message ID
   */
  async trackIncomingMessage(messageId: number): Promise<void> {
    try {
      const sessionId = await this.context.sessionManager.getSessionId(
        this.context.userId,
        this.context.chatId,
        this.commandName,
      );

      if (sessionId) {
        await this.context.sessionManager.trackMessage(
          sessionId,
          messageId,
          'incoming',
          false,
        );
      } else {
        console.warn('❌ No session ID found for message tracking');
      }
    } catch (error) {
      console.warn('❌ Error tracking incoming message:', error);
    }
  }

  /**
   * Mark a message as the last message to preserve during cleanup
   * @param messageId - The message ID to mark as last
   */
  protected async markLastMessage(messageId: number): Promise<void> {
    try {
      const sessionId = await this.context.sessionManager.getSessionId(
        this.context.userId,
        this.context.chatId,
        this.commandName,
      );

      if (sessionId) {
        await this.context.sessionManager.markLastMessage(sessionId, messageId);
      } else {
        console.warn('❌ No session ID found for marking last message');
      }
    } catch (error) {
      console.warn('❌ Error marking last message:', error);
    }
  }

  /**
   * Clean up session messages (delete all except the last one)
   * @param preserveLast - Whether to preserve the last message (default: true)
   * @returns Object with cleanup results
   */
  protected async cleanupSessionMessages(
    preserveLast: boolean = true,
  ): Promise<
    {
      deleted: number;
      preserved: number;
      telegramDeleted: number;
      telegramFailed: number;
    }
  > {
    try {
      const sessionId = await this.context.sessionManager.getSessionId(
        this.context.userId,
        this.context.chatId,
        this.commandName,
      );

      if (!sessionId) {
        console.warn('❌ No session ID found for message cleanup');
        return {
          deleted: 0,
          preserved: 0,
          telegramDeleted: 0,
          telegramFailed: 0,
        };
      }

      // Get all messages for the session
      const messages = await this.context.sessionManager.getSessionMessages(
        sessionId,
      );

      if (messages.length === 0) {
        console.log('📭 No messages to clean up');
        return {
          deleted: 0,
          preserved: 0,
          telegramDeleted: 0,
          telegramFailed: 0,
        };
      }

      // Determine which messages to delete
      const messagesToDelete = preserveLast
        ? messages.filter((msg) => !msg.is_last_message)
        : messages;

      // Delete messages from Telegram
      let telegramDeleted = 0;
      let telegramFailed = 0;

      if (messagesToDelete.length > 0) {
        const messageIds = messagesToDelete.map((msg) => msg.message_id);
        const result = await this.context.telegram.deleteMessages(
          this.context.chatId,
          messageIds,
        );
        telegramDeleted = result.deleted;
        telegramFailed = result.failed;
      }

      // Clean up from database
      const dbResult = await this.context.sessionManager.cleanupSessionMessages(
        sessionId,
        preserveLast,
      );

      console.log(
        `🧹 Message cleanup completed: ${dbResult.deleted} DB deleted, ${dbResult.preserved} preserved, ${telegramDeleted} Telegram deleted, ${telegramFailed} Telegram failed`,
      );

      return {
        deleted: dbResult.deleted,
        preserved: dbResult.preserved,
        telegramDeleted,
        telegramFailed,
      };
    } catch (error) {
      console.error('❌ Error cleaning up session messages:', error);
      return {
        deleted: 0,
        preserved: 0,
        telegramDeleted: 0,
        telegramFailed: 0,
      };
    }
  }

  /**
   * Enhanced delete session with message cleanup
   * @param cleanupMessages - Whether to clean up messages (default: true)
   * @param preserveLastMessage - Whether to preserve the last message (default: false)
   */
  protected async deleteSessionWithCleanup(
    cleanupMessages: boolean = true,
    preserveLastMessage: boolean = false,
  ): Promise<void> {
    try {
      // Clean up messages if requested
      if (cleanupMessages) {
        await this.cleanupSessionMessages(preserveLastMessage);
      }

      // Delete the session
      await this.deleteSession();
    } catch (error) {
      console.error('❌ Error deleting session with cleanup:', error);
      throw error;
    }
  }

  /**
   * Enhanced delete user session with message cleanup
   * @param cleanupMessages - Whether to clean up messages (default: true)
   * @param preserveLastMessage - Whether to preserve the last message (default: false)
   */
  protected async deleteUserSessionWithCleanup(
    cleanupMessages: boolean = true,
    preserveLastMessage: boolean = false,
  ): Promise<void> {
    try {
      // Clean up messages if requested
      if (cleanupMessages) {
        // Get all sessions for this user and clean up their messages
        const sessionId = await this.context.sessionManager.getSessionId(
          this.context.userId,
          this.context.chatId,
          this.commandName,
        );

        if (sessionId) {
          await this.cleanupSessionMessages(preserveLastMessage);
        }
      }

      // Delete the user session
      await this.deleteUserSession();
    } catch (error) {
      console.error('❌ Error deleting user session with cleanup:', error);
      throw error;
    }
  }
}

/**
 * Static interface for command class constructors
 *
 * This interface defines the static properties that command classes must have.
 * It's used by the command registry to instantiate commands dynamically.
 */
export interface CommandStatic {
  /** Constructor that creates a command instance */
  new (context: CommandContext): Command;
  /** Static command name identifier */
  commandName: string;
  /** Static command description for menus */
  description: string;
}

/**
 * Runtime interface for command instances
 *
 * This interface defines the methods that all command instances must implement.
 * It's the contract that the command registry uses to interact with commands.
 */
export interface Command {
  /** Check if this command can handle the given message */
  canHandleCommand(
    message: TelegramMessage,
  ): Promise<boolean> | boolean;
  /** Execute the command's main logic */
  execute(): Promise<CommandResult>;
  /** Get user-friendly help text */
  getHelpText(): string;
  /** Get command description for menus */
  getDescription(): string;
  /** Get the command name identifier */
  getCommandName(): string;
  /** Track an incoming message (from user) */
  trackIncomingMessage(messageId: number): Promise<void>;
}
