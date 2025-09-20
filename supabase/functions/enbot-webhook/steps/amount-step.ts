// Amount step implementation using composition approach
import {
  type ErrorPresenter,
  type InputPresenter,
  type InputValidator,
  Step,
  type StepContent,
  type StepContext,
} from './step-types.ts';

/**
 * Pure function to validate amount input
 */
export const validateAmount: InputValidator<number> = (input: string) => {
  // Remove whitespace and normalize decimal separator
  const cleanInput = input.trim().replace(',', '.');

  const amount = parseFloat(cleanInput);

  if (isNaN(amount)) {
    return {
      valid: false,
      error: '❌ Inserisci un numero valido (es. 25.50 o 25,50)',
    };
  }

  if (amount <= 0) {
    return {
      valid: false,
      error: "❌ L'importo deve essere maggiore di zero",
    };
  }

  if (amount > 10000) {
    return {
      valid: false,
      error: "❌ L'importo è troppo elevato (massimo €10.000)",
    };
  }
  return {
    valid: true,
    value: amount,
  };
};

/**
 * Pure function to present amount input interface
 */
export const presentAmountInput: InputPresenter = (
  context: StepContext,
): StepContent => {
  const keyboard = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: '25.50 (solo numeri e punto/virgola)',
      selective: true,
    },
  };

  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username}` : '';

  const text = `${mention}💰 Importo in EUR:\n` +
    `🔢 Esempio: 25.50 o 25,50\n` +
    `📱 Usa il tastierino numerico del telefono`;

  return {
    text,
    options: keyboard,
  };
};

/**
 * Pure function to present amount input error
 */
export const presentAmountError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';
  const options = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: '25.50 (solo numeri e punto/virgola)',
      selective: true,
    },
    parse_mode: 'Markdown',
  };

  const text = `${mention}${error}\n\n` +
    `💰 Riprova inserendo l'importo in EUR:\n` +
    `🔢 Esempio: 25.50 o 25,50\n` +
    `📱 Usa il tastierino numerico del telefone`;

  return {
    text,
    options,
  };
};

/**
 * Create the AmountStep instance using composition
 */
export const createAmountStep = (): Step<number> => {
  return new Step(
    'amount',
    presentAmountInput,
    validateAmount,
    undefined, // Does not handle callbacks
    presentAmountError, // Error presenter
    "💰 Inserisci l'importo della transazione in EUR",
  );
};

// Export a default instance
export const amountStep = createAmountStep();
