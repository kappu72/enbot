// Family step implementation using composition approach
import {
  type ErrorPresenter,
  type InputPresenter,
  type InputValidator,
  Step,
  type StepContent,
  type StepContext,
} from './step-types.ts';

/**
 * Pure function to validate family name input
 */
export const validateFamily: InputValidator<string> = (input: string) => {
  // Remove whitespace
  const cleanInput = input.trim();

  // Check for empty input
  if (cleanInput.length === 0) {
    return {
      valid: false,
      error: '❌ Il nome della famiglia non può essere vuoto',
    };
  }

  // Check minimum length
  if (cleanInput.length < 2) {
    return {
      valid: false,
      error: '❌ Il nome della famiglia deve essere almeno di 2 caratteri',
    };
  }

  // Check maximum length
  if (cleanInput.length > 50) {
    return {
      valid: false,
      error: '❌ Il nome della famiglia non può superare i 50 caratteri',
    };
  }

  // Check for valid characters (letters, spaces, apostrophes, hyphens)
  const validPattern = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
  if (!validPattern.test(cleanInput)) {
    return {
      valid: false,
      error:
        '❌ Il nome della famiglia può contenere solo lettere, spazi, apostrofi e trattini',
    };
  }

  // Check for reasonable content (not just spaces/punctuation)
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(cleanInput);
  if (!hasLetters) {
    return {
      valid: false,
      error: '❌ Il nome della famiglia deve contenere almeno una lettera',
    };
  }

  return {
    valid: true,
    value: cleanInput,
  };
};

/**
 * Pure function to present family input interface
 */
export const presentFamilyInput: InputPresenter = (
  context: StepContext,
): StepContent => {
  const keyboard = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Inserisci la famiglia',
      selective: true,
    },
  };

  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text = `${mention}👨‍👩‍👧‍👦 Seleziona la famiglia per la quota mensile:\n` +
    `📝 Inserisci il nome della famiglia\n` +
    `📋 Esempio: Rossi, De Sanctis, D'Angelo`;

  return {
    text,
    options: keyboard,
  };
};

/**
 * Pure function to present family input error
 */
export const presentFamilyError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const options = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Inserisci la famiglia',
      selective: true,
    },
    parse_mode: 'Markdown',
  };

  const text = `${mention}${error}\n\n` +
    `👨‍👩‍👧‍👦 Riprova inserendo la famiglia:\n` +
    `📝 Inserisci il nome della famiglia\n` +
    `📋 Esempio: Rossi, De Sanctis, D'Angelo`;

  return {
    text,
    options,
  };
};

/**
 * Create the FamilyStep instance using composition
 */
export const createFamilyStep = (): Step<string> => {
  return new Step(
    'family',
    presentFamilyInput,
    validateFamily,
    undefined, // Does not handle callbacks
    presentFamilyError, // Error presenter
    '👨‍👩‍👧‍👦 Inserisci il nome della famiglia per la quota mensile',
  );
};

// Export a default instance
export const familyStep = createFamilyStep();
