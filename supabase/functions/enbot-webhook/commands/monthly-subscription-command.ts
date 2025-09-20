// Monthly subscription command implementation - handles school enrollment fees
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import { amountStep } from '../steps/amount-step.ts';
import { periodStep } from '../steps/period-step.ts';
import type { StepContext } from '../steps/step-types.ts';

enum STEPS {
  'Family' = 'family',
  'Amount' = 'amount',
  'Period' = 'period',
  'Complete' = 'complete',
}

export class MonthlySubscriptionCommand extends BaseCommand {
  static commandName = 'quota';
  static description = '💰 Registra una quota mensile';
  private readonly messagePrefix = '__quota:';
  constructor(context: CommandContext) {
    super(context, MonthlySubscriptionCommand.commandName);
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
    const session = await this.loadCommandSession();
    if (!session) {
      return { success: false, message: 'Nessuna sessione trovata' };
    }
    switch (session.step) {
      case STEPS.Family:
        return await this.handleFamilySelection(text, session);
      case STEPS.Amount:
        return await this.handleAmountInputWithStep(text, session);
      case STEPS.Period:
        return await this.handlePeriodInputWithStep(text, session);
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

    await this.sendAmountPromptWithStep();

    return { success: true, message: 'Family selected for quote' };
  }

  private async handleAmountInputWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 MonthlySubscriptionCommand: Processing amount input:',
      text,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Process input using AmountStep
    const result = amountStep.processInput(text, stepContext);

    if (result.success) {
      // Save the validated amount in session
      session.transactionData.amount = result.processedValue;
      session.step = STEPS.Period;

      await this.saveSession(session);
      await this.sendPeriodPromptWithStep();
      return { success: true, message: 'Amount entered for quote' };
    } else {
      console.log(
        '❌ MonthlySubscriptionCommand: Amount validation failed:',
        result.error,
      );
      // Present error using AmountStep's error presenter
      const errorContent = amountStep.presentError(
        stepContext,
        result.error || "Errore nella validazione dell'importo",
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return { success: false, message: result.error || 'Invalid amount' };
    }
  }

  private async handlePeriodInputWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 MonthlySubscriptionCommand: Processing period input:',
      text,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Process input using PeriodStep
    const result = periodStep.processInput(text, stepContext);

    if (result.success) {
      // Save the validated period in session
      session.transactionData.period = result.processedValue;
      session.step = STEPS.Complete;

      await this.saveSession(session);
      return await this.completeQuote(session);
    } else {
      console.log(
        '❌ MonthlySubscriptionCommand: Period validation failed:',
        result.error,
      );
      // Present error using PeriodStep's error presenter
      const errorContent = periodStep.presentError(
        stepContext,
        result.error || 'Errore nella validazione del periodo',
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return { success: false, message: result.error || 'Invalid period' };
    }
  }

  private async completeQuote(session: CommandSession): Promise<CommandResult> {
    // split the period into month and year
    const transactionPayload = this.getTransactionPayload(session);
    try {
      const transaction = {
        payload: transactionPayload,
        created_by_user_id: this.context.userId,
        command_type: session.commandType,
        is_synced: false,
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

      // Sync with Google Sheets (optional)
      const syncResult = await this.syncTransactionToGoogleSheets(
        transactionId,
      );
      if (!syncResult.success) {
        console.warn(
          `⚠️ Failed to sync transaction ${transactionId} to Google Sheets: ${syncResult.error}`,
        );
        // Only show error message if it's not a configuration issue
        if (!syncResult.error?.includes('not configured')) {
          await this.sendMessage(
            '⚠️ Quota salvata ma sincronizzazione con Google Sheets fallita. Verrà ritentata automaticamente.',
          );
        }
      } else {
        console.log(
          `✅ Transaction ${transactionId} synced to Google Sheets successfully`,
        );
      }

      await this.sendNotification(transactionPayload, transactionId);

      return { success: true, message: 'Quote completed successfully' };
    } catch (error) {
      console.error('Error completing quote:', error);
      await this.sendMessage('❌ Errore durante il completamento della quota.');
      return { success: false, message: 'Completion error' };
    }
  }

  private async recoverSession(): Promise<CommandResult> {
    try {
      const existingSession = await this.loadCommandSession();
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
          await this.sendAmountPromptWithStep();
          break;
        case 'period':
          await this.sendPeriodPromptWithStep();
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

  private async sendAmountPromptWithStep(): Promise<void> {
    // Create StepContext for presenting the amount step
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for amount prompt');
    }

    console.log(
      '🔍 MonthlySubscriptionCommand: Current session before AmountStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = amountStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 MonthlySubscriptionCommand: AmountStep presented');
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

    await this.sendMessage(message, keyboard);
  }

  private async sendPeriodPromptWithStep(): Promise<void> {
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for period prompt');
    }

    console.log(
      '🔍 MonthlySubscriptionCommand: Current session before PeriodStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = periodStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 MonthlySubscriptionCommand: PeriodStep presented');
  }

  private async sendContactPrompt(): Promise<void> {
    await this.sendMessage(
      '👤 Inserisci il username del contatto (es. @username):',
    );
  }

  private async sendNotification(
    transactionPayload: Record<string, unknown>,
    transactionId: number,
  ): Promise<void> {
    const notificationMessage = `🔔 **Quota Mensile Registrata**
📋 **Dettagli:**
• **Famiglia:** ${transactionPayload.family}
• **Categoria:** ${transactionPayload.category}
• **Importo:** €${transactionPayload.amount}
• **Periodo:** ${transactionPayload.month}-${transactionPayload.year}
• **Registrato da:** ${transactionPayload.recorded_by}`;

    // Send confirmation message to the chat where the command was issued
    await this.sendMessage(notificationMessage, { parse_mode: 'Markdown' });

    console.log(`✅ Quota notification sent for transaction ${transactionId}`);
  }

  override getHelpText(): string {
    return '/quota - Registra una quota mensile';
  }

  override getDescription(): string {
    return MonthlySubscriptionCommand.description;
  }
}
