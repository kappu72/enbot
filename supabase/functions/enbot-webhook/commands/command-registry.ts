// Command registry and router - Fixed version
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import { TelegramClient } from '../telegram-client.ts';
import { SessionManager } from '../session-manager.ts';
import type { GoogleSheetsClient } from '../google-sheets-client.ts';
import type {
  Command,
  CommandContext,
  CommandResult,
  CommandStatic,
} from './command-interface.ts';

export class CommandRegistry {
  private commandClasses: Map<
    string,
    CommandStatic
  > = new Map();
  private supabase: SupabaseClient;
  private telegram: TelegramClient;
  private sessionManager: SessionManager;
  private googleSheetsClient?: GoogleSheetsClient;

  constructor(
    supabase: SupabaseClient,
    telegram: TelegramClient,
    googleSheetsClient?: GoogleSheetsClient,
  ) {
    this.supabase = supabase;
    this.telegram = telegram;
    this.sessionManager = new SessionManager(supabase);
    this.googleSheetsClient = googleSheetsClient;
  }

  /**
   * Register a command class
   */
  registerCommand(
    commandClass: CommandStatic,
  ): void {
    this.commandClasses.set(commandClass.commandName, commandClass);
    console.log(`📝 Registered command: ${commandClass.commandName}`);
  }

  /**
   * Create a command instance with context
   */
  private createCommandInstance(
    commandName: string,
    context: CommandContext,
  ): Command | undefined {
    const CommandClass = this.commandClasses.get(commandName);
    if (!CommandClass) return undefined;
    return new CommandClass(context);
  }

  /**
   * Get all registered commands (creates temp instances for metadata)
   */
  getAllCommands(): Command[] {
    const commands: Command[] = [];
    for (const [_name, CommandClass] of this.commandClasses.entries()) {
      const tempContext = this.createContext(0, 0);
      commands.push(new CommandClass(tempContext));
    }
    return commands;
  }

  /**
   * Create command context
   */
  private createContext(
    userId: number,
    chatId: number,
    message?: TelegramMessage,
    callbackQuery?: TelegramCallbackQuery,
  ): CommandContext {
    return {
      supabase: this.supabase,
      telegram: this.telegram,
      sessionManager: this.sessionManager,
      googleSheetsClient: this.googleSheetsClient,
      userId,
      chatId,
      message,
      callbackQuery,
    };
  }

  /**
   * Route a message to the appropriate command
   */
  async routeMessage(
    message: TelegramMessage,
    userId: number,
    chatId: number,
  ): Promise<CommandResult | null> {
    // get user session, should be one per user
    const context = this.createContext(userId, chatId, message);

    // first of all check if the message is a command
    // its delegated to the command instance to clean or not the current user session
    // some commands does not need to clean the session
    const isCommand = 'text' in message && message.text?.startsWith('/');
    if (isCommand) {
      for (const [_, CommandClass] of this.commandClasses.entries()) {
        const command = new CommandClass(context);
        const canHandle = await command.canHandleCommand(message);
        if (canHandle) {
          return await command.execute();
        }
      }
      console.log(`❌ No command found to handle message: ${message.text}`);
      return null;
    }

    // If no command directly handles it and we have a session for this user, execute the command
    const userSession = await this.sessionManager.loadUserSession(
      userId,
      chatId,
    );
    // The bot should only answer to the last sent message saved in the session row the other messages has to pass
    if (
      userSession &&
      message.reply_to_message?.message_id === userSession.message_id
    ) {
      const command = this.createCommandInstance(
        userSession.command_type,
        context,
      );
      if (command) return await command.execute();
    }

    console.log(`❌ No command found to handle message: ${message.text}`);
    return null;
  }

  /**
   * Route a callback query to the appropriate command
   */
  async routeCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
    userId: number,
    chatId: number,
  ): Promise<CommandResult | null> {
    const context = this.createContext(
      userId,
      chatId,
      undefined,
      callbackQuery,
    );

    // The callback should always be handled by a command
    const userSession = await this.sessionManager.loadUserSession(
      userId,
      chatId,
    );

    if (userSession) {
      const command = this.createCommandInstance(
        userSession.command_type,
        context,
      );
      if (command && command.canHandleCallback(callbackQuery)) {
        return await command.execute();
      }
    }

    console.log(
      `❌ No command found to handle callback: ${callbackQuery.data}`,
    );
    // we have in any case to respond to the callback query
    await this.telegram.answerCallbackQuery(
      callbackQuery.id,
      'Unknown callback data',
      chatId,
      callbackQuery.inline_message_id,
    );
    return null;
  }

  /**
   * Get help text for all commands
   */
  getHelpText(): string {
    const commands = this.getAllCommands();
    if (commands.length === 0) {
      return 'No commands available.';
    }

    let helpText = '🤖 **Available Commands:**\n\n';

    for (const command of commands) {
      helpText += `• ${command.getHelpText()}\n`;
    }

    return helpText;
  }

  /**
   * Get command descriptions for admin
   */
  getCommandDescriptions(): string {
    const commands = this.getAllCommands();
    if (commands.length === 0) {
      return 'No commands available.';
    }

    let descriptions = '📋 **Command Descriptions:**\n\n';

    for (const command of commands) {
      descriptions +=
        `**${command.getCommandName()}:** ${command.getDescription()}\n\n`;
    }

    return descriptions;
  }
}
