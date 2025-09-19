// Quote command implementation - skips category selection
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';

enum STEPS {
  'Family' = 'family',
  'Amount' = 'amount',
  'Period' = 'period',
  'Complete' = 'complete',
}

export class QuoteCommand extends BaseCommand {
  private readonly messagePrefix = '__quota:';
  constructor(context: CommandContext) {
    super(context, 'quota');
  }

  override canHandleCallback(
    callbackQuery: TelegramCallbackQuery,
  ) {
    return callbackQuery.data === 'quota_recover_session' ||
      callbackQuery.data === 'quota_cancel_session';
  }

  async execute(): Promise<CommandResult> {
    if (this.context.message) {
      return await this.handleMessage(this.context.message);
    } else if (this.context.callbackQuery) {
      return await this.handleCallbackQuery(this.context.callbackQuery);
    }

    return {
      success: false,
      message: `${this.commandName} command execution failed`,
    };
  }

  private async handleMessage(
    message: TelegramMessage,
  ): Promise<CommandResult> {
    if (message.text === `/${this.commandName}`) {
      return await this.startQuota();
    } else {
      return await this.handleTextInput(message.text!);
    }
  }

  private handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    return Promise.resolve({
      success: false,
      message: `Unknown callback data ${callbackQuery.data}`,
    });
  }

  private async startQuota(): Promise<CommandResult> {
    // clean any existing session
    await this.deleteUserSession();

    // Initialize new quote session
    const session: CommandSession = {
      chatId: this.context.chatId,
      userId: this.context.userId,
      messageId: this.context.message?.message_id || 0, // Save original command message_id
      step: STEPS.Family,
      transactionData: {
        category: 'quota mensile', // Fixed category for quotes
      },
      commandType: this.commandName,
      commandData: {
        category: 'quota mensile',
      },
    };

    await this.saveSession(session);
    const result = await this.sendFamilyPrompt();
    console.log('result', result);

    return { success: true, message: 'Quota started' };
  }

  private async handleTextInput(text: string): Promise<CommandResult> {
    const session = await this.loadSession();
    if (!session) {
      return { success: false, message: 'Nessuna sessione trovata' };
    }
    switch (session.step) {
      case STEPS.Family:
        return await this.handleFamilySelection(text, session);
      case STEPS.Amount:
        return await this.handleAmountInput(text, session);
      case STEPS.Period:
        return await this.handlePeriodInput(text, session);
      default:
        return {
          success: false,
          message: "Passo non valido per l'inserimento di una quota",
        };
    }
  }

  private async handleFamilySelection(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    // TODO:: we should clean the message text
    const family = text!.trim();
    session.transactionData.family = family;
    session.step = STEPS.Amount; // Skip category, go directly to amount

    await this.saveSession(session);
    // clean keyboard and show prompt

    const result = await this.sendAmountPrompt();
    console.log('result', result);

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
      return { success: false, message: 'Importo non valido' };
    }

    session.transactionData.amount = amount;
    session.step = STEPS.Period;

    await this.saveSession(session);
    const result = await this.sendPeriodPrompt();
    console.log('result', result);

    return { success: true, message: 'Amount entered for quote' };
  }

  private async handlePeriodInput(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const dateRegex = /^\d{2} \d{4}$/;
    if (!dateRegex.test(text.trim())) {
      await this.sendMessage(
        '❌ Inserisci una data valida nel formato MM-YYYY (es. 01-2024):',
      );
      return { success: false, message: 'Invalid date format' };
    }

    session.transactionData.period = text.trim();
    session.step = STEPS.Complete;

    await this.saveSession(session);
    return await this.completeQuote(session);
  }

  private async completeQuote(session: CommandSession): Promise<CommandResult> {
    // split the period into month and year
    const [month, year] = session.transactionData.period!.split(' ');
    try {
      const transaction = {
        family: session.transactionData.family!,
        category: session.transactionData.category!,
        amount: session.transactionData.amount!,
        period: session.transactionData.period!,
        month: month,
        year: year,
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
      [STEPS.Family]: 'Selezione Famiglia',
      [STEPS.Amount]: 'Inserimento Importo',
      [STEPS.Period]: 'Inserimento Periodo',
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
              callback_data: 'quota_recover_session',
            },
            { text: '🆕 Nuova Quota', callback_data: 'quota_cancel_session' },
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
        return await this.startQuota();
      }

      await this.sendMessage(
        '✅ Sessione quota ripristinata! Continuando da dove avevi lasciato...',
      );

      // Continue from the current step
      switch (existingSession.step) {
        case 'family':
          await this.sendFamilyPrompt();
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
          await this.sendFamilyPrompt();
      }

      return { success: true, message: 'Quote session recovered' };
    } catch (error) {
      console.error('❌ Error recovering quote session:', error);
      await this.sendMessage(
        '❌ Errore nel ripristino della sessione quota. Iniziando una nuova quota.',
      );
      return await this.startQuota();
    }
  }

  private async cancelSession(): Promise<CommandResult> {
    try {
      await this.deleteSession();
      await this.sendMessage(
        '🗑️ Sessione quota precedente cancellata. Iniziando una nuova quota...',
      );
      return await this.startQuota();
    } catch (error) {
      console.error('❌ Error canceling quote session:', error);
      await this.sendMessage(
        '❌ Errore nella cancellazione della sessione quota.',
      );
      return { success: false, message: 'Cancel error' };
    }
  }

  // UI Helper methods
  private async sendFamilyPrompt(): Promise<void> {
    const keyboard = {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Inserisci la famiglia',
        selective: true,
      },
    };

    // Get username for mention
    const username = this.context.message?.from?.username;
    const mention = username ? `@${username}` : '';
    const message = `${mention} 👨‍👩‍👧‍👦 Seleziona la famiglia per la quota mensile:`;

    return await this.sendMessage(message, keyboard);
  }

  private async sendAmountPrompt(): Promise<void> {
    const keyboard = {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Quanto ha versato la famiglia?',
        selective: true,
      },
    };

    // Get username for mention
    const username = this.context.message?.from?.username;
    const mention = username ? `@${username}` : '';
    const message =
      `${mention} 💰 Inserisci l'importo della quota in EUR (es. 25.50):`;

    await this.sendMessage(message, keyboard);
  }

  private async sendPeriodPrompt(): Promise<void> {
    const keyboard = {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'MESE ANNO',
        selective: true,
      },
    };

    // Get username for mention
    const username = this.context.message?.from?.username;
    const mention = username ? `@${username}` : '';
    const message =
      `${mention} 📅 Inserisci il mese ed anno di riferimento (formato: MM YYYY, es. 01 2024):`;

    await this.sendMessage(message, keyboard);
  }

  private async sendContactPrompt(): Promise<void> {
    await this.sendMessage(
      '👤 Inserisci il username del contatto (es. @username):',
    );
  }

  private async sendConfirmation(
    transaction: Record<string, unknown>,
    transactionId: number,
  ): Promise<void> {
    const confirmationMessage = `✅ **Quota Mensile Registrata!**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Contatto:** ${transaction.contact}
• **ID Transazione:** #${transactionId}`;

    await this.sendMessage(confirmationMessage, { parse_mode: 'Markdown' });
  }

  private async sendNotification(
    transaction: Record<string, unknown>,
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
        transaction.contact as string | number,
        notificationMessage,
        {
          parse_mode: 'Markdown',
        },
      );
    } catch (error) {
      console.error('Error sending quote notification:', error);
      await this.context.telegram.sendMessage(
        transaction.chat_id as string | number,
        `⚠️ Impossibile inviare la notifica a ${transaction.contact}. Verifica che l'username sia corretto.`,
      );
    }
  }

  getHelpText(): string {
    return '/quote - Registra una quota mensile';
  }

  getDescription(): string {
    return 'Gestisce il flusso di registrazione quote mensili con selezione famiglia, importo, periodo';
  }
}
