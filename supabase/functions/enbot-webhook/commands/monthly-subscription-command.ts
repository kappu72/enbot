// Monthly subscription command implementation - handles school enrollment fees
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import {
  personNameStep,
  presentNewContactInput,
  presentPersonNameConfirmation,
  saveNewContact,
  updateContactsKeyboard,
} from '../steps/person-name-step.ts';
import { amountStep, presentAmountConfirmation } from '../steps/amount-step.ts';
import { periodStep } from '../steps/period-step.ts';
import {
  presentPeriodConfirmation,
  presentPeriodUpdate,
} from '../steps/period-step.ts';
import type { StepContext } from '../steps/step-types.ts';
import {
  boldMarkdownV2,
  formatCurrencyMarkdownV2,
} from '../utils/markdown-utils.ts';
import { getMonthByNumber } from '../utils/date-utils.ts';

enum STEPS {
  'PersonName' = 'person-name',
  'Amount' = 'amount',
  'Period' = 'period',
}

export class MonthlySubscriptionCommand extends BaseCommand {
  static commandName = 'quota';
  static description = '💰 Registra una quota mensile';
  private readonly messagePrefix = '__quota:';
  constructor(context: CommandContext) {
    super(context, MonthlySubscriptionCommand.commandName);
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
    // Check if this is a command initiation (both /quota and /quota@botname)
    const commandPrefix = `/${this.commandName}`;
    const isCommandStart = message.text === commandPrefix ||
      (message.text?.startsWith(commandPrefix + '@') ?? false);

    if (isCommandStart) {
      return await this.startQuota();
    } else {
      return await this.handleTextInput(message.text!);
    }
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const session = await this.loadCommandSession();
    if (!session) {
      return { success: false, message: 'Nessuna sessione trovata' };
    }
    console.log(
      '🔍 MonthlySubscriptionCommand: Handling callback query:',
      callbackQuery,
      session,
    );
    // Handle PersonNameStep callbacks (contact:)
    if (
      session.step === STEPS.PersonName &&
      callbackQuery.data?.startsWith('contact:')
    ) {
      return await this.handlePersonNameCallbackWithStep(
        callbackQuery.data,
        session,
      );
    }

    // Handle PeriodStep callbacks (month:, year:)
    if (
      session.step === STEPS.Period &&
      (callbackQuery.data?.startsWith('month:') ||
        callbackQuery.data?.startsWith('year:'))
    ) {
      return await this.handlePeriodSelectionWithStep(
        callbackQuery.data,
        session,
      );
    }

    return {
      success: false,
      message: `Unknown callback data ${callbackQuery.data}`,
    };
  }

  private async startQuota(): Promise<CommandResult> {
    // clean any existing session
    await this.deleteUserSession();

    // Initialize new quote session
    const session: CommandSession = {
      chatId: this.context.chatId,
      userId: this.context.userId,
      messageId: null,
      step: STEPS.PersonName,
      transactionData: {
        category: 'quota mensile', // Fixed category for quotes
      },
      commandType: this.commandName,
      commandData: {
        category: 'quota mensile',
      },
    };

    await this.saveSession(session);
    await this.sendPersonNamePromptWithStep();

    return { success: true, message: 'Quota started' };
  }

  private async handleTextInput(text: string): Promise<CommandResult> {
    const session = await this.loadCommandSession();
    if (!session) {
      return { success: false, message: 'Nessuna sessione trovata' };
    }
    switch (session.step) {
      case STEPS.PersonName:
        return await this.handlePersonNameSelectionWithStep(text, session);
      case STEPS.Amount:
        return await this.handleAmountInputWithStep(text, session);
      default:
        return {
          success: false,
          message: "Passo non valido per l'inserimento di una quota",
        };
    }
  }

  private async handlePersonNameSelectionWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 MonthlySubscriptionCommand: Processing person name input:',
      text,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Check if we're in new contact mode
    const isNewContactMode = session.commandData?.isNewContactMode === true;

    // Process input using PersonNameStep
    const result = personNameStep.processInput(text, stepContext);

    if (result.success) {
      const contactName = result.processedValue as string;

      // If we're in new contact mode, save to database first
      if (isNewContactMode) {
        console.log(
          '➕ MonthlySubscriptionCommand: Saving new contact:',
          contactName,
        );

        const saved = await saveNewContact(stepContext, contactName);
        if (!saved) {
          const errorContent = personNameStep.presentError(
            stepContext,
            '❌ Errore nel salvataggio del nuovo contatto. Riprova.',
          );
          await this.sendMessage(errorContent.text, errorContent.options);
          return { success: false, message: 'Failed to save new contact' };
        }

        // Clear the new contact mode flag
        session.commandData.isNewContactMode = false;
        console.log('✅ New contact saved successfully:', contactName);
      }

      // Save the validated person name in session
      session.transactionData.family = contactName;
      session.step = STEPS.Amount;

      await this.saveSession(session);
      await this.sendAmountPromptWithStep();
      return { success: true, message: 'Person name selected for quote' };
    } else {
      console.log(
        '❌ MonthlySubscriptionCommand: Person name validation failed:',
        result.error,
      );
      // Present error using PersonNameStep's error presenter
      const errorContent = personNameStep.presentError(
        stepContext,
        result.error || 'Error in person name validation',
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return { success: false, message: result.error || 'Invalid person name' };
    }
  }

  private async handlePersonNameCallbackWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 MonthlySubscriptionCommand: Processing person name selection:',
      callbackData,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Process callback using PersonNameStep
    const callbackQuery = this.context.callbackQuery!;
    const result = await personNameStep.processCallback(
      callbackQuery,
      stepContext,
    );

    if (result.success) {
      if (result.processedValue === 'UPDATE_KEYBOARD') {
        // Page navigation - update keyboard without completing step
        console.log(
          '🔄 MonthlySubscriptionCommand: Updating contacts keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const updateContent = await updateContactsKeyboard(
          stepContext,
          callbackData,
        );
        await this.editLastMessage(updateContent.text, updateContent.options);

        return {
          success: true,
          message: 'Contacts keyboard updated',
        };
      } else if (result.processedValue === 'NEW_CONTACT_MODE') {
        // Switch to text input mode for new contact
        console.log(
          '➕ MonthlySubscriptionCommand: Switching to new contact input mode',
        );

        // Present new contact input interface
        const newContactContent = presentNewContactInput(stepContext);
        await this.editLastMessage(
          newContactContent.text,
          newContactContent.options,
        );

        // Keep the same step but mark that we're in text input mode
        session.commandData.isNewContactMode = true;
        await this.saveSession(session);

        return {
          success: true,
          message: 'Switched to new contact input mode',
        };
      } else if (
        result.processedValue && typeof result.processedValue === 'string'
      ) {
        // Final contact selection - complete the step
        const contactName = result.processedValue as string;
        session.transactionData.family = contactName;
        session.step = STEPS.Amount;

        console.log(
          '✅ MonthlySubscriptionCommand: Person name completed:',
          contactName,
        );

        await this.saveSession(session);

        // Show confirmation with keyboard removed
        const confirmationContent = presentPersonNameConfirmation(
          stepContext,
          contactName,
        );
        await this.editLastMessage(
          confirmationContent.text,
          confirmationContent.options,
        );

        // Continue to next step
        await this.sendAmountPromptWithStep();

        return {
          success: true,
          message: 'Person name selected for quote',
        };
      } else {
        // Handle other valid callbacks (like noop)
        return {
          success: true,
          message: 'Callback processed',
        };
      }
    } else {
      console.log(
        '❌ MonthlySubscriptionCommand: Person name callback failed:',
        result.error,
      );
      return {
        success: false,
        message: result.error || 'Invalid person name selection',
      };
    }
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

      // Show confirmation with explicit keyboard removal
      const confirmationContent = presentAmountConfirmation(
        stepContext,
        result.processedValue as number,
      );
      await this.sendMessage(
        confirmationContent.text,
        confirmationContent.options,
      );

      // Continue to next step
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

  // PeriodStep callback handler (month + year + confirm)
  private async handlePeriodSelectionWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 MonthlySubscriptionCommand: Processing period selection:',
      callbackData,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Process callback using PeriodStep
    const callbackQuery = this.context.callbackQuery!;
    const result = await periodStep.processCallback(callbackQuery, stepContext);

    if (result.success) {
      // Check if this is a final confirm or just a keyboard update
      if (result.processedValue === 'update_keyboard') {
        // Month or year selection - update keyboard without completing step
        console.log(
          '🔄 MonthlySubscriptionCommand: Updating period keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const updateContent = presentPeriodUpdate(stepContext, callbackData);
        await this.editLastMessage(updateContent.text, updateContent.options);

        return {
          success: true,
          message: 'Period keyboard updated',
        };
      } else {
        // Final confirmation - complete the step
        session.transactionData.period = result.processedValue as string;
        console.log(
          '✅ MonthlySubscriptionCommand: Period completed:',
          result.processedValue,
        );

        await this.saveSession(session);

        // Show confirmation with keyboard removed
        const confirmationContent = presentPeriodConfirmation(
          stepContext,
          result.processedValue!,
        );
        await this.editLastMessage(
          confirmationContent.text,
          confirmationContent.options,
        );

        // Complete the transaction (no more steps needed)
        return await this.completeQuote(session);
      }
    } else {
      console.log(
        '❌ MonthlySubscriptionCommand: Period selection failed:',
        result.error,
      );
      // For callback errors, we typically send a new message
      const errorContent = periodStep.presentError(
        stepContext,
        result.error || 'Errore nella selezione del periodo',
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return {
        success: false,
        message: result.error || 'Invalid period selection',
      };
    }
  }

  /**
   * Completion handler - finalizes the transaction after all steps are completed
   * This is NOT a step, but the business logic that runs after input collection
   */
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

    const content = await amountStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 MonthlySubscriptionCommand: AmountStep presented');
  }

  // UI Helper methods
  private async sendPersonNamePromptWithStep(): Promise<void> {
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for person name prompt');
    }

    console.log(
      '🔍 MonthlySubscriptionCommand: Current session before PersonNameStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await personNameStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 MonthlySubscriptionCommand: PersonNameStep presented');
  }

  // 📝 ORIGINAL: PeriodStep method (kept for reference)
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

    const content = await periodStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 MonthlySubscriptionCommand: PeriodStep presented');
  }

  private async sendNotification(
    transactionPayload: Record<string, unknown>,
    transactionId: number,
  ): Promise<void> {
    const notificationMessage =
      `🔔 ${boldMarkdownV2('Quota Mensile Registrata')}\n` +
      `Versati ${
        formatCurrencyMarkdownV2(transactionPayload.amount as number)
      } come quota di ${
        boldMarkdownV2(
          getMonthByNumber(transactionPayload.month as string)?.full || '',
        )
      } ${boldMarkdownV2(transactionPayload.year as string)} per ${
        boldMarkdownV2(transactionPayload.family as string)
      }\n` +
      `Registrato da: ${
        boldMarkdownV2(transactionPayload.recorded_by as string)
      }\n` +
      `Grazie da EnB`;

    // Send confirmation message to the chat where the command was issued
    await this.sendMessage(notificationMessage, { parse_mode: 'MarkdownV2' });

    console.log(`✅ Quota notification sent for transaction ${transactionId}`);
  }

  override getHelpText(): string {
    return '/quota - Registra una quota mensile';
  }

  override getDescription(): string {
    return MonthlySubscriptionCommand.description;
  }
}
