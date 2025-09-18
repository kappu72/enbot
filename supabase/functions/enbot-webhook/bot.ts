// Refactored EnBot class using command-based architecture
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { BotConfig, TelegramUpdate } from './types.ts';
import { TelegramClient } from './telegram-client.ts';
import { MessageHandler } from './message-handler.ts';
import { AuthManager } from './auth-manager.ts';
import { CommandRegistry } from './commands/command-registry.ts';
import { TransactionCommand } from './commands/transaction-command.ts';
import { QuoteCommand } from './commands/quote-command.ts';
import { HelpCommand } from './commands/help-command.ts';

export class EnBot {
  private telegram: TelegramClient;
  private authManager: AuthManager;
  private messageHandler: MessageHandler;
  private commandRegistry: CommandRegistry;
  private config: BotConfig;

  constructor(
    botToken: string,
    allowedGroupId: string,
    adminUserIds: number[] = [],
    supabase: SupabaseClient,
    isDevelopment: boolean = false,
  ) {
    this.config = {
      botToken,
      allowedGroupId,
      adminUserIds,
      isDevelopment,
    };

    this.telegram = new TelegramClient(this.config);
    this.authManager = new AuthManager(this.config);
    this.messageHandler = new MessageHandler(
      supabase,
      this.telegram,
      this.config,
    );

    // Initialize command registry
    this.commandRegistry = new CommandRegistry(supabase, this.telegram);
    this.initializeCommands(supabase);
  }

  private initializeCommands(supabase: SupabaseClient): void {
    // Register command classes (not instances)
    this.commandRegistry.registerCommand(TransactionCommand);
    this.commandRegistry.registerCommand(QuoteCommand);
    this.commandRegistry.registerCommand(HelpCommand);

    console.log('🎯 Command system initialized');
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Process messages
      if (update.message) {
        await this.handleMessage(update.message);
      }

      // Process callback queries
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
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

    // Fallback to legacy message handler for non-command messages
    await this.handleLegacyMessage(msg);
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

    // Fallback to legacy callback handling
    await this.handleLegacyCallbackQuery(callbackQuery);
  }

  private async handleLegacyMessage(
    msg: TelegramUpdate['message'],
  ): Promise<void> {
    if (!msg?.text) return;

    // Handle legacy commands that aren't in the command system yet
    if (msg.text.startsWith('/cancel')) {
      await this.handleCancel(msg);
    } else if (msg.text.startsWith('/history')) {
      await this.messageHandler.showTransactionHistory(msg);
    } else if (msg.text.startsWith('/getid')) {
      await this.messageHandler.showChatId(msg);
    } else if (msg.text.startsWith('/testmsg')) {
      await this.handleTestMessage(msg);
    } else if (msg.text.startsWith('/cleansession')) {
      await this.messageHandler.cleanSessions(msg);
    } else if (msg.text.startsWith('/cleanallsessions')) {
      await this.messageHandler.cleanAllSessions(msg);
    } else if (msg.text.startsWith('/sessionstats')) {
      await this.messageHandler.showSessionStats(msg);
    } else {
      // Handle regular text messages (could be transaction input)
      console.log(`📝 Unhandled text message: ${msg.text}`);
    }
  }

  private async handleLegacyCallbackQuery(
    callbackQuery: TelegramUpdate['callback_query'],
  ): Promise<void> {
    // Handle any legacy callback queries that aren't in the command system
    console.log(`🔘 Unhandled callback query: ${callbackQuery.data}`);
  }

  private async handleCancel(msg: TelegramUpdate['message']): Promise<void> {
    if (!msg?.from?.id) return;

    // For now, we'll need to implement session cancellation in the command system
    // This is a temporary fallback
    await this.telegram.sendMessage(
      msg.chat.id,
      'ℹ️ Usa /start per iniziare una nuova transazione.',
    );
  }

  private async handleTestMessage(
    msg: TelegramUpdate['message'],
  ): Promise<void> {
    if (!msg?.text) return;

    const parts = msg.text.split(' ');
    if (parts.length < 2) {
      await this.telegram.sendMessage(
        msg.chat.id,
        '❌ Usa: /testmsg @username',
      );
      return;
    }

    const target = parts[1];
    await this.messageHandler.sendTestMessage(msg, target);
  }

  async setupWebhook(webhookUrl: string): Promise<void> {
    await this.telegram.setupWebhook(webhookUrl);
  }

  async deleteWebhook(): Promise<void> {
    await this.telegram.deleteWebhook();
  }
}
