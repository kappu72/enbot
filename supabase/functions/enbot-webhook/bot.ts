// Refactored EnBot class using command-based architecture
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type {
  BotCommand,
  BotConfig,
  TelegramBotCommandScope,
  TelegramUpdate,
} from './types.ts';
import { TelegramClient } from './telegram-client.ts';
import { AuthManager } from './auth-manager.ts';
import { CommandRegistry } from './commands/command-registry.ts';
import { IncomeCommand } from './commands/income-command.ts'; // Handles /entrata command
import { OutcomeCommand } from './commands/outcome-command.ts'; // Handles /uscita command
import { CreditNoteCommand } from './commands/creditnote-command.ts'; // Handles /notacredito command
import { StartCommand } from './commands/start-command.ts'; // Handles /start command
import { HelpCommand } from './commands/help-command.ts';
import {
  createGoogleSheetsClient,
  type GoogleSheetsEnvConfig,
} from './google-sheets-client.ts';

export class EnBot {
  private telegram: TelegramClient;
  private authManager: AuthManager;
  private commandRegistry: CommandRegistry;
  private config: BotConfig;

  constructor(
    botToken: string,
    allowedGroupId: number[] = [],
    adminUserIds: number[] = [],
    supabase: SupabaseClient,
    isDevelopment: boolean = false,
    googleSheetsConfig?: GoogleSheetsEnvConfig,
  ) {
    this.config = {
      botToken,
      allowedGroupId,
      adminUserIds,
      isDevelopment,
    };

    this.telegram = new TelegramClient(this.config);
    this.authManager = new AuthManager(this.config);

    // Initialize Google Sheets client (optional)
    const googleSheetsClient = createGoogleSheetsClient(googleSheetsConfig) ||
      undefined;

    // Debug logging
    if (googleSheetsClient) {
      console.log('✅ Google Sheets client initialized successfully');
    } else {
      console.warn(
        '⚠️ Google Sheets client not available - check configuration',
      );
    }

    // Initialize command registry
    this.commandRegistry = new CommandRegistry(
      supabase,
      this.telegram,
      googleSheetsClient,
    );
    this.initializeCommands();
  }

  private initializeCommands(): void {
    // Register command classes (not instances) this order matters
    this.commandRegistry.registerCommand(StartCommand);
    this.commandRegistry.registerCommand(IncomeCommand);
    this.commandRegistry.registerCommand(OutcomeCommand);
    this.commandRegistry.registerCommand(CreditNoteCommand);
    this.commandRegistry.registerCommand(HelpCommand);
    console.log('🎯 Command system initialized');
  }

  /**
   * Configure bot commands menu for Telegram
   */
  async setupBotCommands(
    scope?: TelegramBotCommandScope,
  ): Promise<void> {
    const commands: BotCommand[] = this.commandRegistry
      .getAllCommands()
      .map((command) => ({
        command: command.getCommandName(),
        description: command.getDescription(),
      }));

    try {
      await this.telegram.setBotCommands(commands, scope);
      console.log('✅ Bot commands menu configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure bot commands:', error);
      throw error;
    }
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Process callback queries (button presses)
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
        return;
      }

      // Process messages
      if (update.message) {
        await this.handleMessage(update.message);
      }
    } catch (error) {
      console.error('❌ Error processing update:', error);
    }
  }

  private async handleMessage(msg: TelegramUpdate['message']): Promise<void> {
    if (!msg?.from?.id) return;

    // Check authorization
    if (!this.authManager.isAllowedChat(msg.chat.id, msg.from.id)) {
      await this.telegram.sendMessage(
        msg.chat.id,
        '❌ Questo bot può essere utilizzato solo nel gruppo autorizzato o da utenti admin.',
      );
      return;
    }
    console.log('handleMessage', msg);

    // Try to route to command system first
    const commandResult = await this.commandRegistry.routeMessage(
      msg,
      msg.from.id,
      msg.chat.id,
    );

    if (commandResult) {
      console.log(`✅ Command executed: ${commandResult.message}`);
      return;
    }
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramUpdate['callback_query'],
  ): Promise<void> {
    if (!callbackQuery?.message?.chat.id) return;

    // Check authorization
    if (
      !this.authManager.isAllowedChat(
        callbackQuery.message.chat.id,
        callbackQuery.from.id,
      )
    ) {
      return;
    }

    // Try to route to command system first
    const commandResult = await this.commandRegistry.routeCallbackQuery(
      callbackQuery,
      callbackQuery.from.id,
      callbackQuery.message.chat.id,
    );

    if (commandResult) {
      console.log(`✅ Callback command executed: ${commandResult.message}`);
      return;
    }
  }

  async setupWebhook(webhookUrl: string): Promise<void> {
    await this.telegram.setupWebhook(webhookUrl);
  }

  async deleteWebhook(): Promise<void> {
    await this.telegram.deleteWebhook();
  }
}
