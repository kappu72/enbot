// CreditNote command implementation - handles all types of credit note transactions
import type {
  CommandContext,
  CommandResult,
  CommandSession,
} from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
// Removed unused imports: TelegramCallbackQuery, TelegramMessage
import {
  createCategoryStep,
  createCategoryUpdatePresenter,
} from '../steps/category-step.ts';
import {
  getRequiredRoles,
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
  escapeMarkdownV2,
  formatCurrencyMarkdownV2,
} from '../utils/markdown-utils.ts';

enum STEPS {
  'Category' = 'category',
  'PersonName' = 'person-name',
  'Amount' = 'amount',
  'Description' = 'description',
  'Period' = 'period',
}

export class CreditNoteCommand extends BaseCommand {
  static commandName = 'notacredito';
  static description = '📄↩️ Registra una nuova nota di credito';
  static emoji = '📄↩️';
  private readonly messagePrefix = '__notacredito:';

  constructor(context: CommandContext) {
    super(context, CreditNoteCommand.commandName);
  }

  override getDescription(): string {
    return CreditNoteCommand.description;
  }
  /**
   * Check if the current category requires a description step
   */
  private requiresDescriptionStep(categoryName: string): boolean {
    return categoryName === 'Spese Varie';
  }

  getHelpText(): string {
    return `📄 ${CreditNoteCommand.description}\n\n` +
      `Questo comando ti permette di registrare una nota di credito.\n\n` +
      `Flusso:\n` +
      `1. Seleziona la categoria\n` +
      `2. Inserisci il nome della persona\n` +
      `3. Inserisci l'importo\n` +
      `4. Inserisci descrizione (solo per "Spese Varie")\n\n` +
      `Usa /${CreditNoteCommand.commandName} per iniziare.`;
  }

  protected async handleTextInput(text: string): Promise<CommandResult> {
    const session = await this.loadCommandSession();
    if (!session) {
      return { success: false, message: 'Nessuna sessione trovata' };
    }
    switch (session.step) {
      case STEPS.PersonName:
        return await this.handlePersonNameInputWithStep(text, session);
      case STEPS.Amount:
        return await this.handleAmountInputWithStep(text, session);
      case STEPS.Description:
        return await this.handleDescriptionInputWithStep(text, session);
      case STEPS.Period:
        return await this.handlePeriodInputWithStep(text, session);
      default:
        return {
          success: false,
          message: "Passo non valido per l'inserimento di una nota di credito",
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

    // Initialize new credit note session
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
    const categoryStep = createCategoryStep('creditNote');
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await categoryStep.present(stepContext);
    await this.sendMessage(content.text, content.options);

    return { success: true, message: 'Credit note started' };
  }

  private async handleCategorySelectionWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const categoryStep = createCategoryStep('creditNote');
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const callbackQuery = this.context.callbackQuery!;
    const result = await categoryStep.processCallback(
      callbackQuery,
      stepContext,
    );

    if (result.success) {
      if (result.processedValue === -1) {
        // Page navigation - update keyboard without completing step
        console.log(
          '🔄 CreditNoteCommand: Updating category keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const presentCategoryUpdate = createCategoryUpdatePresenter(
          'creditNote',
        );
        const updateContent = await presentCategoryUpdate(
          stepContext,
          callbackData,
        );
        await this.editLastMessage(updateContent.text, updateContent.options);

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          undefined, // No message for pagination
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

        // Save category in session
        session.transactionData.category = category.name;
        session.step = STEPS.PersonName;
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
          `Categoria selezionata: ${escapeMarkdownV2(category.name)}`,
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return await this.sendPersonNamePromptWithStep(session);
      }
    }

    return result;
  }

  private async handlePersonNameCallbackWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const callbackQuery = this.context.callbackQuery!;
    const result = await personNameStep.processCallback(
      callbackQuery,
      stepContext,
    );

    if (result.success) {
      if (result.processedValue === 'UPDATE_KEYBOARD') {
        // Page navigation - update keyboard without completing step
        console.log(
          '🔄 CreditNoteCommand: Updating contacts keyboard:',
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
          undefined, // No message for pagination
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return {
          success: true,
          message: 'Person name keyboard updated',
        };
      } else if (result.processedValue === 'NEW_CONTACT_MODE') {
        // Switch to text input mode for new contact
        console.log(
          '➕ CreditNoteCommand: Switching to new contact input mode',
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
          message: 'New contact input mode activated',
        };
      } else if (
        typeof result.processedValue === 'string' &&
        result.processedValue !== 'UPDATE_KEYBOARD'
      ) {
        // Person selected, move to amount step
        const contactName = result.processedValue;
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

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          `Contatto selezionato: ${escapeMarkdownV2(contactName)}`,
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return await this.sendAmountPromptWithStep(session);
      }
    }

    return result;
  }

  private async handlePersonNameInputWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    // Check if we're in new contact mode
    if (session.commandData.isNewContactMode) {
      const contactName = text.trim();

      console.log(
        '➕ CreditNoteCommand: Saving new contact:',
        contactName,
      );

      // Get required roles for the current command and category
      const commandType = stepContext.session.commandType;
      const categoryName = stepContext.session.commandData?.category as string;
      const requiredRoles = getRequiredRoles(commandType, categoryName);

      const saved = await saveNewContact(
        stepContext,
        contactName,
        requiredRoles,
      );
      if (!saved) {
        const errorContent = personNameStep.presentError(
          stepContext,
          escapeMarkdownV2(
            '❌ Errore nel salvataggio del nuovo contatto. Riprova.',
          ),
        );
        await this.sendMessage(errorContent.text, errorContent.options);
        return { success: false, message: 'Failed to save new contact' };
      }

      // Clear new contact mode and save contact name
      session.commandData.isNewContactMode = false;
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
      await this.sendAmountPromptWithStep(session);
      return { success: true, message: 'Person name selected for credit note' };
    } else {
      const result = await personNameStep.processInput(text, stepContext);

      if (result.success) {
        // Person name saved, move to amount step
        session.step = STEPS.Amount;
        await this.saveSession(session);
        return await this.sendAmountPromptWithStep(session);
      } else {
        // Present error using PersonNameStep's error presenter
        const errorContent = personNameStep.presentError(
          stepContext,
          result.error || 'Error in person name validation',
        );
        await this.sendMessage(errorContent.text, errorContent.options);
        return {
          success: false,
          message: result.error || 'Invalid person name',
        };
      }
    }
  }

  private async handleAmountInputWithStep(
    text: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const result = await amountStep.processInput(text, stepContext);

    if (result.success) {
      // Save the validated amount in session
      session.transactionData.amount = result.processedValue;

      // Check if we need description step based on category
      const categoryName = session.transactionData.category as string;
      if (this.requiresDescriptionStep(categoryName)) {
        session.step = STEPS.Description;
      } else {
        // Skip description, go to period step
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
        return await this.sendDescriptionPromptWithStep(session);
      } else {
        await this.sendPeriodPromptWithStep();
        return { success: true, message: 'Amount entered for credit note' };
      }
    } else {
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
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const result = await descriptionStep.processInput(text, stepContext);

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

      // Go to period step
      await this.sendPeriodPromptWithStep();
      return { success: true, message: 'Description entered for credit note' };
    } else {
      // Present error using DescriptionStep's error presenter
      const errorContent = descriptionStep.presentError(
        stepContext,
        result.error || 'Errore nella validazione della descrizione',
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return { success: false, message: result.error || 'Invalid description' };
    }
  }

  private async sendPersonNamePromptWithStep(
    session: CommandSession,
  ): Promise<CommandResult> {
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await personNameStep.present(stepContext);
    await this.sendMessage(content.text, content.options);

    return { success: true, message: 'Person name prompt sent' };
  }

  private async sendAmountPromptWithStep(
    session: CommandSession,
  ): Promise<CommandResult> {
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await amountStep.present(stepContext);
    await this.sendMessage(content.text, content.options);

    return { success: true, message: 'Amount prompt sent' };
  }

  private async sendDescriptionPromptWithStep(
    session: CommandSession,
  ): Promise<CommandResult> {
    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await descriptionStep.present(stepContext);
    await this.sendMessage(content.text, content.options);

    return { success: true, message: 'Description prompt sent' };
  }

  private async completeTransaction(
    session: CommandSession,
  ): Promise<CommandResult> {
    try {
      const { transactionData } = session;

      // Validate required data
      if (
        !transactionData.category || !transactionData.family ||
        !transactionData.amount
      ) {
        return { success: false, message: 'Missing required transaction data' };
      }

      // Create transaction payload using the same format as income/outcome commands
      const transactionPayload = this.getTransactionPayload(session);

      // Save transaction to database using the same schema as income/outcome
      const transaction = {
        payload: transactionPayload,
        created_by_user_id: this.context.userId,
        command_type: session.commandType,
        is_synced: false,
        chat_id: this.context.chatId,
      };

      const { data: _data, error } = await this.context.supabase
        .from('transactions')
        .insert(transaction)
        .select('id')
        .single();

      if (error) {
        console.error('Error saving credit note transaction:', error);
        await this.sendMessage(
          escapeMarkdownV2(
            `⚠️ Entrata salvata ma sincronizzazione con Google Sheets fallita.
             Verrà ritentata automaticamente.`,
          ),
          { parse_mode: 'MarkdownV2' },
        );
        return { success: false, message: 'Database error' };
      }

      // Delete session after successful completion with message cleanup
      // Preserve the last notification message
      await this.deleteSessionWithCleanup(true, true);

      const transactionId = _data.id;

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
            escapeMarkdownV2(
              `⚠️ Nota di credito salvata ma sincronizzazione con Google Sheets fallita.
             Verrà ritentata automaticamente.`,
            ),
            { parse_mode: 'MarkdownV2' },
          );
        }
      } else {
        console.log(
          `✅ Transaction ${transactionId} synced to Google Sheets successfully`,
        );
      }

      // Send notification message
      await this.sendCreditNoteNotification(transactionPayload, transactionId);

      return {
        success: true,
        message: 'Credit note transaction completed successfully',
      };
    } catch (error) {
      console.error('Error completing credit note transaction:', error);
      return { success: false, message: 'Failed to complete transaction' };
    }
  }

  // PeriodStep callback handler (month + year + confirm)
  private async handlePeriodSelectionWithStep(
    callbackData: string,
    session: CommandSession,
  ): Promise<CommandResult> {
    console.log(
      '🔍 CreditNoteCommand: Processing period selection:',
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
          '🔄 CreditNoteCommand: Updating period keyboard:',
          callbackData,
        );

        // Update the message with new keyboard state
        const updateContent = presentPeriodUpdate(stepContext, callbackData);
        await this.editLastMessage(updateContent.text, updateContent.options);

        // Answer the callback query
        await this.answerCallbackQuery(
          callbackQuery.id,
          undefined, // No message for pagination
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
          '✅ CreditNoteCommand: Period completed:',
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
        return await this.completeTransaction(session);
      }
    } else {
      console.log(
        '❌ CreditNoteCommand: Period selection failed:',
        result.error,
      );
      // For callback errors, we typically send a new message
      const errorContent = periodStep.presentError(
        stepContext,
        result.error || 'Errore nella selezione del periodo',
      );
      await this.sendMessage(errorContent.text, errorContent.options);
      return { success: false, message: result.error || 'Invalid period' };
    }
  }

  // PeriodStep text input handler (should not be used as PeriodStep only uses callbacks)
  private handlePeriodInputWithStep(
    _text: string,
    _session: CommandSession,
  ): CommandResult {
    // PeriodStep only uses callbacks, not text input
    return {
      success: false,
      message: 'Period selection only works with inline keyboard buttons',
    };
  }

  // PeriodStep method
  private async sendPeriodPromptWithStep(): Promise<void> {
    const session = await this.loadCommandSession();
    if (!session) {
      throw new Error('No session found for period prompt');
    }

    console.log(
      '🔍 CreditNoteCommand: Current session before PeriodStep:',
      session,
    );

    const stepContext: StepContext = {
      ...this.context,
      session,
    };

    const content = await periodStep.present(stepContext);
    await this.sendMessage(content.text, content.options);
    console.log('🔍 CreditNoteCommand: PeriodStep presented');
  }

  /**
   * Send notification message after successful credit note completion
   */
  private async sendCreditNoteNotification(
    transactionPayload: Record<string, unknown>,
    transactionId: number,
  ): Promise<void> {
    const categoryName = transactionPayload.category as string;
    const familyName = transactionPayload.family as string;
    const recordedBy = transactionPayload.recorded_by as string;
    const description = transactionPayload.description as string;

    const notificationMessage =
      `🔔  ${boldMarkdownV2('Nota di Credito Registrata')}\n\n` +
      `📄 ${boldMarkdownV2('Categoria')}: ${
        boldMarkdownV2(escapeMarkdownV2(categoryName))
      }\n` +
      `👤 ${boldMarkdownV2('Persona')}: ${boldMarkdownV2(familyName)}\n` +
      `💰 ${boldMarkdownV2('Importo')}: ${
        formatCurrencyMarkdownV2(transactionPayload.amount as number)
      }\n` +
      (description && description.trim()
        ? `📝 ${boldMarkdownV2('Descrizione')}: ${
          boldMarkdownV2(escapeMarkdownV2(description))
        }\n\n`
        : '') +
      `\nRegistrato da: ${boldMarkdownV2(recordedBy)}\n\n` +
      `Grazie da EnB`;

    // Send confirmation message to the chat where the command was issued
    // Mark this as the last message to preserve during cleanup
    await this.sendMessage(
      notificationMessage,
      { parse_mode: 'MarkdownV2' },
      true,
    );

    console.log(
      `✅ Credit note notification sent for transaction ${transactionId}`,
    );
  }
}
