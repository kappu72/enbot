// Telegram API client wrapper
import type {
  BotCommand,
  BotConfig,
  MenuButton,
  TelegramBotCommandScope,
} from './types.ts';
import { validateMarkdownV2 } from './utils/markdown-utils.ts';

export class TelegramClient {
  private botToken: string;
  private isDevelopment: boolean;

  constructor(config: BotConfig) {
    this.botToken = config.botToken;
    this.isDevelopment = config.isDevelopment;
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Add development mode indicator
    let messageText = text;
    if (this.isDevelopment) {
      messageText = `🧪 [DEV MODE]\n\n${text}`;
    }

    // Validate MarkdownV2 formatting if parse_mode is MarkdownV2
    const parseMode = options?.parse_mode || 'MarkdownV2';
    if (parseMode === 'MarkdownV2') {
      // Only validate the original message, not the development mode prefix
      const textToValidate = this.isDevelopment ? text : messageText;
      const validation = validateMarkdownV2(textToValidate);
      if (!validation.isValid) {
        console.warn('MarkdownV2 validation failed:', validation.errors);
        // In development mode, throw error to catch formatting issues early
        if (this.isDevelopment) {
          throw new Error(
            `MarkdownV2 validation failed: ${validation.errors.join(', ')}`,
          );
        }
      }
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'MarkdownV2',
      ...options,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
    return (await response.json()).result;
  }

  /**
   * Set bot commands menu for groups/chats
   */
  async setBotCommands(
    commands: BotCommand[],
    scope?: TelegramBotCommandScope,
  ): Promise<void> {
    console.log('setBotCommands', commands, scope);
    const url = `https://api.telegram.org/bot${this.botToken}/setMyCommands`;
    const payload = {
      commands,
      scope,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error setting commands: ${error}`);
    }
  }

  /**
   * Remove bot commands menu for groups/chats
   */
  async deleteMyCommands(scope?: TelegramBotCommandScope): Promise<void> {
    console.log('deleteMyCommands', scope);
    const url = `https://api.telegram.org/bot${this.botToken}/deleteMyCommands`;
    const payload = scope ? { scope } : {};

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.log('deleteMyCommands error', response.text());
      const error = await response.text();
      console.log('deleteMyCommands error', error);
      throw new Error(`Telegram API error deleting commands: ${error}`);
    }
    console.log('deleteMyCommands response', await response.json());
  }

  /**
   * Get the list of bot commands for a specific scope
   */
  async getMyCommands(scope?: TelegramBotCommandScope): Promise<BotCommand[]> {
    console.log('getMyCommands', scope);
    const url = `https://api.telegram.org/bot${this.botToken}/getMyCommands`;
    const payload = scope ? { scope } : {};

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error getting commands: ${error}`);
    }

    const result = await response.json();
    return result.result || [];
  }

  /**
   * Set custom menu button for chats
   */
  async setChatMenuButton(
    chatId: number | string,
    menuButton: MenuButton,
  ): Promise<void> {
    const url =
      `https://api.telegram.org/bot${this.botToken}/setChatMenuButton`;
    const payload = {
      chat_id: chatId,
      menu_button: menuButton,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error setting menu button: ${error}`);
    }
  }

  /**
   * Edit an existing message
   */
  async editMessage(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    // Validate MarkdownV2 formatting if parse_mode is MarkdownV2
    const parseMode = options?.parse_mode || 'MarkdownV2';
    if (parseMode === 'MarkdownV2') {
      const validation = validateMarkdownV2(text);
      if (!validation.isValid) {
        console.warn(
          'MarkdownV2 validation failed for editMessage:',
          validation.errors,
        );
        // In development mode, throw error to catch formatting issues early
        if (this.isDevelopment) {
          throw new Error(
            `MarkdownV2 validation failed: ${validation.errors.join(', ')}`,
          );
        }
      }
    }

    const url = `https://api.telegram.org/bot${this.botToken}/editMessageText`;
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'MarkdownV2',
      ...options,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Telegram API error editing message: ${JSON.stringify(errorData)}`,
      );
    }
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    chatId?: number | string,
    messageId?: number | string,
  ): Promise<void> {
    if (chatId && messageId && text) {
      // Update message and remove keyboard using the dedicated method
      await this.editMessage(chatId, messageId as number, text);
    }

    const url =
      `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;
    const payload: { callback_query_id: string; text?: string } = {
      callback_query_id: callbackQueryId,
    };

    // Only include text if it's provided and not empty
    if (text && text.trim().length > 0) {
      payload.text = text;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
  }

  async deleteMessage(
    chatId: number | string,
    messageId: number,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/deleteMessage`;
    const payload = { chat_id: chatId, message_id: messageId };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
  }

  /**
   * Delete multiple messages in bulk
   * @param chatId - The chat ID where messages should be deleted
   * @param messageIds - Array of message IDs to delete
   * @returns Object with success/failure counts
   */
  async deleteMessages(
    chatId: number | string,
    messageIds: number[],
  ): Promise<{ deleted: number; failed: number; errors: string[] }> {
    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process messages in parallel with a reasonable concurrency limit
    const batchSize = 10;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      const promises = batch.map(async (messageId) => {
        try {
          await this.deleteMessage(chatId, messageId);
          deleted++;
          console.log(`🗑️ Message ${messageId} deleted successfully`);
        } catch (error) {
          failed++;
          const errorMsg = `Failed to delete message ${messageId}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
          console.warn(`❌ ${errorMsg}`);
        }
      });

      await Promise.all(promises);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < messageIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `🧹 Bulk delete completed: ${deleted} deleted, ${failed} failed`,
    );

    return { deleted, failed, errors };
  }

  async setupWebhook(webhookUrl: string): Promise<void> {
    try {
      console.log(`🔗 Setting up webhook: ${webhookUrl}`);
      const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
      const payload = { url: webhookUrl };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }

      console.log('✅ Webhook configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(): Promise<void> {
    try {
      console.log('🗑️ Deleting webhook...');
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }

      console.log('✅ Webhook deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete webhook:', error);
      throw error;
    }
  }
}
