// Person name step implementation using composition approach
import {
  type ErrorPresenter,
  type InputPresenter,
  type InputValidator,
  Step,
  type StepContent,
  type StepContext,
} from './step-types.ts';

/**
 * Pure function to validate person name input
 */
export const validatePersonName: InputValidator<string> = (input: string) => {
  // Remove whitespace
  const cleanInput = input.trim();

  // Check for empty input
  if (cleanInput.length === 0) {
    return {
      valid: false,
      error: '❌ Person name cannot be empty',
    };
  }

  // Check minimum length
  if (cleanInput.length < 2) {
    return {
      valid: false,
      error: '❌ Person name must be at least 2 characters long',
    };
  }

  // Check maximum length
  if (cleanInput.length > 50) {
    return {
      valid: false,
      error: '❌ Person name cannot exceed 50 characters',
    };
  }

  // Check for valid characters (letters, spaces, apostrophes, hyphens)
  const validPattern = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
  if (!validPattern.test(cleanInput)) {
    return {
      valid: false,
      error:
        '❌ Person name can only contain letters, spaces, apostrophes and hyphens',
    };
  }

  // Check for reasonable content (not just spaces/punctuation)
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(cleanInput);
  if (!hasLetters) {
    return {
      valid: false,
      error: '❌ Person name must contain at least one letter',
    };
  }

  return {
    valid: true,
    value: cleanInput,
  };
};

/**
 * Pure function to present person name input interface
 */
export const presentPersonNameInput: InputPresenter = (
  context: StepContext,
): StepContent => {
  const keyboard = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Enter person name',
      selective: true,
    },
  };

  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const text = `${mention}👤 **Enter person name for cash transaction:**\n` +
    `📝 Enter the full name\n` +
    `📋 Examples: Mario Rossi, Anna De Sanctis, John D'Angelo`;

  return {
    text,
    options: keyboard,
  };
};

/**
 * Pure function to present person name input error
 */
export const presentPersonNameError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  // Get username for mention
  const username = context.message?.from?.username;
  const mention = username ? `@${username} ` : '';

  const options = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Enter person name',
      selective: true,
    },
    parse_mode: 'Markdown',
  };

  const text = `${mention}${error}\n\n` +
    `👤 **Please try again with person name:**\n` +
    `📝 Enter the full name\n` +
    `📋 Examples: Mario Rossi, Anna De Sanctis, John D'Angelo`;

  return {
    text,
    options,
  };
};

/**
 * Create the PersonNameStep instance using composition
 */
export const createPersonNameStep = (): Step<string> => {
  return new Step(
    'person-name',
    presentPersonNameInput,
    validatePersonName,
    undefined, // Does not handle callbacks
    presentPersonNameError, // Error presenter
    '👤 Enter person name for cash transaction',
  );
};

// Export a default instance
export const personNameStep = createPersonNameStep();
