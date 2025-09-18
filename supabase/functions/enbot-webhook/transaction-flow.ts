// Transaction flow management
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  Transaction,
  UserSession,
} from './types.ts';
import { CATEGORY_OPTIONS, FAMILY_OPTIONS } from './types.ts';
import { TelegramClient } from './telegram-client.ts';

export class TransactionFlow {
  private userSessions: Map<number, UserSession> = new Map();
  private supabase: SupabaseClient;
  private telegram: TelegramClient;

  constructor(supabase: SupabaseClient, telegram: TelegramClient) {
    this.supabase = supabase;
    this.telegram = telegram;
  }

  async startTransaction(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    console.log(`🚀 Starting transaction for user ${userId} in chat ${chatId}`);

    if (!userId) {
      console.log('❌ No userId found, cannot start transaction');
      return;
    }

    // Initialize user session
    this.userSessions.set(userId, {
      chatId,
      userId,
      step: 'family',
      transactionData: {},
    });

    console.log(`✅ Session created for user ${userId}, step: family`);
    await this.sendFamilySelection(chatId);
  }

  async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;

    if (!chatId || !data) return;

    const session = this.userSessions.get(userId);
    if (!session) return;

    if (data.startsWith('family_')) {
      await this.handleFamilySelection(callbackQuery, session);
    } else if (data.startsWith('category_')) {
      await this.handleCategorySelection(callbackQuery, session);
    }
  }

  async handleTextInput(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    const session = this.userSessions.get(userId);
    if (!session) return;

    console.log(
      `🔄 Processing message for user ${userId}, current step: ${session.step}`,
    );

    switch (session.step) {
      case 'amount':
        await this.handleAmountInput(chatId, userId, text, session);
        break;
      case 'period':
        await this.handlePeriodInput(chatId, userId, text, session);
        break;
      case 'contact':
        await this.handleContactInput(chatId, userId, text, session);
        break;
    }
  }

  cancelTransaction(userId: number): boolean {
    const session = this.userSessions.get(userId);
    if (session) {
      this.userSessions.delete(userId);
      return true;
    }
    return false;
  }

  private async sendFamilySelection(chatId: number): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: FAMILY_OPTIONS.map((family) => [
          { text: family, callback_data: `family_${family}` },
        ]),
      },
    };

    await this.telegram.sendMessage(
      chatId,
      '👨‍👩‍👧‍👦 Seleziona la famiglia:',
      keyboard,
    );
  }

  private async sendCategorySelection(chatId: number): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: CATEGORY_OPTIONS.map((category) => [
          { text: category, callback_data: `category_${category}` },
        ]),
      },
    };

    await this.telegram.sendMessage(
      chatId,
      '📋 Seleziona la categoria:',
      keyboard,
    );
  }

  private async handleFamilySelection(
    callbackQuery: TelegramCallbackQuery,
    session: UserSession,
  ): Promise<void> {
    const family = callbackQuery.data!.replace('family_', '');
    session.transactionData.family = family;
    session.step = 'category';

    await this.telegram.answerCallbackQuery(
      callbackQuery.id,
      `Famiglia selezionata: ${family}`,
    );
    await this.sendCategorySelection(session.chatId);
  }

  private async handleCategorySelection(
    callbackQuery: TelegramCallbackQuery,
    session: UserSession,
  ): Promise<void> {
    const category = callbackQuery.data!.replace('category_', '');
    session.transactionData.category = category;
    session.step = 'amount';

    await this.telegram.answerCallbackQuery(
      callbackQuery.id,
      `Categoria selezionata: ${category}`,
    );
    await this.telegram.sendMessage(
      session.chatId,
      "💰 Inserisci l'importo in EUR (es. 25.50):",
    );
  }

  private async handleAmountInput(
    chatId: number,
    userId: number,
    text: string,
    session: UserSession,
  ): Promise<void> {
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
      await this.telegram.sendMessage(
        chatId,
        '❌ Inserisci un importo valido in EUR (es. 25.50):',
      );
      return;
    }

    session.transactionData.amount = amount;
    session.step = 'period';

    await this.telegram.sendMessage(
      chatId,
      '📅 Inserisci il periodo (formato: YYYY-MM-DD, es. 2024-01-15):',
    );
  }

  private async handlePeriodInput(
    chatId: number,
    userId: number,
    text: string,
    session: UserSession,
  ): Promise<void> {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(text)) {
      await this.telegram.sendMessage(
        chatId,
        '❌ Inserisci una data valida nel formato YYYY-MM-DD (es. 2024-01-15):',
      );
      return;
    }

    session.transactionData.period = text;
    session.step = 'contact';

    await this.telegram.sendMessage(
      chatId,
      '👤 Inserisci il username del contatto (es. @username):',
    );
  }

  private async handleContactInput(
    chatId: number,
    userId: number,
    text: string,
    session: UserSession,
  ): Promise<void> {
    if (!text.startsWith('@')) {
      await this.telegram.sendMessage(
        chatId,
        '❌ Inserisci un username valido che inizi con @ (es. @username):',
      );
      return;
    }

    session.transactionData.contact = text;
    await this.completeTransaction(chatId, userId, session);
  }

  private async completeTransaction(
    chatId: number,
    userId: number,
    session: UserSession,
  ): Promise<void> {
    try {
      const transaction = {
        family: session.transactionData.family!,
        category: session.transactionData.category!,
        amount: session.transactionData.amount!,
        period: session.transactionData.period!,
        contact: session.transactionData.contact!,
        recorded_by: `@${userId}`,
        recorded_at: new Date().toISOString(),
        chat_id: chatId,
      };

      const { data, error } = await this.supabase
        .from('transactions')
        .insert(transaction)
        .select('id')
        .single();

      if (error) {
        console.error('Error saving transaction:', error);
        await this.telegram.sendMessage(
          chatId,
          '❌ Errore durante il salvataggio della transazione. Riprova.',
        );
        return;
      }

      const transactionId = data.id;

      // Send confirmation
      await this.sendConfirmation(chatId, transaction, transactionId);

      // Send notification to contact
      await this.sendContactNotification(transaction, transactionId);

      // Clear session
      this.userSessions.delete(userId);
    } catch (error) {
      console.error('Error saving transaction:', error);
      await this.telegram.sendMessage(
        chatId,
        '❌ Errore durante il salvataggio della transazione. Riprova.',
      );
    }
  }

  private async sendConfirmation(
    chatId: number,
    transaction: any,
    transactionId: number,
  ): Promise<void> {
    const confirmationMessage = `
✅ **Transazione registrata con successo!**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Contatto:** ${transaction.contact}
• **Registrato da:** ${transaction.recorded_by}
• **ID Transazione:** #${transactionId}

📤 **Notifica inviata a:** ${transaction.contact}
    `;

    await this.telegram.sendMessage(chatId, confirmationMessage, {
      parse_mode: 'Markdown',
    });
  }

  private async sendContactNotification(
    transaction: any,
    transactionId: number,
  ): Promise<void> {
    const notificationMessage = `
🔔 **Nuova transazione registrata**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Registrato da:** ${transaction.recorded_by}
• **ID Transazione:** #${transactionId}
    `;

    try {
      await this.telegram.sendMessage(
        transaction.contact,
        notificationMessage,
        {
          parse_mode: 'Markdown',
        },
      );
    } catch (error) {
      console.error('Error sending notification:', error);
      await this.telegram.sendMessage(
        transaction.chat_id,
        `⚠️ Impossibile inviare la notifica a ${transaction.contact}. Verifica che l'username sia corretto.`,
      );
    }
  }
}
