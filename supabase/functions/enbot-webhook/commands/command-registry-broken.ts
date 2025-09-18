// Command registry and router
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import { TelegramClient } from '../telegram-client.ts';
import { SessionManager } from '../session-manager.ts';
import type { Command, CommandContext } from './command-interface.ts';

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
  private createCommandInstance(commandName: string, context: CommandContext): Command | undefined {
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

    // If no command can handle it, check for active sessions
    const activeSession = await this.sessionManager.loadSession(userId);
    if (activeSession) {
      // Try to find the command that owns this session based on command type
      const commandType = activeSession.transactionData?.commandType ||
        'transaction';
      const sessionCommand = this.commands.get(commandType);
      if (sessionCommand) {
        console.log(
          `🔄 Continuing session with command: ${sessionCommand.getCommandName()}`,
        );

        // Update the command context for this request
        const context = this.createContext(userId, chatId, message);
        this.updateCommandContext(sessionCommand, context);

        return await sessionCommand.execute();
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
    const context = this.createContext(userId, chatId, undefined, callbackQuery);

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

    // If no command can handle it, check for active sessions
    const activeSession = await this.sessionManager.loadSession(userId);
    if (activeSession) {
      // Try to find the command that owns this session based on command type
      const commandType = activeSession.transactionData?.commandType ||
        'transaction';
      const sessionCommand = this.commands.get(commandType);
      if (sessionCommand) {
        console.log(
          `🔄 Continuing session with command: ${sessionCommand.getCommandName()}`,
        );

        // Update the command context for this request
        const context = this.createContext(userId, chatId, message);
        this.updateCommandContext(sessionCommand, context);

        return await sessionCommand.execute();
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
