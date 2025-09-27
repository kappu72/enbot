// Income command implementation - handles all types of income transactions
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import {
  createCategoryStep,
  createCategoryUpdatePresenter,
} from '../steps/category-step.ts';
import {
  personNameStep,
  presentNewContactInput,
  saveNewContact,
  updateContactsKeyboard,
} from '../steps/person-name-step.ts';
import { amountStep } from '../steps/amount-step.ts';
import { descriptionStep } from '../steps/description-step.ts';
import { periodStep } from '../steps/period-step.ts';
import { presentPeriodUpdate } from '../steps/period-step.ts';
import type { StepContext } from '../steps/step-types.ts';
import {
  boldMarkdownV2,
  formatCurrencyMarkdownV2,
} from '../utils/markdown-utils.ts';
import { getMonthByNumber } from '../utils/date-utils.ts';

enum STEPS {
  'Category' = 'category',
  'PersonName' = 'person-name',
  'Amount' = 'amount',
  'Description' = 'description',
  'Period' = 'period',
}

export class IncomeCommand extends BaseCommand {
  static commandName = 'entrata';
  static description = '💰 Registra una nuova entrata';
  private readonly messagePrefix = '__entrata:';

  constructor(context: CommandContext) {
    super(context, IncomeCommand.commandName);
  }

  /**
   * Check if the current category requires a description step
   */
  private requiresDescriptionStep(categoryName: string): boolean {
    return categoryName === 'Eventi' || categoryName === 'Altro';
  }

  protected async handleTextInput(text: string): Promise<CommandResult> {
    const session = await this.loadCommandSession();
    if (!session) {
      return { success: false, message: 'Nessuna sessione trovata' };
    }
    switch (session.step) {
      case STEPS.PersonName:
        return await this.handlePersonNameSelectionWithStep(text, session);
      case STEPS.Amount:
        return await this.handleAmountInputWithStep(text, session);
      case STEPS.Description:
        return await this.handleDescriptionInputWithStep(text, session);
      default:
        return {
          success: false,
          message: "Passo non valido per l'inserimento di un'entrata",
        };
    }
  }

  protected async handleCallbackData(
    data: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    // Handle CategoryStep callbacks (category_, category_page_)
    if (
      session.step === STEPS.Category &&
      (data.startsWith('category_') ||
        data.startsWith('category_page_'))
    ) {
      return await this.handleCategorySelectionWithStep(
        data,
        session,
      );
    }

    // Handle PersonNameStep callbacks (contact:)
    if (
      session.step === STEPS.PersonName &&
      data.startsWith('contact:')
    ) {
      return await this.handlePersonNameCallbackWithStep(
        data,
        session,
      );
    }

    // Handle PeriodStep callbacks (month:, year:)
    if (
      session.step === STEPS.Period &&
      (data.startsWith('month:') ||
        data.startsWith('year:'))
    ) {
      return await this.handlePeriodSelectionWithStep(
        data,
        session,
      );
    }

    return {
      success: false,
      message: `Unknown callback data ${data}`,
    };
  }

  protected async startCommand(): Promise<CommandResult> {
    // Clean any existing session with message cleanup
    await this.deleteUserSessionWithCleanup(true, false);

    // Initialize new income session
    const session: CommandSession = {
      chatId: this.context.chatId,
      userId: this.context.userId,
      step: STEPS.Category,
      transactionData: {},
      commandType: this.commandName,
      commandData: {},
    };

    const sessionId = await this.saveSession(session);

    // Track the initial command message now that we have a session
    if (this.context.message?.message_id && sessionId) {
      await this.trackIncomingMessageBySessionId(
        sessionId,
        this.context.message.message_id,
      );
    }

    // Start with category selection
    const categoryStep = createCategoryStep('income');
    const stepContext: StepContext = {
      ...this.context,
      session,
    };
    const content = await categoryStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 IncomeCommand: CategoryStep presented');

    return { success: true, message: 'Income started' };
  }

  private async handleCategorySelectionWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 IncomeCommand: Processing category selection:',
      callbackData,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Process callback using CategoryStep
    const callbackQuery = this.context.callbackQuery!;
    const categoryStep = createCategoryStep('income');
    const result = await categoryStep.processCallback(
      callbackQuery,
      stepContext,
    );

    if (result.success) {
      if (result.processedValue === -1) {
        // Page navigation - update keyboard without completing step
        console.log(
          '🔄 IncomeCommand: Updating category keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const presentCategoryUpdate = createCategoryUpdatePresenter('income');
        const updateContent = await presentCategoryUpdate(
          stepContext,
          callbackData,
        );
        await this.editLastMessage(updateContent.text, updateContent.options);

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          '',
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return {
          success: true,
          message: 'Category keyboard updated',
        };
      } else if (
        typeof result.processedValue === 'number' && result.processedValue > 0
      ) {
        // Final category selection - complete the step
        const categoryId = result.processedValue;

        // Fetch category name from database
        const { data: category, error } = await this.context.supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (error || !category) {
          console.error('Error fetching category:', error);
          return { success: false, message: 'Category not found' };
        }

        session.transactionData.category = category.name;
        session.commandData.categoryId = categoryId;
        session.step = STEPS.PersonName;

        console.log(
          '✅ IncomeCommand: Category completed:',
          category.name,
        );

        await this.saveSession(session);

        // Show confirmation with keyboard removed
        const confirmationContent = categoryStep.presentConfirmation(
          stepContext,
          categoryId,
        );
        await this.editLastMessage(
          confirmationContent.text,
          confirmationContent.options,
        );

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          `Categoria selezionata: ${category.name}`,
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        // Continue to next step
        await this.sendPersonNamePromptWithStep();

        return {
          success: true,
          message: 'Category selected for income',
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
        '❌ IncomeCommand: Category selection failed:',
        result.error,
      );
      return {
        success: false,
        message: result.error || 'Invalid category selection',
      };
    }
  }

  private async handlePersonNameSelectionWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 IncomeCommand: Processing person name input:',
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
          '➕ IncomeCommand: Saving new contact:',
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
      // Show confirmation with keyboard removed
      const confirmationContent = personNameStep.presentConfirmation(
        stepContext,
        contactName,
      );
      await this.editLastMessage(
        confirmationContent.text,
        confirmationContent.options,
      );
      await this.sendAmountPromptWithStep();
      return { success: true, message: 'Person name selected for income' };
    } else {
      console.log(
        '❌ IncomeCommand: Person name validation failed:',
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
      '🔍 IncomeCommand: Processing person name selection:',
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
          '🔄 IncomeCommand: Updating contacts keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const updateContent = await updateContactsKeyboard(
          stepContext,
          callbackData,
        );
        await this.editLastMessage(updateContent.text, updateContent.options);

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          '',
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return {
          success: true,
          message: 'Contacts keyboard updated',
        };
      } else if (result.processedValue === 'NEW_CONTACT_MODE') {
        // Switch to text input mode for new contact
        console.log(
          '➕ IncomeCommand: Switching to new contact input mode',
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
          '✅ IncomeCommand: Person name completed:',
          contactName,
        );

        await this.saveSession(session);

        // Show confirmation with keyboard removed
        const confirmationContent = personNameStep.presentConfirmation(
          stepContext,
          contactName,
        );
        await this.editLastMessage(
          confirmationContent.text,
          confirmationContent.options,
        );

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          `Contatto selezionato: ${contactName}`,
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        // Continue to next step
        await this.sendAmountPromptWithStep();

        return {
          success: true,
          message: 'Person name selected for income',
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
        '❌ IncomeCommand: Person name callback failed:',
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
      '🔍 IncomeCommand: Processing amount input:',
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

      // Check if we need description step based on category
      const categoryName = session.transactionData.category as string;
      if (this.requiresDescriptionStep(categoryName)) {
        session.step = STEPS.Description;
      } else {
        session.step = STEPS.Period;
      }

      await this.saveSession(session);

      // Show confirmation with explicit keyboard removal
      const confirmationContent = amountStep.presentConfirmation(
        stepContext,
        result.processedValue as number,
      );
      await this.sendMessage(
        confirmationContent.text,
        confirmationContent.options,
      );

      // Continue to next step
      if (this.requiresDescriptionStep(categoryName)) {
        await this.sendDescriptionPromptWithStep();
      } else {
        await this.sendPeriodPromptWithStep();
      }
      return { success: true, message: 'Amount entered for income' };
    } else {
      console.log(
        '❌ IncomeCommand: Amount validation failed:',
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

  private async handleDescriptionInputWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 IncomeCommand: Processing description input:',
      text,
    );

    // Create StepContext from current command context
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Process input using DescriptionStep
    const result = descriptionStep.processInput(text, stepContext);

    if (result.success) {
      // Save the description in session (can be empty string)
      session.transactionData.description = result.processedValue as string;
      session.step = STEPS.Period;

      await this.saveSession(session);

      // Show confirmation with explicit keyboard removal
      const confirmationContent = descriptionStep.presentConfirmation(
        stepContext,
        result.processedValue as string,
      );
      await this.sendMessage(
        confirmationContent.text,
        confirmationContent.options,
      );

      // Continue to next step
      await this.sendPeriodPromptWithStep();
      return { success: true, message: 'Description entered for income' };
    } else {
      console.log(
        '❌ IncomeCommand: Description validation failed:',
        result.error,
      );
      // Present error using DescriptionStep's error presenter
      const errorContent = descriptionStep.presentError(
        stepContext,
        result.error || 'Errore nella validazione della descrizione',
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return { success: false, message: result.error || 'Invalid description' };
    }
  }

  // PeriodStep callback handler (month + year + confirm)
  private async handlePeriodSelectionWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 IncomeCommand: Processing period selection:',
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
          '🔄 IncomeCommand: Updating period keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const updateContent = presentPeriodUpdate(stepContext, callbackData);
        await this.editLastMessage(updateContent.text, updateContent.options);

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          '',
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return {
          success: true,
          message: 'Period keyboard updated',
        };
      } else {
        // Final confirmation - complete the step
        session.transactionData.period = result.processedValue as string;
        console.log(
          '✅ IncomeCommand: Period completed:',
          result.processedValue,
        );

        await this.saveSession(session);

        // Show confirmation with keyboard removed
        const confirmationContent = periodStep.presentConfirmation(
          stepContext,
          result.processedValue!,
        );
        await this.editLastMessage(
          confirmationContent.text,
          confirmationContent.options,
        );

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          'Periodo confermato',
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        // Complete the transaction (no more steps needed)
        return await this.completeIncome(session);
      }
    } else {
      console.log(
        '❌ IncomeCommand: Period selection failed:',
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
  private async completeIncome(
    session: CommandSession,
  ): Promise<CommandResult> {
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
        console.error('Error saving income transaction:', error);
        await this.sendMessage(
          "❌ Errore durante il salvataggio dell'entrata\\. Riprova\\.",
          { parse_mode: 'MarkdownV2' },
        );
        return { success: false, message: 'Database error' };
      }

      // Delete session after successful completion with message cleanup
      // Preserve the last notification message
      await this.deleteSessionWithCleanup(true, true);

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
            '⚠️ Entrata salvata ma sincronizzazione con Google Sheets fallita\\. Verrà ritentata automaticamente\\.',
            { parse_mode: 'MarkdownV2' },
          );
        }
      } else {
        console.log(
          `✅ Transaction ${transactionId} synced to Google Sheets successfully`,
        );
      }

      await this.sendNotification(transactionPayload, transactionId);

      return { success: true, message: 'Income completed successfully' };
    } catch (error) {
      console.error('Error completing income:', error);
      await this.sendMessage(
        "❌ Errore durante il completamento dell'entrata\\.",
        { parse_mode: 'MarkdownV2' },
      );
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
      '🔍 IncomeCommand: Current session before AmountStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await amountStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 IncomeCommand: AmountStep presented');
  }

  private async sendDescriptionPromptWithStep(): Promise<void> {
    // Create StepContext for presenting the description step
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for description prompt');
    }

    console.log(
      '🔍 IncomeCommand: Current session before DescriptionStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = descriptionStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 IncomeCommand: DescriptionStep presented');
  }

  // UI Helper methods
  private async sendPersonNamePromptWithStep(): Promise<void> {
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for person name prompt');
    }

    console.log(
      '🔍 IncomeCommand: Current session before PersonNameStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await personNameStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 IncomeCommand: PersonNameStep presented');
  }

  // PeriodStep method
  private async sendPeriodPromptWithStep(): Promise<void> {
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for period prompt');
    }

    console.log(
      '🔍 IncomeCommand: Current session before PeriodStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await periodStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 IncomeCommand: PeriodStep presented');
  }

  private async sendNotification(
    transactionPayload: Record<string, unknown>,
    transactionId: number,
  ): Promise<void> {
    const monthName =
      getMonthByNumber(transactionPayload.month as string)?.full || '';
    const categoryName = transactionPayload.category as string;
    const familyName = transactionPayload.family as string;
    const recordedBy = transactionPayload.recorded_by as string;

    const notificationMessage =
      `🔔  ${boldMarkdownV2('Entrata Registrata')}\n\n` +
      `Ricevuti *${
        formatCurrencyMarkdownV2(transactionPayload.amount as number)
      }* per ${boldMarkdownV2(categoryName)} di ${boldMarkdownV2(monthName)} ${
        boldMarkdownV2(transactionPayload.year as string)
      } da ${boldMarkdownV2(familyName)}\n\n` +
      `Registrato da: ${boldMarkdownV2(recordedBy)}\n\n` +
      `Grazie da EnB`;

    // Send confirmation message to the chat where the command was issued
    // Mark this as the last message to preserve during cleanup
    await this.sendMessage(
      notificationMessage,
      { parse_mode: 'MarkdownV2' },
      true,
    );

    console.log(`✅ Income notification sent for transaction ${transactionId}`);
  }

  override getHelpText(): string {
    return '/entrata - Registra una nuova entrata';
  }

  override getDescription(): string {
    return IncomeCommand.description;
  }
}
