// Telegram API client wrapper
import type { BotConfig } from './types.ts';

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
  ): Promise<void> {
    // Add development mode indicator
    let messageText = text;
    if (this.isDevelopment) {
      messageText = `🧪 [DEV MODE]\n\n${text}`;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: messageText,
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
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text: string,
  ): Promise<void> {
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
