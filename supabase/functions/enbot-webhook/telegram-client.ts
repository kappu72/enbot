// Telegram API client wrapper
import type {
  BotCommand,
  BotConfig,
  MenuButton,
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
    options?: any,
  ): Promise<any> {
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
          throw new Error(`MarkdownV2 validation failed: ${validation.errors.join(', ')}`);
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
    scope?: BotCommandScope,
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
        console.warn('MarkdownV2 validation failed for editMessage:', validation.errors);
        // In development mode, throw error to catch formatting issues early
        if (this.isDevelopment) {
          throw new Error(`MarkdownV2 validation failed: ${validation.errors.join(', ')}`);
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
    text: string,
    chatId?: number | string,
    messageId?: number | string,
  ): Promise<void> {
    if (chatId && messageId) {
      // Update message and remove keyboard using the dedicated method
      await this.editMessage(chatId, messageId as number, text);
    }

    const url =
      `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;
    const payload = {
      callback_query_id: callbackQueryId,
      text: text,
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
