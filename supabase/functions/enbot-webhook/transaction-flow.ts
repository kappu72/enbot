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
import { SessionManager } from './session-manager.ts';

export class TransactionFlow {
  private userSessions: Map<number, UserSession> = new Map();
  private supabase: SupabaseClient;
  private telegram: TelegramClient;
  private sessionManager: SessionManager;

  constructor(supabase: SupabaseClient, telegram: TelegramClient) {
    this.supabase = supabase;
    this.telegram = telegram;
    this.sessionManager = new SessionManager(supabase);
  }

  async startTransaction(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    console.log(`🚀 Starting transaction for user ${userId} in chat ${chatId}`);

    if (!userId) {
      console.log('❌ No userId found, cannot start transaction');
      return;
    }

    // Check if user has an existing session
    const existingSession = await this.sessionManager.loadSession(userId);

    if (existingSession) {
      console.log(
        `🔄 Found existing session for user ${userId}, step: ${existingSession.step}`,
      );
      await this.showSessionRecovery(chatId, existingSession);
      return;
    }

    // Initialize new user session
    this.userSessions.set(userId, {
      chatId,
      userId,
      step: 'family',
      transactionData: {},
    });

    // Save session to database
    await this.sessionManager.saveSession(this.userSessions.get(userId)!);

    console.log(`✅ New session created for user ${userId}, step: family`);
    await this.sendFamilySelection(chatId);
  }

  async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;

    if (!chatId || !data) return;

    // Handle session recovery callbacks
    if (data === 'recover_session') {
      await this.recoverSession(userId, chatId);
      return;
    }

    if (data === 'cancel_session') {
      await this.cancelSession(userId, chatId);
      return;
    }

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

  async cancelTransaction(userId: number): Promise<boolean> {
    const session = this.userSessions.get(userId);
    if (session) {
      // Delete session from database
      await this.sessionManager.deleteSession(userId);
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

    // Save session to database
    await this.sessionManager.saveSession(session);

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

    // Save session to database
    await this.sessionManager.saveSession(session);

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

    // Save session to database
    await this.sessionManager.saveSession(session);

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

    // Save session to database
    await this.sessionManager.saveSession(session);

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

      // Delete session after successful transaction completion
      await this.sessionManager.deleteSession(userId);
      this.userSessions.delete(userId);

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

  /**
   * Show session recovery options to user
   */
  private async showSessionRecovery(
    chatId: number,
    existingSession: any,
  ): Promise<void> {
    const sessionData = existingSession.transaction_data;
    const stepNames = {
      'family': 'Selezione Famiglia',
      'category': 'Selezione Categoria',
      'amount': 'Inserimento Importo',
      'period': 'Inserimento Periodo',
      'contact': 'Inserimento Contatto',
    };

    const currentStep =
      stepNames[existingSession.step as keyof typeof stepNames] ||
      existingSession.step;

    let sessionInfo = `🔄 **Sessione Precedente Trovata**\n\n`;
    sessionInfo += `📊 **Stato attuale:** ${currentStep}\n`;

    if (sessionData.family) {
      sessionInfo += `👨‍👩‍👧‍👦 **Famiglia:** ${sessionData.family}\n`;
    }
    if (sessionData.category) {
      sessionInfo += `📂 **Categoria:** ${sessionData.category}\n`;
    }
    if (sessionData.amount) {
      sessionInfo += `💰 **Importo:** €${sessionData.amount}\n`;
    }
    if (sessionData.period) {
      sessionInfo += `📅 **Periodo:** ${sessionData.period}\n`;
    }
    if (sessionData.contact) {
      sessionInfo += `📞 **Contatto:** ${sessionData.contact}\n`;
    }

    sessionInfo += `\n🤔 Vuoi riprendere questa sessione o iniziare una nuova?`;

    await this.telegram.sendMessage(chatId, sessionInfo, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Riprendi Sessione', callback_data: 'recover_session' },
            { text: '🆕 Nuova Sessione', callback_data: 'cancel_session' },
          ],
        ],
      },
    });
  }

  /**
   * Recover existing session
   */
  private async recoverSession(userId: number, chatId: number): Promise<void> {
    try {
      const existingSession = await this.sessionManager.loadSession(userId);
      if (!existingSession) {
        await this.telegram.sendMessage(
          chatId,
          '❌ Sessione non trovata. Iniziando una nuova sessione.',
        );
        await this.startNewSession(userId, chatId);
        return;
      }

      // Convert persisted session to in-memory session
      const session = this.sessionManager.persistedToMemory(existingSession);
      this.userSessions.set(userId, session);

      await this.telegram.sendMessage(
        chatId,
        '✅ Sessione ripristinata! Continuando da dove avevi lasciato...',
      );

      // Continue from the current step
      switch (session.step) {
        case 'family':
          await this.sendFamilySelection(chatId);
          break;
        case 'category':
          await this.sendCategorySelection(chatId);
          break;
        case 'amount':
          await this.sendAmountPrompt(chatId);
          break;
        case 'period':
          await this.sendPeriodPrompt(chatId);
          break;
        case 'contact':
          await this.sendContactPrompt(chatId);
          break;
        default:
          await this.sendFamilySelection(chatId);
      }
    } catch (error) {
      console.error('❌ Error recovering session:', error);
      await this.telegram.sendMessage(
        chatId,
        '❌ Errore nel ripristino della sessione. Iniziando una nuova sessione.',
      );
      await this.startNewSession(userId, chatId);
    }
  }

  /**
   * Cancel existing session and start new one
   */
  private async cancelSession(userId: number, chatId: number): Promise<void> {
    try {
      // Delete existing session
      await this.sessionManager.deleteSession(userId);
      this.userSessions.delete(userId);

      await this.telegram.sendMessage(
        chatId,
        '🗑️ Sessione precedente cancellata. Iniziando una nuova sessione...',
      );
      await this.startNewSession(userId, chatId);
    } catch (error) {
      console.error('❌ Error canceling session:', error);
      await this.telegram.sendMessage(
        chatId,
        '❌ Errore nella cancellazione della sessione.',
      );
    }
  }

  /**
   * Start a completely new session
   */
  private async startNewSession(userId: number, chatId: number): Promise<void> {
    const newSession: UserSession = {
      chatId,
      userId,
      step: 'family',
      transactionData: {},
    };

    this.userSessions.set(userId, newSession);
    await this.sessionManager.saveSession(newSession);
    await this.sendFamilySelection(chatId);
  }
}
