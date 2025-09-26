// Step system types and interfaces
import type { TelegramCallbackQuery } from '../types.ts';
import type {
  CommandContext,
  CommandSession,
} from '../commands/command-interface.ts';

export interface StepContext extends CommandContext {
  session: CommandSession;
}

export interface StepResult<T = unknown> {
  success: boolean;
  processedValue?: T; // The processed and validated value
  error?: string;
  shouldRetry?: boolean; // If the user should retry this step
}

export interface StepContent {
  text: string;
  options?: Record<string, unknown>;
}

// Function types for composition
export type InputValidator<T> = (input: string) => {
  valid: boolean;
  value?: T;
  error?: string;
};

export type InputPresenter = (
  context: StepContext,
) => StepContent | Promise<StepContent>;

export type CallbackHandler<T = unknown> = (
  callbackQuery: TelegramCallbackQuery,
) =>
  | {
    valid: boolean;
    value?: T;
    error?: string;
  }
  | Promise<{
    valid: boolean;
    value?: T;
    error?: string;
  }>;

export type ErrorPresenter = (
  context: StepContext,
  error: string,
) => StepContent;

// Main Step class using composition
export class Step<T = unknown> {
  constructor(
    private name: string,
    private presenter: InputPresenter,
    private validator?: InputValidator<T>,
    private callbackHandler?: CallbackHandler<T>,
    private errorPresenter?: ErrorPresenter,
    private helpText: string = 'Nessun aiuto disponibile',
  ) {}

  getName(): string {
    return this.name;
  }

  getHelpText(): string {
    return this.helpText;
  }

  getMessageTitle(_context: StepContext): string {
    return this.name;
  }

  async present(context: StepContext): Promise<StepContent> {
    return await this.presenter(context);
  }

  presentError(context: StepContext, error: string): StepContent {
    if (!this.errorPresenter) {
      // Fallback generico per errori
      return {
        text: `❌ ${error}`,
        options: { parse_mode: 'MarkdownV2' },
      };
    }
    return this.errorPresenter(context, error);
  }

  processInput(input: string, _context: StepContext): StepResult<T> {
    if (!this.validator) {
      return { success: false, error: 'Step does not accept text input' };
    }

    const result = this.validator(input);
    if (result.valid) {
      // Return the processed value, let the command handle session saving
      return { success: true, processedValue: result.value };
    }

    return { success: false, error: result.error };
  }

  async processCallback(
    callbackQuery: TelegramCallbackQuery,
    _context: StepContext,
  ): Promise<StepResult<T>> {
    if (!this.callbackHandler) {
      return { success: false, error: 'Step does not accept callbacks' };
    }

    const result = await this.callbackHandler(callbackQuery);
    if (result.valid) {
      // Return the processed value, let the command handle session saving
      return { success: true, processedValue: result.value };
    }

    return { success: false, error: result.error };
  }

  canHandleInput(): boolean {
    return this.validator !== undefined;
  }

  canHandleCallback(): boolean {
    return this.callbackHandler !== undefined;
  }
}
