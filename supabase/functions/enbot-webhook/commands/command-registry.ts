// Command registry and router - Fixed version
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import { TelegramClient } from '../telegram-client.ts';
import { SessionManager } from '../session-manager.ts';
import type {
  Command,
  CommandContext,
  CommandResult,
} from './command-interface.ts';

export class CommandRegistry {
  private commandClasses: Map<string, any> = new Map();
  private supabase: SupabaseClient;
  private telegram: TelegramClient;
  private sessionManager: SessionManager;

  constructor(supabase: SupabaseClient, telegram: TelegramClient) {
    this.supabase = supabase;
    this.telegram = telegram;
    this.sessionManager = new SessionManager(supabase);
  }

  /**
   * Register a command class
   */
  registerCommand(commandClass: any): void {
    const tempInstance = new commandClass(this.createContext(0, 0));
    this.commandClasses.set(tempInstance.getCommandName(), commandClass);
    console.log(`📝 Registered command: ${tempInstance.getCommandName()}`);
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
    for (const [name, CommandClass] of this.commandClasses.entries()) {
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
    const context = this.createContext(userId, chatId, message);

    // First, try to find a command that can handle this message
    for (const [commandName, CommandClass] of this.commandClasses.entries()) {
      const command = new CommandClass(context);
      if (command.canHandle(message)) {
        console.log(
          `🎯 Routing message to command: ${command.getCommandName()}`,
        );
        return await command.execute();
      }
    }

    // If no command directly handles it, check if any command has an active session for this user
    const allSessions = await this.sessionManager.loadAllUserSessions(userId);
    if (allSessions.length > 0) {
      // Try the most recently updated session first
      const recentSession = allSessions.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0];

      const command = this.createCommandInstance(
        recentSession.command_type,
        context,
      );
      if (command) {
        console.log(
          `🔄 Continuing session with command: ${command.getCommandName()}`,
        );
        return await command.execute();
      }
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

    // First, try to find a command that can handle this callback
    for (const [commandName, CommandClass] of this.commandClasses.entries()) {
      const command = new CommandClass(context);
      if (command.canHandle(callbackQuery)) {
        console.log(
          `🎯 Routing callback to command: ${command.getCommandName()}`,
        );
        return await command.execute();
      }
    }

    // If no command directly handles it, check if any command has an active session for this user
    const allSessions = await this.sessionManager.loadAllUserSessions(userId);
    if (allSessions.length > 0) {
      // For callbacks, try to match the callback data to the right command type
      let targetSession = allSessions[0]; // Default to most recent

      if (callbackQuery.data) {
        // Try to determine command type from callback data
        if (callbackQuery.data.startsWith('quota_')) {
          targetSession = allSessions.find((s) => s.command_type === 'quota') ||
            targetSession;
        } else if (callbackQuery.data.startsWith('quote_')) {
          targetSession = allSessions.find((s) => s.command_type === 'quote') ||
            targetSession;
        } else if (
          callbackQuery.data.startsWith('family_') ||
          callbackQuery.data.startsWith('category_')
        ) {
          targetSession = allSessions.find((s) =>
            s.command_type === 'transaction'
          ) || targetSession;
        }
      }

      const command = this.createCommandInstance(
        targetSession.command_type,
        context,
      );
      if (command) {
        console.log(
          `🔄 Continuing session with command: ${command.getCommandName()}`,
        );
        return await command.execute();
      }
    }

    console.log(
      `❌ No command found to handle callback: ${callbackQuery.data}`,
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
