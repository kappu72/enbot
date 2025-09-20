// Period step implementation using composition approach
import {
  type ErrorPresenter,
  type InputPresenter,
  type InputValidator,
  Step,
  type StepContent,
  type StepContext,
} from './step-types.ts';

/**
 * Pure function to validate period input (MM-YYYY format)
 */
export const validatePeriod: InputValidator<string> = (input: string) => {
  // Remove whitespace
  const cleanInput = input.trim();

  // Check format MM-YYYY
  const dateRegex = /^\d{2}-\d{4}$/;
  if (!dateRegex.test(cleanInput)) {
    return {
      valid: false,
      error: '❌ Inserisci una data valida nel formato MM-YYYY (es. 01-2024)',
    };
  }

  // Validate month (01-12)
  const [monthStr, yearStr] = cleanInput.split('-');
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: '❌ Il mese deve essere compreso tra 01 e 12',
    };
  }

  // Validate year (reasonable range)
  const currentYear = new Date().getFullYear();
  if (year < 2020 || year > currentYear + 5) {
    return {
      valid: false,
      error: `❌ L'anno deve essere compreso tra 2020 e ${currentYear + 5}`,
    };
  }

  return {
    valid: true,
    value: cleanInput,
  };
};

/**
 * Pure function to present period input interface
 */
export const presentPeriodInput: InputPresenter = (
  context: StepContext,
): StepContent => {
  const keyboard = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'MM-YYYY (es. 01-2024)',
      selective: true,
    },
  };

  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text = `${mention}📅 Inserisci il mese ed anno di riferimento:\n` +
    `🔢 Formato: MM-YYYY\n` +
    `📋 Esempio: 01-2024, 12-2023`;

  return {
    text,
    options: keyboard,
  };
};

/**
 * Pure function to present period input error
 */
export const presentPeriodError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const options = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'MM-YYYY (es. 01-2024)',
      selective: true,
    },
    parse_mode: 'Markdown',
  };

  const text = `${mention}${error}\n\n` +
    `📅 Riprova inserendo il periodo:\n` +
    `🔢 Formato: MM-YYYY\n` +
    `📋 Esempio: 01-2024, 12-2023`;

  return {
    text,
    options,
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
    undefined, // Does not handle callbacks
    presentPeriodError, // Error presenter
    '📅 Inserisci il periodo di riferimento nel formato MM-YYYY',
  );
};

// Export a default instance
export const periodStep = createPeriodStep();
