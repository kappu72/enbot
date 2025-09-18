// Refactored EnBot class using modular architecture
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { BotConfig, TelegramUpdate } from './types.ts';
import { TelegramClient } from './telegram-client.ts';
import { TransactionFlow } from './transaction-flow.ts';
import { MessageHandler } from './message-handler.ts';
import { AuthManager } from './auth-manager.ts';

export class EnBot {
  private telegram: TelegramClient;
  private transactionFlow: TransactionFlow;
  private messageHandler: MessageHandler;
  private authManager: AuthManager;
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

    // Initialize components
    this.telegram = new TelegramClient(this.config);
    this.authManager = new AuthManager(this.config);
    this.transactionFlow = new TransactionFlow(supabase, this.telegram);
    this.messageHandler = new MessageHandler(
      supabase,
      this.telegram,
      this.config,
    );
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
    if (!msg || !msg.text) return;

    // Check authorization
    if (!this.authManager.isAllowedChat(msg.chat.id, msg.from?.id)) {
      await this.telegram.sendMessage(
        msg.chat.id,
        '❌ Questo bot può essere utilizzato solo nel gruppo autorizzato o da utenti admin.',
      );
      return;
    }

    // Handle commands
    if (msg.text.startsWith('/start')) {
      await this.transactionFlow.startTransaction(msg);
    } else if (msg.text.startsWith('/help')) {
      await this.messageHandler.showHelp(msg);
    } else if (msg.text.startsWith('/cancel')) {
      await this.handleCancel(msg);
    } else if (msg.text.startsWith('/history')) {
      await this.messageHandler.showTransactionHistory(msg);
    } else if (msg.text.startsWith('/getid')) {
      await this.messageHandler.showChatId(msg);
    } else if (msg.text.startsWith('/testmsg')) {
      await this.handleTestMessage(msg);
    } else {
      // Handle regular text messages (transaction input)
      await this.transactionFlow.handleTextInput(msg);
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

    await this.transactionFlow.handleCallbackQuery(callbackQuery);
  }

  private async handleCancel(msg: TelegramUpdate['message']): Promise<void> {
    if (!msg?.from?.id) return;

    const wasActive = await this.transactionFlow.cancelTransaction(msg.from.id);

    if (wasActive) {
      await this.telegram.sendMessage(msg.chat.id, '❌ Transazione annullata.');
    } else {
      await this.telegram.sendMessage(
        msg.chat.id,
        'ℹ️ Nessuna transazione in corso da annullare.',
      );
    }
  }

  private async handleTestMessage(
    msg: TelegramUpdate['message'],
  ): Promise<void> {
    if (!msg?.text) return;

    const match = msg.text.match(/\/testmsg (.+)/);
    if (match) {
      await this.messageHandler.sendTestMessage(msg, match[1]);
    }
  }

  // Webhook management (delegated to TelegramClient)
  async setupWebhook(webhookUrl: string): Promise<void> {
    return await this.telegram.setupWebhook(webhookUrl);
  }

  async deleteWebhook(): Promise<void> {
    return await this.telegram.deleteWebhook();
  }

  // Utility methods
  getConfig(): BotConfig {
    return { ...this.config };
  }

  getAuthInfo() {
    return this.authManager.getAuthInfo();
  }
}
