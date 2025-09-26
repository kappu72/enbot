// Combined Period step implementation (month + year + confirm in one keyboard)
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
import {
  boldMarkdownV2,
  escapeMarkdownV2,
  formatPeriodMarkdownV2,
} from '../utils/markdown-utils.ts';
import {
  getCurrentMonthName,
  getCurrentYear,
  getMonthByNumber,
  getMonthsArrangement,
  getYearsArrangement,
} from '../utils/date-utils.ts';

/**
 * Parse state from callback data or return empty state
 */
function parseStateFromCallback(
  callbackData: string,
): { selectedMonth?: string; selectedYear?: string } {
  // Parse patterns like: month:01:2025, year:2025:01
  if (callbackData.startsWith('month:')) {
    const parts = callbackData.split(':');
    return {
      selectedMonth: parts[1],
      selectedYear: parts[2] || undefined,
    };
  } else if (callbackData.startsWith('year:')) {
    const parts = callbackData.split(':');
    return {
      selectedYear: parts[1],
      selectedMonth: parts[2] || undefined,
    };
  }
  return {};
}

/**
 * Create inline keyboard for period selection
 */
function createPeriodKeyboard(selectedMonth?: string, selectedYear?: string) {
  const keyboard = [];
  const arrangedMonths = getMonthsArrangement();
  const years = getYearsArrangement();

  // Month rows (3 rows of 4 months each)
  for (let i = 0; i < arrangedMonths.length; i += 4) {
    const row = arrangedMonths.slice(i, i + 4).map((month) => {
      const isSelected = month.number === selectedMonth;
      const text = isSelected ? `${month.abbr}✅` : month.abbr;
      const callbackData = selectedYear
        ? `month:${month.number}:${selectedYear}`
        : `month:${month.number}`;

      return {
        text,
        callback_data: callbackData,
      };
    });
    keyboard.push(row);
  }

  // Year row
  const yearRow = years.map((year) => {
    const isSelected = year === selectedYear;
    const text = isSelected ? `${year}✅` : year;
    const callbackData = selectedMonth
      ? `year:${year}:${selectedMonth}`
      : `year:${year}`;

    return {
      text,
      callback_data: callbackData,
    };
  });
  keyboard.push(yearRow);

  return keyboard;
}

/**
 * Simple validation for callback data (inline keyboard is controlled)
 */
export const validatePeriod: InputValidator<string> = (
  callbackData: string,
) => {
  // For inline keyboards, we control the buttons, so validation is minimal
  // Check if it's a valid period format (MM-YYYY) - this means both month and year were selected
  if (callbackData.includes('-') && callbackData.match(/^\d{2}-\d{4}$/)) {
    return { valid: true, value: callbackData };
  }

  // For month/year selections, return success but no final value yet
  return { valid: true, value: undefined };
};

/**
 * Present period selection interface with combined month+year keyboard
 */
export const presentPeriodInput: InputPresenter = (
  context: StepContext,
): StepContent => {
  // Start with no selections
  const keyboard = createPeriodKeyboard();

  const options = {
    reply_markup: {
      inline_keyboard: keyboard,
    },
    parse_mode: 'MarkdownV2',
  };

  // Get username for mention from context
  const mention = context.username ? `@${context.username} ` : '';

  const currentYear = getCurrentYear();
  const currentMonthName = getCurrentMonthName();

  const text =
    `${escapeMarkdownV2(mention)}   📅 ${
      boldMarkdownV2('Periodo di riferimento:')
    }\n\n` +
    `🗓️ ${boldMarkdownV2('Mese corrente')}: ${
      escapeMarkdownV2(currentMonthName)
    }\n` +
    `📊 ${boldMarkdownV2('Anno corrente')}: ${
      escapeMarkdownV2(currentYear)
    }\n\n` +
    `👆 Seleziona il mese e l'anno`;

  return {
    text,
    options,
  };
};

/**
 * Handle period selection callbacks with auto-completion
 */
export const handlePeriodCallback: CallbackHandler<string> = (
  callbackQuery: TelegramCallbackQuery,
) => {
  const callbackData = callbackQuery.data!;

  // Parse current state from callback
  const state = parseStateFromCallback(callbackData);

  // If it's a month selection, update the selected month
  if (callbackData.startsWith('month:')) {
    const parts = callbackData.split(':');
    state.selectedMonth = parts[1];
    if (parts[2]) state.selectedYear = parts[2]; // Keep existing year if present
  }

  // If it's a year selection, update the selected year
  if (callbackData.startsWith('year:')) {
    const parts = callbackData.split(':');
    state.selectedYear = parts[1];
    if (parts[2]) state.selectedMonth = parts[2]; // Keep existing month if present
  }

  // Check if both month and year are now selected
  if (state.selectedMonth && state.selectedYear) {
    // Auto-complete: return the final period value
    const period = `${state.selectedMonth}-${state.selectedYear}`;
    return {
      valid: true,
      value: period,
      error: undefined,
    };
  }

  // For incomplete selections, we need to update the keyboard
  // This will be handled by the command which will call presentPeriodUpdate
  return {
    valid: true,
    value: 'update_keyboard', // Special value to indicate keyboard update needed
    error: undefined,
  };
};

/**
 * Present updated period interface after month/year selection
 */
export const presentPeriodUpdate = (
  context: StepContext,
  callbackData: string,
): StepContent => {
  // Parse current state from callback
  const state = parseStateFromCallback(callbackData);

  // If it's a month selection, update the selected month
  if (callbackData.startsWith('month:')) {
    const parts = callbackData.split(':');
    state.selectedMonth = parts[1];
    if (parts[2]) state.selectedYear = parts[2]; // Keep existing year if present
  }

  // If it's a year selection, update the selected year
  if (callbackData.startsWith('year:')) {
    const parts = callbackData.split(':');
    state.selectedYear = parts[1];
    if (parts[2]) state.selectedMonth = parts[2]; // Keep existing month if present
  }

  // Create updated keyboard with current selections
  const keyboard = createPeriodKeyboard(
    state.selectedMonth,
    state.selectedYear,
  );

  const options = {
    reply_markup: {
      inline_keyboard: keyboard,
    },
    parse_mode: 'MarkdownV2',
  };

  // Build status text from context
  const mention = context.username ? `@${context.username} ` : '';

  let statusText = `${escapeMarkdownV2(mention)}   📅 ${
    boldMarkdownV2('Periodo di riferimento:')
  }\n\n`;

  if (state.selectedMonth) {
    const monthData = getMonthByNumber(state.selectedMonth);
    statusText += `✅ ${boldMarkdownV2('Mese')}: ${
      escapeMarkdownV2(monthData?.full || '')
    } ${escapeMarkdownV2(`(${state.selectedMonth})`)}\n`;
  } else {
    statusText += `⚪ ${boldMarkdownV2('Mese')}: non selezionato\n`;
  }

  if (state.selectedYear) {
    statusText += `✅ ${boldMarkdownV2('Anno')}: ${
      escapeMarkdownV2(state.selectedYear)
    }\n`;
  } else {
    statusText += `⚪ ${boldMarkdownV2('Anno')}: non selezionato\n`;
  }

  if (state.selectedMonth && state.selectedYear) {
    statusText += `\n🎯 ${boldMarkdownV2('Completato')}: ${
      formatPeriodMarkdownV2(`${state.selectedMonth}-${state.selectedYear}`)
    }`;
  } else {
    statusText += `\n👆 Continua le selezioni`;
  }

  return {
    text: statusText,
    options,
  };
};

/**
 * Error presenter for period selection (rarely needed for inline keyboards)
 */
export const presentPeriodError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  const mention = context.username ? `@${context.username} ` : '';

  const text = `${escapeMarkdownV2(mention)}${escapeMarkdownV2(error)}\n\n📅 ${
    escapeMarkdownV2('Riprova selezionando periodo.')
  }`;

  return {
    text,
    options: { parse_mode: 'MarkdownV2' },
  };
};

/**
 * Present period selection confirmation
 */
export const presentPeriodConfirmation: ConfirmationPresenter<string> = (
  context: StepContext,
  selectedValue: string,
): StepContent => {
  const period = selectedValue; // "01-2025"
  const [monthNumber, year] = period.split('-');
  const monthData = getMonthByNumber(monthNumber);

  const mention = context.username ? `@${context.username} ` : '';

  const text = `${escapeMarkdownV2(mention)}  📅 ${
    boldMarkdownV2('Periodo selezionato')
  }: ${escapeMarkdownV2(monthData?.full || '')} ${escapeMarkdownV2(year)} ${
    escapeMarkdownV2(`(${period})`)
  }\n\n`;

  return {
    text,
    options: { parse_mode: 'MarkdownV2' }, // No reply_markup = keyboard removed
  };
};

/**
 * Create the PeriodStep instance using composition
 */
export const createPeriodStep = (): Step<string> => {
  return new Step(
    'period',
    presentPeriodInput,
    validatePeriod,
    handlePeriodCallback,
    presentPeriodError,
    presentPeriodConfirmation,
    '📅 Seleziona il periodo di riferimento (mese + anno)',
  );
};

// Export a default instance
export const periodStep = createPeriodStep();
