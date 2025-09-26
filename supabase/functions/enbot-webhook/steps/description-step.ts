// Description step implementation for income transactions
import type { StepContext, StepResult } from './step-types.ts';
import { boldMarkdownV2, escapeMarkdownV2 } from '../utils/markdown-utils.ts';

export interface DescriptionStepResult extends StepResult {
  processedValue?: string;
}

export const descriptionStep = {
  /**
   * Present the description input prompt
   */
  present(context: StepContext): {
    text: string;
    options: Record<string, unknown>;
  } {
    const categoryName = context.session.transactionData.category as string;

    const message = getMessageTitle(context) +
      `Inserisci una descrizione per la categoria ${
        boldMarkdownV2(categoryName)
      }\\.\n\n` +
      `Puoi lasciare vuoto premendo invio o scrivere una descrizione dettagliata\\.`;

    return {
      text: message,
      options: {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Descrizione (opzionale)',
          selective: true,
        },
      },
    };
  },

  /**
   * Process text input for description
   */
  processInput(
    text: string,
    _context: StepContext,
  ): DescriptionStepResult {
    // Description is optional, so we accept any text including empty string
    const description = text.trim();

    return {
      success: true,
      processedValue: description,
    };
  },

  /**
   * Present confirmation of the entered description
   */
  presentConfirmation(
    context: StepContext,
    description: string,
  ): {
    text: string;
    options: Record<string, unknown>;
  } {
    const categoryName = context.session.transactionData.category as string;

    let message: string;
    if (description) {
      message = `✅ ${boldMarkdownV2('Descrizione confermata')}\n\n` +
        `Categoria: ${boldMarkdownV2(categoryName)}\n` +
        `Descrizione: ${boldMarkdownV2(description)}`;
    } else {
      message = `✅ ${boldMarkdownV2('Descrizione confermata')}\n\n` +
        `Categoria: ${boldMarkdownV2(categoryName)}\n` +
        `Descrizione: ${boldMarkdownV2('Nessuna descrizione')}`;
    }

    return {
      text: message,
      options: {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          remove_keyboard: true,
        },
      },
    };
  },

  /**
   * Present error message
   */
  presentError(
    context: StepContext,
    errorMessage: string,
  ): {
    text: string;
    options: Record<string, unknown>;
  } {
    const message = getMessageTitle(context) +
      `${escapeMarkdownV2(errorMessage)}\n\n` +
      `📝 Riprova inserendo una descrizione o premi invio per saltare\\.`;

    return {
      text: message,
      options: {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Descrizione (opzionale)',
          selective: true,
        },
      },
    };
  },
};

const getMessageTitle = (context: StepContext): string => {
  // Get username for mention from context
  const mention = context.username ? `@${context.username} ` : '';
  return `${escapeMarkdownV2(mention)}   📝 ${
    boldMarkdownV2('Descrizione')
  }\n\n`;
};
