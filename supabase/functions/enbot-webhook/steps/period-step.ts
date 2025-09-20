// Combined Period step implementation (month + year + confirm in one keyboard)
import {
  type CallbackHandler,
  type ErrorPresenter,
  type InputPresenter,
  type InputValidator,
  Step,
  type StepContent,
  type StepContext,
} from './step-types.ts';
import type { TelegramCallbackQuery } from '../types.ts';

/**
 * Type for confirmation presenter functions
 */
type ConfirmationPresenter = (
  context: StepContext,
  selectedValue: unknown,
) => StepContent;

/**
 * Month data with abbreviations and full names
 */
const MONTHS = [
  { number: '01', abbr: 'GEN', full: 'Gennaio' },
  { number: '02', abbr: 'FEB', full: 'Febbraio' },
  { number: '03', abbr: 'MAR', full: 'Marzo' },
  { number: '04', abbr: 'APR', full: 'Aprile' },
  { number: '05', abbr: 'MAG', full: 'Maggio' },
  { number: '06', abbr: 'GIU', full: 'Giugno' },
  { number: '07', abbr: 'LUG', full: 'Luglio' },
  { number: '08', abbr: 'AGO', full: 'Agosto' },
  { number: '09', abbr: 'SET', full: 'Settembre' },
  { number: '10', abbr: 'OTT', full: 'Ottobre' },
  { number: '11', abbr: 'NOV', full: 'Novembre' },
  { number: '12', abbr: 'DIC', full: 'Dicembre' },
];

/**
 * Helper to get month data by its number (e.g., "01" for January)
 */
function getMonthByNumber(monthNumber: string) {
  return MONTHS.find((m) => m.number === monthNumber);
}

/**
 * Arrange months with previous month first, current month second, then others
 */
function getMonthsArrangement(): typeof MONTHS {
  const currentMonth = new Date().getMonth(); // 0-based (0 = January)
  const previousMonth = (currentMonth - 1 + 12) % 12; // Handle wrap-around for January

  // Start with previous month, then current, then the rest
  const reorderedMonths = [
    MONTHS[previousMonth], // Previous month first
    MONTHS[currentMonth], // Current month second
    // Then all other months, excluding previous and current
    ...MONTHS.filter((_, index) =>
      index !== previousMonth && index !== currentMonth
    ),
  ];

  return reorderedMonths;
}

/**
 * Get three years: previous, current, next
 */
function getYearsArrangement(): string[] {
  const currentYear = new Date().getFullYear();
  return [
    (currentYear - 1).toString(), // Previous year
    currentYear.toString(), // Current year
    (currentYear + 1).toString(), // Next year
  ];
}

/**
 * Parse state from callback data or return empty state
 */
function parseStateFromCallback(
  callbackData: string,
): { selectedMonth?: string; selectedYear?: string } {
  // Parse patterns like: month:01:2025, year:2025:01, confirm:01-2025
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
  } else if (callbackData.startsWith('confirm:')) {
    const period = callbackData.split(':')[1]; // "01-2025"
    const [month, year] = period.split('-');
    return {
      selectedMonth: month,
      selectedYear: year,
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

  // Confirm row
  const canConfirm = selectedMonth && selectedYear;
  const confirmIcon = canConfirm ? '✅' : '⚪';
  const confirmText = `${confirmIcon} CONFERMA`;
  const confirmCallback = canConfirm
    ? `confirm:${selectedMonth}-${selectedYear}`
    : 'confirm:disabled';

  keyboard.push([{
    text: confirmText,
    callback_data: confirmCallback,
  }]);

  return keyboard;
}

/**
 * Simple validation for callback data (inline keyboard is controlled)
 */
export const validatePeriod: InputValidator<string> = (
  callbackData: string,
) => {
  // For inline keyboards, we control the buttons, so validation is minimal
  if (
    callbackData.startsWith('confirm:') && callbackData !== 'confirm:disabled'
  ) {
    const period = callbackData.split(':')[1]; // Extract "01-2025"
    return { valid: true, value: period };
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
    parse_mode: 'Markdown',
  };

  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based
  const currentMonthName = MONTHS[currentMonth].full;
  const previousMonthName = MONTHS[(currentMonth - 1 + 12) % 12].full;

  const text = `${mention}📅 **Seleziona periodo di riferimento:**\n\n` +
    `🗓️ **Mese corrente**: ${currentMonthName}\n` +
    `⏮️ **Mese precedente**: ${previousMonthName}\n` +
    `📊 **Anno corrente**: ${currentYear}\n\n` +
    `👆 Seleziona prima il mese, poi l'anno, infine conferma:`;

  return {
    text,
    options,
  };
};

/**
 * Handle period selection callbacks with state management
 */
export const handlePeriodCallback: CallbackHandler<string> = (
  callbackQuery: TelegramCallbackQuery,
) => {
  const callbackData = callbackQuery.data!;

  // If it's a confirm callback with a valid period, return the final value
  if (
    callbackData.startsWith('confirm:') && callbackData !== 'confirm:disabled'
  ) {
    const period = callbackData.split(':')[1]; // "01-2025"
    return {
      valid: true,
      value: period,
      error: undefined,
    };
  }

  // For month/year selections, we need to update the keyboard
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
    parse_mode: 'Markdown',
  };

  // Build status text
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  let statusText = `${mention}📅 **Seleziona periodo di riferimento:**\n\n`;

  if (state.selectedMonth) {
    const monthData = getMonthByNumber(state.selectedMonth);
    statusText += `✅ **Mese**: ${monthData?.full} (${state.selectedMonth})\n`;
  } else {
    statusText += `⚪ **Mese**: non selezionato\n`;
  }

  if (state.selectedYear) {
    statusText += `✅ **Anno**: ${state.selectedYear}\n`;
  } else {
    statusText += `⚪ **Anno**: non selezionato\n`;
  }

  if (state.selectedMonth && state.selectedYear) {
    statusText +=
      `\n🎯 **Pronto per confermare**: ${state.selectedMonth}-${state.selectedYear}`;
  } else {
    statusText += `\n👆 Continua le selezioni per abilitare la conferma`;
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
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text = `${mention}${error}\n\n📅 Riprova selezionando periodo.`;

  return {
    text,
    options: { parse_mode: 'Markdown' },
  };
};

/**
 * Present period selection confirmation
 */
export const presentPeriodConfirmation: ConfirmationPresenter = (
  context: StepContext,
  selectedValue: unknown,
): StepContent => {
  const period = selectedValue as string; // "01-2025"
  const [monthNumber, year] = period.split('-');
  const monthData = getMonthByNumber(monthNumber);

  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text =
    `${mention}📅 **Periodo selezionato**: ${monthData?.full} ${year} (${period})\n\n` +
    `✅ Continuando con il prossimo step...`;

  return {
    text,
    options: { parse_mode: 'Markdown' }, // No reply_markup = keyboard removed
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
    '📅 Seleziona il periodo di riferimento (mese + anno)',
  );
};

// Export a default instance
export const periodStep = createPeriodStep();
