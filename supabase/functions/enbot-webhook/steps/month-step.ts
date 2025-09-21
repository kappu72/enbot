// Month step implementation using composition approach
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
import {
  MONTHS,
  getMonthByNumber,
  getCurrentMonthName,
} from '../utils/date-utils.ts';

/**
 * Type for confirmation presenter functions
 */
type ConfirmationPresenter = (
  context: StepContext,
  selectedValue: unknown,
) => StepContent;


/**
 * Arrange months with current month first, organized in rows
 * (Specific arrangement for MonthStep UI)
 */
function getMonthsArrangementForMonthStep(): typeof MONTHS {
  const currentMonth = new Date().getMonth(); // 0-based (0 = January)

  // Reorder months starting from current month
  const reorderedMonths = [
    ...MONTHS.slice(currentMonth),
    ...MONTHS.slice(0, currentMonth),
  ];

  return reorderedMonths;
}

/**
 * Simple validation for callback data (inline keyboard buttons are controlled)
 */
export const validateMonth: InputValidator<string> = (callbackData: string) => {
  // For inline keyboards, we control the buttons, so just extract the month
  const monthNumber = callbackData.split(':')[1];
  return {
    valid: true,
    value: monthNumber, // Return the month number (01-12)
  };
};

/**
 * Pure function to present month selection interface
 */
export const presentMonthInput: InputPresenter = (
  context: StepContext,
): StepContent => {
  const arrangedMonths = getMonthsArrangementForMonthStep();

  // Create inline keyboard with months arranged in 3 rows of 4
  const keyboard = [];
  for (let i = 0; i < arrangedMonths.length; i += 4) {
    const row = arrangedMonths.slice(i, i + 4).map((month) => ({
      text: month.abbr,
      callback_data: `month:${month.number}`,
    }));
    keyboard.push(row);
  }

  const options = {
    reply_markup: {
      inline_keyboard: keyboard,
    },
    parse_mode: 'MarkdownV2',
  };

  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const currentMonthName = getCurrentMonthName();

  const text = `${mention}📅 Seleziona il mese di riferimento:\n\n` +
    `🕐 **Mese corrente**: ${currentMonthName}\n` +
    `👆 Tocca il mese desiderato dalla tastiera qui sotto:`;

  return {
    text,
    options,
  };
};

/**
 * Simple callback handler for month selection (inline keyboard is controlled)
 */
export const handleMonthCallback: CallbackHandler<string> = (
  callbackQuery: TelegramCallbackQuery,
) => {
  // Extract month number directly (no validation needed for controlled buttons)
  const monthNumber = callbackQuery.data!.split(':')[1];

  return {
    valid: true,
    value: monthNumber,
    error: undefined,
  };
};

/**
 * Error presenter for month selection (rarely needed for inline keyboards)
 * Kept for interface completeness but should rarely be called
 */
export const presentMonthError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text = `${mention}${error}\n\n📅 Riprova selezionando un mese.`;

  return {
    text,
    options: { parse_mode: 'MarkdownV2' },
  };
};

/**
 * Pure function to present month selection confirmation
 * This removes the keyboard and shows the selected month
 */
export const presentMonthConfirmation: ConfirmationPresenter = (
  context: StepContext,
  selectedValue: unknown,
): StepContent => {
  const monthNumber = selectedValue as string;
  const monthData = getMonthByNumber(monthNumber);

  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text =
    `${mention}📅 **Mese selezionato**: ${monthData?.full} (${monthData?.number})\n\n` +
    `✅ Continuando con il prossimo step...`;

  return {
    text,
    options: { parse_mode: 'MarkdownV2' }, // No reply_markup = keyboard removed
  };
};

/**
 * Create the MonthStep instance using composition
 */
export const createMonthStep = (): Step<string> => {
  return new Step(
    'month',
    presentMonthInput,
    validateMonth,
    handleMonthCallback, // Callback handler for inline keyboard
    presentMonthError, // Error presenter
    '📅 Seleziona il mese di riferimento dalla tastiera',
  );
};

// Export a default instance
export const monthStep = createMonthStep();
