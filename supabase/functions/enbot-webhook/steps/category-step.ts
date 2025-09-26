// Category step implementation using composition approach
import {
  type CallbackHandler,
  type ConfirmationPresenter,
  type ErrorPresenter,
  type InputPresenter,
  type InputValidator,
  Step,
  type StepContent,
  type StepContext,
} from './step-types.ts';
import type { TelegramCallbackQuery } from '../types.ts';
import { boldMarkdownV2, escapeMarkdownV2 } from '../utils/markdown-utils.ts';

// Category type definition
export interface Category {
  id: number;
  name: string;
  type: 'income' | 'outcome';
  description?: string;
  is_active: boolean;
  sort_order: number;
}

/**
 * Fetch categories from database by type
 */
async function fetchCategoriesByType(
  supabase: any,
  type: 'income' | 'outcome',
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

/**
 * Create inline keyboard for category selection (3x3 grid with navigation)
 */
function createCategoryKeyboard(
  categories: Category[],
  currentPage: number = 0,
  itemsPerPage: number = 9,
): { keyboard: any[][]; hasNext: boolean; hasPrev: boolean } {
  const keyboard: any[][] = [];
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageCategories = categories.slice(startIndex, endIndex);

  // Create 3x3 grid for categories
  for (let i = 0; i < pageCategories.length; i += 3) {
    const row = pageCategories.slice(i, i + 3).map((category) => ({
      text: category.name,
      callback_data: `category_${category.id}`,
    }));
    keyboard.push(row);
  }

  // Add navigation row if needed
  const hasNext = endIndex < categories.length;
  const hasPrev = currentPage > 0;

  if (hasNext || hasPrev) {
    const navRow = [];
    if (hasPrev) {
      navRow.push({
        text: '◀️ Indietro',
        callback_data: `category_page_${currentPage - 1}`,
      });
    }
    if (hasNext) {
      navRow.push({
        text: 'Avanti ▶️',
        callback_data: `category_page_${currentPage + 1}`,
      });
    }
    if (navRow.length > 0) {
      keyboard.push(navRow);
    }
  }

  return { keyboard, hasNext, hasPrev };
}

/**
 * Parse callback data to extract category ID or page number
 */
function parseCallbackData(callbackData: string): {
  type: 'category' | 'page';
  value: number;
} {
  if (callbackData.startsWith('category_')) {
    const categoryId = parseInt(callbackData.replace('category_', ''));
    return { type: 'category', value: categoryId };
  } else if (callbackData.startsWith('category_page_')) {
    const pageNumber = parseInt(callbackData.replace('category_page_', ''));
    return { type: 'page', value: pageNumber };
  }
  throw new Error('Invalid callback data');
}

/**
 * Simple validation for callback data (inline keyboard is controlled)
 */
export const validateCategory: InputValidator<number> = (
  callbackData: string,
) => {
  try {
    const parsed = parseCallbackData(callbackData);
    if (parsed.type === 'category') {
      return { valid: true, value: parsed.value };
    }
    // For page navigation, return success but no final value yet
    return { valid: true, value: undefined };
  } catch {
    return { valid: false, error: 'Invalid category selection' };
  }
};

/**
 * Present category selection interface
 */
const presentCategoryInput: InputPresenter = async (
  context: StepContext,
): Promise<StepContent> => {
  // Get category type from session data (should be set by previous step)
  const categoryType =
    context.session.commandData?.categoryType as 'income' | 'outcome' ||
    'outcome';

  const categories = await fetchCategoriesByType(
    context.supabase,
    categoryType,
  );

  if (categories.length === 0) {
    return {
      text: getMessageTitle(context) +
        `❌ ${
          escapeMarkdownV2(
            'Nessuna categoria disponibile per il tipo selezionato.',
          )
        }`,
      options: { parse_mode: 'MarkdownV2' },
    };
  }

  const { keyboard } = createCategoryKeyboard(categories, 0);

  const options = {
    reply_markup: {
      inline_keyboard: keyboard,
    },
    parse_mode: 'MarkdownV2',
  };

  const typeLabel = categoryType === 'income' ? 'Entrate' : 'Uscite';
  const text = getMessageTitle(context) +
    `📂 ${boldMarkdownV2('Seleziona categoria')} (${
      escapeMarkdownV2(typeLabel)
    })\n\n` +
    `👆 Scegli una categoria dalla lista`;

  return {
    text,
    options,
  };
};

/**
 * Handle category selection callbacks with pagination
 */
const handleCategoryCallback: CallbackHandler<number> = async (
  callbackQuery: TelegramCallbackQuery,
) => {
  const callbackData = callbackQuery.data!;

  try {
    const parsed = parseCallbackData(callbackData);

    if (parsed.type === 'category') {
      // Category selected - return the category ID
      return {
        valid: true,
        value: parsed.value,
        error: undefined,
      };
    } else if (parsed.type === 'page') {
      // Page navigation - return special value to indicate keyboard update needed
      return {
        valid: true,
        value: 'update_keyboard', // Special value to indicate keyboard update needed
        error: undefined,
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid category selection',
    };
  }

  return {
    valid: false,
    error: 'Invalid callback data',
  };
};

/**
 * Present updated category interface after page navigation
 */
export const presentCategoryUpdate = async (
  context: StepContext,
  callbackData: string,
): Promise<StepContent> => {
  try {
    const parsed = parseCallbackData(callbackData);

    if (parsed.type === 'page') {
      const pageNumber = parsed.value;
      const categoryType =
        context.session.commandData?.categoryType as 'income' | 'outcome' ||
        'outcome';

      const categories = await fetchCategoriesByType(
        context.supabase,
        categoryType,
      );
      const { keyboard, hasNext, hasPrev } = createCategoryKeyboard(
        categories,
        pageNumber,
      );

      const options = {
        reply_markup: {
          inline_keyboard: keyboard,
        },
        parse_mode: 'MarkdownV2',
      };

      const typeLabel = categoryType === 'income' ? 'Entrate' : 'Uscite';
      const text = getMessageTitle(context) +
        `📂 ${boldMarkdownV2('Seleziona categoria')} (${
          escapeMarkdownV2(typeLabel)
        })\n\n` +
        `📄 Pagina ${pageNumber + 1}\n` +
        `👆 Scegli una categoria dalla lista`;

      return {
        text,
        options,
      };
    }
  } catch (error) {
    console.error('Error in presentCategoryUpdate:', error);
  }

  // Fallback to initial presentation
  return await presentCategoryInput(context);
};

/**
 * Error presenter for category selection
 */
export const presentCategoryError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  const text = getMessageTitle(context) +
    `❌ ${escapeMarkdownV2(error)}\n\n` +
    `📂 ${escapeMarkdownV2('Riprova selezionando una categoria.')}`;

  return {
    text,
    options: { parse_mode: 'MarkdownV2' },
  };
};

/**
 * Present category selection confirmation
 */
export const presentCategoryConfirmation: ConfirmationPresenter<number> =
  async (
    context: StepContext,
    selectedCategoryId: number,
  ): Promise<StepContent> => {
    // Fetch category details for confirmation
    const { data: category, error } = await context.supabase
      .from('categories')
      .select('name, type')
      .eq('id', selectedCategoryId)
      .single();

    if (error || !category) {
      return {
        text: `✅ ${boldMarkdownV2('Categoria selezionata')}`,
        options: { parse_mode: 'MarkdownV2' },
      };
    }

    const typeLabel = category.type === 'income' ? 'Entrata' : 'Uscita';
    const text = `✅ 📂 ${
      boldMarkdownV2(
        `Categoria selezionata: ${escapeMarkdownV2(category.name)} (${
          escapeMarkdownV2(typeLabel)
        })`,
      )
    }`;

    return {
      text,
      options: { parse_mode: 'MarkdownV2' }, // No reply_markup = keyboard removed
    };
  };

const getMessageTitle = (context: StepContext): string => {
  const mention = context.username ? `@${context.username} ` : '';
  return `${escapeMarkdownV2(mention)}   📂 ${boldMarkdownV2('Categoria')}\n\n`;
};

/**
 * Create the CategoryStep instance using composition
 */
export const createCategoryStep = (): Step<number> => {
  return new Step(
    'category',
    presentCategoryInput,
    validateCategory,
    handleCategoryCallback,
    presentCategoryError,
    presentCategoryConfirmation,
    '📂 Seleziona la categoria della transazione',
  );
};

// Export a default instance
export const categoryStep = createCategoryStep();
