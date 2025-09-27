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
  label: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  types: string[]; // Array of types this category belongs to
}

// Category type definition
export interface CategoryType {
  id: number;
  name: string;
  description?: string;
}

/**
 * Fetch categories from database by type
 */
async function fetchCategoriesByType(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  type: 'income' | 'outcome' | 'creditNote',
): Promise<Category[]> {
  // First get the category type ID
  const { data: typeData, error: typeError } = await supabase
    .from('category_types')
    .select('id')
    .eq('name', type)
    .single();

  if (typeError || !typeData) {
    console.error('Error fetching category type:', typeError);
    return [];
  }

  // Then get categories with their assignments ordered by sort_order
  const { data, error } = await supabase
    .from('category_type_assignments')
    .select(`
      sort_order,
      categories!inner(
        id, name, label, description, is_active
      )
    `)
    .eq('category_type_id', typeData.id)
    .eq('categories.is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  // Transform the data to include types array
  // deno-lint-ignore no-explicit-any
  const categories: Category[] = (data || []).map((item: any) => ({
    id: item.categories.id,
    name: item.categories.name,
    label: item.categories.label,
    description: item.categories.description,
    is_active: item.categories.is_active,
    sort_order: item.sort_order,
    types: [type], // Since we're filtering by type, we know this category belongs to this type
  }));

  return categories;
}

/**
 * Create inline keyboard for category selection (3x3 grid with navigation)
 */
function createCategoryKeyboard(
  categories: Category[],
  currentPage: number = 0,
  itemsPerPage: number = 9,
): {
  keyboard: { text: string; callback_data: string }[][];
  hasNext: boolean;
  hasPrev: boolean;
} {
  const keyboard: { text: string; callback_data: string }[][] = [];
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageCategories = categories.slice(startIndex, endIndex);

  // Create 3x3 grid for categories
  for (let i = 0; i < pageCategories.length; i += 3) {
    const row = pageCategories.slice(i, i + 3).map((category) => ({
      text: category.label,
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
  if (callbackData.startsWith('category_page_')) {
    const pageNumber = parseInt(callbackData.replace('category_page_', ''));
    return { type: 'page', value: pageNumber };
  } else if (callbackData.startsWith('category_')) {
    const categoryId = parseInt(callbackData.replace('category_', ''));
    return { type: 'category', value: categoryId };
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
 * Create category input presenter for a specific type
 */
const createCategoryInputPresenter = (
  categoryType: 'income' | 'outcome' | 'creditNote',
): InputPresenter => {
  return async (context: StepContext): Promise<StepContent> => {
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

    const typeLabel = categoryType === 'income'
      ? 'Entrate'
      : categoryType === 'outcome'
      ? 'Uscite'
      : 'Note di Credito';
    const text = getMessageTitle(context) +
      `📂 ${escapeMarkdownV2('Seleziona categoria')} \\(${
        escapeMarkdownV2(typeLabel)
      }\\)\n\n` +
      `👆 ${escapeMarkdownV2('Scegli una categoria dalla lista')}`;

    return {
      text,
      options,
    };
  };
};

/**
 * Handle category selection callbacks with pagination
 */
const handleCategoryCallback: CallbackHandler<number> = (
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
        value: -1, // Special value to indicate keyboard update needed
        error: undefined,
      };
    }
  } catch (_error) {
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
 * Create category update presenter for a specific type
 */
export const createCategoryUpdatePresenter = (
  categoryType: 'income' | 'outcome' | 'creditNote',
) => {
  return async (
    context: StepContext,
    callbackData: string,
  ): Promise<StepContent> => {
    try {
      const parsed = parseCallbackData(callbackData);

      if (parsed.type === 'page') {
        const pageNumber = parsed.value;

        const categories = await fetchCategoriesByType(
          context.supabase,
          categoryType,
        );
        const { keyboard } = createCategoryKeyboard(
          categories,
          pageNumber,
        );

        const options = {
          reply_markup: {
            inline_keyboard: keyboard,
          },
          parse_mode: 'MarkdownV2',
        };

        const typeLabel = categoryType === 'income'
          ? 'Entrate'
          : categoryType === 'outcome'
          ? 'Uscite'
          : 'Note di Credito';
        const title = getMessageTitle(context);
        const categoryText = `📂 ${
          escapeMarkdownV2('Seleziona categoria')
        } \\(${escapeMarkdownV2(typeLabel)}\\)`;
        const pageText = `📄 ${escapeMarkdownV2('Pagina')} ${
          escapeMarkdownV2((pageNumber + 1).toString())
        }`;
        const instructionText = `👆 ${
          escapeMarkdownV2('Scegli una categoria dalla lista')
        }`;

        const text = title + categoryText + '\n\n' + pageText + '\n' +
          instructionText;

        // Validate that text is not empty
        if (!text || text.trim().length === 0) {
          console.error('❌ Generated empty text for category update:', {
            title: JSON.stringify(title),
            categoryText: JSON.stringify(categoryText),
            pageText: JSON.stringify(pageText),
            instructionText: JSON.stringify(instructionText),
            pageNumber,
            categoryType,
          });
          // Fallback to initial presentation
          return await createCategoryInputPresenter(categoryType)(context);
        }

        // Debug logging
        console.log('Category update text parts:', {
          title: JSON.stringify(title),
          categoryText: JSON.stringify(categoryText),
          pageText: JSON.stringify(pageText),
          instructionText: JSON.stringify(instructionText),
          fullText: JSON.stringify(text),
          textLength: text.length,
        });

        return {
          text,
          options,
        };
      }
    } catch (error) {
      console.error('Error in presentCategoryUpdate:', error);
    }

    // Fallback to initial presentation
    return await createCategoryInputPresenter(categoryType)(context);
  };
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
export const presentCategoryConfirmation: ConfirmationPresenter<number> = (
  _context: StepContext,
  _selectedCategoryId: number,
): StepContent => {
  // For now, return a generic confirmation message
  // The actual category name will be fetched and displayed by the command
  const text = `✅ 📂 ${boldMarkdownV2('Categoria selezionata')}`;

  return {
    text,
    options: { parse_mode: 'MarkdownV2' }, // No reply_markup = keyboard removed
  };
};

const getMessageTitle = (context: StepContext): string => {
  const mention = context.username ? `@${context.username} ` : '';
  const title = `${escapeMarkdownV2(mention)}   📂 ${
    escapeMarkdownV2('Categoria')
  }\n\n`;

  // Validate that title is not empty
  if (!title || title.trim().length === 0) {
    console.error('❌ Generated empty title:', { mention, context });
    return '📂 Categoria\n\n'; // Fallback title
  }

  return title;
};

/**
 * Create the CategoryStep instance using composition with specific type
 */
export const createCategoryStep = (
  categoryType: 'income' | 'outcome' | 'creditNote',
): Step<number> => {
  return new Step(
    'category',
    createCategoryInputPresenter(categoryType),
    validateCategory,
    handleCategoryCallback,
    presentCategoryError,
    presentCategoryConfirmation,
    `📂 Seleziona la categoria per ${categoryType}`,
  );
};
