// CreditNote command implementation - handles all types of credit note transactions
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
  updateContactsKeyboard,
} from '../steps/person-name-step.ts';
import { amountStep } from '../steps/amount-step.ts';
import { descriptionStep } from '../steps/description-step.ts';
import type { StepContext } from '../steps/step-types.ts';
import {
  boldMarkdownV2,
  formatCurrencyMarkdownV2,
} from '../utils/markdown-utils.ts';

enum STEPS {
  'Category' = 'category',
  'PersonName' = 'person-name',
  'Amount' = 'amount',
  'Description' = 'description',
}

export class CreditNoteCommand extends BaseCommand {
  static commandName = 'notacredito';
  static description = '📄 Registra una nuova nota di credito';
  private readonly messagePrefix = '__notacredito:';

  constructor(context: CommandContext) {
    super(context, CreditNoteCommand.commandName);
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

        // Save category in session
        session.transactionData.category = category.name;
        session.step = STEPS.PersonName;
        await this.saveSession(session);

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
          '',
          callbackQuery.message?.chat.id,
          callbackQuery.message?.message_id,
        );

        return {
          success: true,
          message: 'Person name keyboard updated',
        };
      } else if (
        typeof result.processedValue === 'string' &&
        result.processedValue !== 'UPDATE_KEYBOARD'
      ) {
        // Person selected, move to amount step
        session.transactionData.family = result.processedValue;
        session.step = STEPS.Amount;
        await this.saveSession(session);
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

    const result = await personNameStep.processInput(text, stepContext);

    if (result.success) {
      // Person name saved, move to amount step
      session.step = STEPS.Amount;
      await this.saveSession(session);
      return await this.sendAmountPromptWithStep(session);
    }

    return result;
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
      // Amount saved, check if we need description step
      const categoryName = session.transactionData.category as string;
      if (this.requiresDescriptionStep(categoryName)) {
        // Move to description step
        session.step = STEPS.Description;
        await this.saveSession(session);
        return await this.sendDescriptionPromptWithStep(session);
      } else {
        // Skip description, complete the transaction
        return await this.completeTransaction(session);
      }
    }

    return result;
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
      // Description saved, complete the transaction
      return await this.completeTransaction(session);
    }

    return result;
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

      // Get category ID from database
      const { data: categoryData, error: categoryError } = await this.context
        .supabase
        .from('categories')
        .select('id')
        .eq('name', transactionData.category as string)
        .single();

      if (categoryError || !categoryData) {
        return { success: false, message: 'Category not found' };
      }

      // Save transaction to database
      const { data, error } = await this.context.supabase
        .from('transactions')
        .insert({
          user_id: session.userId,
          category_id: categoryData.id,
          person_name: transactionData.family as string,
          amount: transactionData.amount,
          description: transactionData.description || null,
          transaction_type: 'creditNote',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving credit note transaction:', error);
        return { success: false, message: 'Failed to save transaction' };
      }

      // Clear session
      await this.deleteUserSessionWithCleanup(false, true);

      // Format success message
      const categoryName = transactionData.category as string;
      const amount = formatCurrencyMarkdownV2(transactionData.amount);
      const personName = boldMarkdownV2(transactionData.family as string);
      const description = transactionData.description
        ? `\n\n📝 ${
          boldMarkdownV2('Descrizione')
        }: ${transactionData.description}`
        : '';

      const message = `✅ ${boldMarkdownV2('Nota di credito registrata')}\n\n` +
        `📄 ${boldMarkdownV2('Categoria')}: ${categoryName}\n` +
        `👤 ${boldMarkdownV2('Persona')}: ${personName}\n` +
        `💰 ${boldMarkdownV2('Importo')}: ${amount}${description}`;

      return {
        success: true,
        message: message,
      };
    } catch (error) {
      console.error('Error completing credit note transaction:', error);
      return { success: false, message: 'Failed to complete transaction' };
    }
  }
}
