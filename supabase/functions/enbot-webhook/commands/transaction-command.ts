// Transaction command implementation
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  Transaction,
} from '../types.ts';
import { CATEGORY_OPTIONS, FAMILY_OPTIONS } from '../types.ts';

export class TransactionCommand extends BaseCommand {
  constructor(context: CommandContext) {
    super(context, 'transaction');
  }

  canHandle(message: TelegramMessage | TelegramCallbackQuery): boolean {
    if ('text' in message) {
      // Handle /start command or text input during transaction flow
      return message.text === '/start' ||
        message.text === '/transaction' ||
        this.isTransactionInput(message.text);
    } else {
      // Handle callback queries for family/category selection
      return message.data?.startsWith('family_') ||
        message.data?.startsWith('category_') ||
        message.data === 'recover_session' ||
        message.data === 'cancel_session';
    }
  }

  private isTransactionInput(text: string): boolean {
    // Check if this looks like transaction input (amount, date, username)
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const usernameRegex = /^@\w+$/;

    return amountRegex.test(text) || dateRegex.test(text) ||
      usernameRegex.test(text);
  }

  async execute(): Promise<CommandResult> {
    if (this.context.message) {
      return await this.handleMessage(this.context.message);
    } else if (this.context.callbackQuery) {
      return await this.handleCallbackQuery(this.context.callbackQuery);
    }

    return { success: false, message: 'No message or callback query provided' };
  }

  private async handleMessage(
    message: TelegramMessage,
  ): Promise<CommandResult> {
    if (message.text === '/start' || message.text === '/transaction') {
      return await this.startTransaction();
    } else {
      return await this.handleTextInput(message.text!);
    }
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const data = callbackQuery.data!;

    if (data === 'recover_session') {
      return await this.recoverSession();
    } else if (data === 'cancel_session') {
      return await this.cancelSession();
    } else if (data.startsWith('family_')) {
      return await this.handleFamilySelection(callbackQuery);
    } else if (data.startsWith('category_')) {
      return await this.handleCategorySelection(callbackQuery);
    }

    return { success: false, message: 'Unknown callback data' };
  }

  private async startTransaction(): Promise<CommandResult> {
    // Check if user has an existing session
    const existingSession = await this.loadSession();

    if (existingSession) {
      console.log(
        `🔄 Found existing session for user ${this.context.userId}, step: ${existingSession.step}`,
      );
      await this.showSessionRecovery(existingSession);
      return { success: true, message: 'Session recovery shown' };
    }

    // Initialize new session
    const session: CommandSession = {
      chatId: this.context.chatId,
      userId: this.context.userId,
      step: 'family',
      transactionData: {},
      commandType: this.commandName,
      commandData: {},
    };

    await this.saveSession(session);
    await this.sendFamilySelection();

    return { success: true, message: 'Transaction started' };
  }

  private async handleTextInput(text: string): Promise<CommandResult> {
    const session = await this.loadSession();
    if (!session) {
      return { success: false, message: 'No active session found' };
    }

    console.log(
      `🔄 Processing text input for user ${this.context.userId}, step: ${session.step}`,
    );

    switch (session.step) {
      case 'amount':
        return await this.handleAmountInput(text, session);
      case 'period':
        return await this.handlePeriodInput(text, session);
      case 'contact':
        return await this.handleContactInput(text, session);
      default:
        return { success: false, message: 'Invalid step for text input' };
    }
  }

  private async handleFamilySelection(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const session = await this.loadSession();
    if (!session) return { success: false, message: 'No active session' };

    const family = callbackQuery.data!.replace('family_', '');
    session.transactionData.family = family;
    session.step = 'category';
    session.commandData.family = family;

    await this.saveSession(session);
    await this.answerCallbackQuery(
      callbackQuery.id,
      `Famiglia selezionata: ${family}`,
    );
    await this.sendCategorySelection();

    return { success: true, message: 'Family selected' };
  }

  private async handleCategorySelection(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const session = await this.loadSession();
    if (!session) return { success: false, message: 'No active session' };

    const category = callbackQuery.data!.replace('category_', '');
    session.transactionData.category = category;
    session.step = 'amount';
    session.commandData.category = category;

    await this.saveSession(session);
    await this.answerCallbackQuery(
      callbackQuery.id,
      `Categoria selezionata: ${category}`,
    );
    await this.sendAmountPrompt();

    return { success: true, message: 'Category selected' };
  }

  private async handleAmountInput(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
      await this.sendMessage(
        '❌ Inserisci un importo valido in EUR (es. 25.50):',
      );
      return { success: false, message: 'Invalid amount' };
    }

    session.transactionData.amount = amount;
    session.step = 'period';
    session.commandData.amount = amount;

    await this.saveSession(session);
    await this.sendMessage(
      '📅 Inserisci il periodo (formato: YYYY-MM-DD, es. 2024-01-15):',
    );

    return { success: true, message: 'Amount entered' };
  }

  private async handlePeriodInput(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(text)) {
      await this.sendMessage(
        '❌ Inserisci una data valida nel formato YYYY-MM-DD (es. 2024-01-15):',
      );
      return { success: false, message: 'Invalid date format' };
    }

    session.transactionData.period = text;
    session.step = 'contact';
    session.commandData.period = text;

    await this.saveSession(session);
    await this.sendMessage(
      '👤 Inserisci il username del contatto (es. @username):',
    );

    return { success: true, message: 'Period entered' };
  }

  private async handleContactInput(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    if (!text.startsWith('@')) {
      await this.sendMessage(
        '❌ Inserisci un username valido che inizi con @ (es. @username):',
      );
      return { success: false, message: 'Invalid username format' };
    }

    session.transactionData.contact = text;
    session.commandData.contact = text;

    return await this.completeTransaction(session);
  }

  private async completeTransaction(
    session: CommandSession,
  ): Promise<CommandResult> {
    try {
      const transaction = {
        family: session.transactionData.family!,
        category: session.transactionData.category!,
        amount: session.transactionData.amount!,
        period: session.transactionData.period!,
        contact: session.transactionData.contact!,
        recorded_by: `@${this.context.userId}`,
        recorded_at: new Date().toISOString(),
        chat_id: this.context.chatId,
      };

      const { data, error } = await this.context.supabase
        .from('transactions')
        .insert(transaction)
        .select('id')
        .single();

      if (error) {
        console.error('Error saving transaction:', error);
        await this.sendMessage(
          '❌ Errore durante il salvataggio della transazione. Riprova.',
        );
        return { success: false, message: 'Database error' };
      }

      // Delete session after successful completion
      await this.deleteSession();

      const transactionId = data.id;
      await this.sendConfirmation(transaction, transactionId);
      await this.sendNotification(transaction, transactionId);

      return { success: true, message: 'Transaction completed successfully' };
    } catch (error) {
      console.error('Error completing transaction:', error);
      await this.sendMessage(
        '❌ Errore durante il completamento della transazione.',
      );
      return { success: false, message: 'Completion error' };
    }
  }

  private async showSessionRecovery(
    existingSession: CommandSession,
  ): Promise<void> {
    const sessionData = existingSession.transactionData;
    const stepNames = {
      'family': 'Selezione Famiglia',
      'category': 'Selezione Categoria',
      'amount': 'Inserimento Importo',
      'period': 'Inserimento Periodo',
      'contact': 'Inserimento Contatto',
    };
    console.log('stepNames', existingSession);

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

    await this.sendMessage(sessionInfo, {
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

  private async recoverSession(): Promise<CommandResult> {
    try {
      const existingSession = await this.loadSession();
      if (!existingSession) {
        await this.sendMessage(
          '❌ Sessione non trovata. Iniziando una nuova sessione.',
        );
        return await this.startTransaction();
      }

      await this.sendMessage(
        '✅ Sessione ripristinata! Continuando da dove avevi lasciato...',
      );

      // Continue from the current step
      switch (existingSession.step) {
        case 'family':
          await this.sendFamilySelection();
          break;
        case 'category':
          await this.sendCategorySelection();
          break;
        case 'amount':
          await this.sendAmountPrompt();
          break;
        case 'period':
          await this.sendPeriodPrompt();
          break;
        case 'contact':
          await this.sendContactPrompt();
          break;
        default:
          await this.sendFamilySelection();
      }

      return { success: true, message: 'Session recovered' };
    } catch (error) {
      console.error('❌ Error recovering session:', error);
      await this.sendMessage(
        '❌ Errore nel ripristino della sessione. Iniziando una nuova sessione.',
      );
      return await this.startTransaction();
    }
  }

  private async cancelSession(): Promise<CommandResult> {
    try {
      await this.deleteSession();
      await this.sendMessage(
        '🗑️ Sessione precedente cancellata. Iniziando una nuova sessione...',
      );
      return await this.startTransaction();
    } catch (error) {
      console.error('❌ Error canceling session:', error);
      await this.sendMessage('❌ Errore nella cancellazione della sessione.');
      return { success: false, message: 'Cancel error' };
    }
  }

  // UI Helper methods
  private async sendFamilySelection(): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: FAMILY_OPTIONS.map((family) => [
          { text: family, callback_data: `family_${family}` },
        ]),
      },
    };

    await this.sendMessage('👨‍👩‍👧‍👦 Seleziona la famiglia:', keyboard);
  }

  private async sendCategorySelection(): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: CATEGORY_OPTIONS.map((category) => [
          { text: category, callback_data: `category_${category}` },
        ]),
      },
    };

    await this.sendMessage('📋 Seleziona la categoria:', keyboard);
  }

  private async sendAmountPrompt(): Promise<void> {
    await this.sendMessage("💰 Inserisci l'importo in EUR (es. 25.50):");
  }

  private async sendPeriodPrompt(): Promise<void> {
    await this.sendMessage(
      '📅 Inserisci il periodo (formato: YYYY-MM-DD, es. 2024-01-15):',
    );
  }

  private async sendContactPrompt(): Promise<void> {
    await this.sendMessage(
      '👤 Inserisci il username del contatto (es. @username):',
    );
  }

  private async sendConfirmation(
    transaction: any,
    transactionId: number,
  ): Promise<void> {
    const confirmationMessage = `✅ **Transazione Registrata!**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Contatto:** ${transaction.contact}
• **ID Transazione:** #${transactionId}

📤 Una notifica è stata inviata al contatto specificato.`;

    await this.sendMessage(confirmationMessage, { parse_mode: 'Markdown' });
  }

  private async sendNotification(
    transaction: any,
    transactionId: number,
  ): Promise<void> {
    const notificationMessage = `🔔 **Nuova Transazione Registrata**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Registrato da:** ${transaction.recorded_by}
• **ID Transazione:** #${transactionId}`;

    try {
      await this.context.telegram.sendMessage(
        transaction.contact,
        notificationMessage,
        {
          parse_mode: 'Markdown',
        },
      );
    } catch (error) {
      console.error('Error sending notification:', error);
      await this.sendMessage(
        transaction.chat_id,
        `⚠️ Impossibile inviare la notifica a ${transaction.contact}. Verifica che l'username sia corretto.`,
      );
    }
  }

  getHelpText(): string {
    return '/start o /transaction - Inizia una nuova transazione';
  }

  getDescription(): string {
    return 'Gestisce il flusso completo di registrazione transazioni con selezione famiglia, categoria, importo, periodo e contatto';
  }
}
