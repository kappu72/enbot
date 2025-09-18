// Quote command implementation - skips category selection
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import { FAMILY_OPTIONS } from '../types.ts';

export class QuoteCommand extends BaseCommand {
  constructor(context: CommandContext) {
    super(context, 'quote');
  }

  canHandle(message: TelegramMessage | TelegramCallbackQuery): boolean {
    if ('text' in message) {
      // Handle /quote command or text input during quote flow
      return message.text === '/quote' || this.isQuoteInput(message.text);
    } else {
      // Handle callback queries for family selection
      return message.data?.startsWith('quote_family_') ||
        message.data === 'quote_recover_session' ||
        message.data === 'quote_cancel_session';
    }
  }

  private isQuoteInput(text: string): boolean {
    // Check if this looks like quote input (amount, date, username)
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
    if (message.text === '/quote') {
      return await this.startQuote();
    } else {
      return await this.handleTextInput(message.text!);
    }
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const data = callbackQuery.data!;

    if (data === 'quote_recover_session') {
      return await this.recoverSession();
    } else if (data === 'quote_cancel_session') {
      return await this.cancelSession();
    } else if (data.startsWith('quote_family_')) {
      return await this.handleFamilySelection(callbackQuery);
    }

    return { success: false, message: 'Unknown callback data' };
  }

  private async startQuote(): Promise<CommandResult> {
    // Check if user has an existing quote session
    const existingSession = await this.loadSession();

    if (existingSession) {
      console.log(
        `🔄 Found existing quote session for user ${this.context.userId}, step: ${existingSession.step}`,
      );
      await this.showSessionRecovery(existingSession);
      return { success: true, message: 'Quote session recovery shown' };
    }

    // Initialize new quote session
    const session: CommandSession = {
      chatId: this.context.chatId,
      userId: this.context.userId,
      step: 'family',
      transactionData: {
        category: 'quota mensile', // Fixed category for quotes
      },
      commandType: this.commandName,
      commandData: {
        category: 'quota mensile',
      },
    };

    await this.saveSession(session);
    await this.sendFamilySelection();

    return { success: true, message: 'Quote started' };
  }

  private async handleTextInput(text: string): Promise<CommandResult> {
    const session = await this.loadSession();
    if (!session) {
      return { success: false, message: 'No active quote session found' };
    }

    console.log(
      `🔄 Processing quote text input for user ${this.context.userId}, step: ${session.step}`,
    );

    switch (session.step) {
      case 'amount':
        return await this.handleAmountInput(text, session);
      case 'period':
        return await this.handlePeriodInput(text, session);
      case 'contact':
        return await this.handleContactInput(text, session);
      default:
        return { success: false, message: 'Invalid step for quote text input' };
    }
  }

  private async handleFamilySelection(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const session = await this.loadSession();
    if (!session) return { success: false, message: 'No active quote session' };

    const family = callbackQuery.data!.replace('quote_family_', '');
    session.transactionData.family = family;
    session.step = 'amount'; // Skip category, go directly to amount
    session.commandData.family = family;

    await this.saveSession(session);
    await this.answerCallbackQuery(
      callbackQuery.id,
      `Famiglia selezionata: ${family}`,
    );
    await this.sendAmountPrompt();

    return { success: true, message: 'Family selected for quote' };
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

    return { success: true, message: 'Amount entered for quote' };
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

    return { success: true, message: 'Period entered for quote' };
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

    return await this.completeQuote(session);
  }

  private async completeQuote(session: CommandSession): Promise<CommandResult> {
    try {
      const transaction = {
        family: session.transactionData.family!,
        category: 'quota mensile', // Fixed category
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
        console.error('Error saving quote transaction:', error);
        await this.sendMessage(
          '❌ Errore durante il salvataggio della quota. Riprova.',
        );
        return { success: false, message: 'Database error' };
      }

      // Delete session after successful completion
      await this.deleteSession();

      const transactionId = data.id;
      await this.sendConfirmation(transaction, transactionId);
      await this.sendNotification(transaction, transactionId);

      return { success: true, message: 'Quote completed successfully' };
    } catch (error) {
      console.error('Error completing quote:', error);
      await this.sendMessage('❌ Errore durante il completamento della quota.');
      return { success: false, message: 'Completion error' };
    }
  }

  private async showSessionRecovery(
    existingSession: CommandSession,
  ): Promise<void> {
    const sessionData = existingSession.transactionData;
    const stepNames = {
      'family': 'Selezione Famiglia',
      'amount': 'Inserimento Importo',
      'period': 'Inserimento Periodo',
      'contact': 'Inserimento Contatto',
    };

    const currentStep =
      stepNames[existingSession.step as keyof typeof stepNames] ||
      existingSession.step;

    let sessionInfo = `🔄 **Sessione Quota Precedente Trovata**\n\n`;
    sessionInfo += `📊 **Stato attuale:** ${currentStep}\n`;
    sessionInfo += `📂 **Categoria:** quota mensile (fissa)\n`;

    if (sessionData.family) {
      sessionInfo += `👨‍👩‍👧‍👦 **Famiglia:** ${sessionData.family}\n`;
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

    sessionInfo +=
      `\n🤔 Vuoi riprendere questa sessione quota o iniziare una nuova?`;

    await this.sendMessage(sessionInfo, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔄 Riprendi Quota',
              callback_data: 'quote_recover_session',
            },
            { text: '🆕 Nuova Quota', callback_data: 'quote_cancel_session' },
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
          '❌ Sessione quota non trovata. Iniziando una nuova quota.',
        );
        return await this.startQuote();
      }

      await this.sendMessage(
        '✅ Sessione quota ripristinata! Continuando da dove avevi lasciato...',
      );

      // Continue from the current step
      switch (existingSession.step) {
        case 'family':
          await this.sendFamilySelection();
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

      return { success: true, message: 'Quote session recovered' };
    } catch (error) {
      console.error('❌ Error recovering quote session:', error);
      await this.sendMessage(
        '❌ Errore nel ripristino della sessione quota. Iniziando una nuova quota.',
      );
      return await this.startQuote();
    }
  }

  private async cancelSession(): Promise<CommandResult> {
    try {
      await this.deleteSession();
      await this.sendMessage(
        '🗑️ Sessione quota precedente cancellata. Iniziando una nuova quota...',
      );
      return await this.startQuote();
    } catch (error) {
      console.error('❌ Error canceling quote session:', error);
      await this.sendMessage(
        '❌ Errore nella cancellazione della sessione quota.',
      );
      return { success: false, message: 'Cancel error' };
    }
  }

  // UI Helper methods
  private async sendFamilySelection(): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: FAMILY_OPTIONS.map((family) => [
          { text: family, callback_data: `quote_family_${family}` },
        ]),
      },
    };

    await this.sendMessage(
      '👨‍👩‍👧‍👦 Seleziona la famiglia per la quota mensile:',
      keyboard,
    );
  }

  private async sendAmountPrompt(): Promise<void> {
    await this.sendMessage(
      "💰 Inserisci l'importo della quota in EUR (es. 25.50):",
    );
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
    const confirmationMessage = `✅ **Quota Mensile Registrata!**

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
    const notificationMessage = `🔔 **Nuova Quota Mensile Registrata**

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
      console.error('Error sending quote notification:', error);
      await this.sendMessage(
        transaction.chat_id,
        `⚠️ Impossibile inviare la notifica a ${transaction.contact}. Verifica che l'username sia corretto.`,
      );
    }
  }

  getHelpText(): string {
    return '/quote - Registra una quota mensile (salta selezione categoria)';
  }

  getDescription(): string {
    return 'Gestisce il flusso di registrazione quote mensili con selezione famiglia, importo, periodo e contatto (categoria fissa: quota mensile)';
  }
}
