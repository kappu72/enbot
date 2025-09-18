// Command interface and base classes
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { TelegramMessage, TelegramCallbackQuery, UserSession } from '../types.ts';
import { TelegramClient } from '../telegram-client.ts';
import { SessionManager } from '../session-manager.ts';

export interface CommandContext {
  supabase: SupabaseClient;
  telegram: TelegramClient;
  sessionManager: SessionManager;
  userId: number;
  chatId: number;
  message?: TelegramMessage;
  callbackQuery?: TelegramCallbackQuery;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  shouldContinue?: boolean;
  nextStep?: string;
}

export interface CommandSession extends UserSession {
  commandType: string;
  commandData: Record<string, any>;
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
    return `${this.commandName}_${this.context.userId}`;
  }

  /**
   * Save command session to database
   */
  protected async saveSession(session: CommandSession): Promise<void> {
    await this.context.sessionManager.saveSession({
      ...session,
      userId: this.context.userId,
      chatId: this.context.chatId,
    });
  }

  /**
   * Load command session from database
   */
  protected async loadSession(): Promise<CommandSession | null> {
    const session = await this.context.sessionManager.loadSession(this.context.userId);
    if (!session) return null;

    return {
      ...session,
      commandType: this.commandName,
      commandData: session.transactionData || {},
    };
  }

  /**
   * Delete command session
   */
  protected async deleteSession(): Promise<void> {
    await this.context.sessionManager.deleteSession(this.context.userId);
  }

  /**
   * Check if user has an active session for this command
   */
  protected async hasActiveSession(): Promise<boolean> {
    return await this.context.sessionManager.hasActiveSession(this.context.userId);
  }

  /**
   * Send message with command context
   */
  protected async sendMessage(text: string, options?: any): Promise<void> {
    await this.context.telegram.sendMessage(this.context.chatId, text, options);
  }

  /**
   * Answer callback query
   */
  protected async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.context.telegram.answerCallbackQuery(callbackQueryId, text);
  }

  /**
   * Abstract methods that must be implemented by each command
   */
  abstract canHandle(message: TelegramMessage | TelegramCallbackQuery): boolean;
  abstract execute(): Promise<CommandResult>;
  abstract getHelpText(): string;
  abstract getDescription(): string;
}

export interface Command {
  canHandle(message: TelegramMessage | TelegramCallbackQuery): boolean;
  execute(): Promise<CommandResult>;
  getHelpText(): string;
  getDescription(): string;
  getCommandName(): string;
}
