// Person name step implementation using composition approach
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

// Types for contacts functionality
interface Contact {
  id: number;
  contact: string;
}

interface ContactsPage {
  contacts: Contact[];
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Load contacts from database with pagination
 */
async function loadContacts(
  context: StepContext,
  page = 0,
  pageSize = 9,
): Promise<ContactsPage> {
  try {
    const offset = page * pageSize;

    // Get total count
    const { count, error: countError } = await context.supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting contacts:', countError);
      throw countError;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get contacts for current page
    const { data: contacts, error } = await context.supabase
      .from('contacts')
      .select('id, contact')
      .order('contact')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ Error loading contacts:', error);
      throw error;
    }

    return {
      contacts: contacts || [],
      currentPage: page,
      totalPages,
      hasNext: page < totalPages - 1,
      hasPrevious: page > 0,
    };
  } catch (error) {
    console.error('❌ Failed to load contacts:', error);
    return {
      contacts: [],
      currentPage: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    };
  }
}

/**
 * Create inline keyboard for contacts selection
 */
function createContactsKeyboard(
  contactsPage: ContactsPage,
): { text: string; callback_data: string }[][] {
  const keyboard: { text: string; callback_data: string }[][] = [];
  const { contacts, hasNext, hasPrevious, currentPage } = contactsPage;

  // Create 3x3 grid of contacts (max 9 contacts per page)
  for (let i = 0; i < contacts.length; i += 3) {
    const row = contacts.slice(i, i + 3).map((contact) => ({
      text: contact.contact,
      callback_data: `contact:select:${contact.contact}`,
    }));
    keyboard.push(row);
  }

  // Add navigation row (4th row) - always show prev/next buttons
  const navRow = [];

  // Previous button (always present, disabled if no previous page)
  navRow.push({
    text: hasPrevious ? '◀️' : '⚪',
    callback_data: hasPrevious
      ? `contact:page:${currentPage - 1}`
      : 'contact:noop',
  });

  // New contact button (always present)
  navRow.push({
    text: '➕ Nuovo',
    callback_data: 'contact:new',
  });

  // Next button (always present, disabled if no next page)
  navRow.push({
    text: hasNext ? '▶️' : '⚪',
    callback_data: hasNext ? `contact:page:${currentPage + 1}` : 'contact:noop',
  });

  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  return keyboard;
}

/**
 * Validate person name input (supports both callbacks and text input)
 */
export const validatePersonName: InputValidator<string> = (input: string) => {
  // For callback-based input (contact selection), minimal validation
  if (input.startsWith('contact:')) {
    return { valid: true, value: input };
  }

  // For text input (new contact creation), full validation
  const cleanInput = input.trim();

  if (cleanInput.length === 0) {
    return {
      valid: false,
      error: '❌ Il nome non può essere vuoto',
    };
  }

  if (cleanInput.length < 2) {
    return {
      valid: false,
      error: '❌ Il nome deve essere almeno di 2 caratteri',
    };
  }

  if (cleanInput.length > 50) {
    return {
      valid: false,
      error: '❌ Il nome non può superare i 50 caratteri',
    };
  }

  // Allow & character for couples/families
  const validPattern = /^[a-zA-ZÀ-ÿ\s'\-&]+$/;
  if (!validPattern.test(cleanInput)) {
    return {
      valid: false,
      error:
        '❌ Il nome può contenere solo lettere, spazi, apostrofi, trattini e &',
    };
  }

  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(cleanInput);
  if (!hasLetters) {
    return {
      valid: false,
      error: '❌ Il nome deve contenere almeno una lettera',
    };
  }

  return {
    valid: true,
    value: cleanInput,
  };
};

/**
 * Present person name selection interface with contacts keyboard
 */
export const presentPersonNameInput: InputPresenter = async (
  context: StepContext,
): Promise<StepContent> => {
  try {
    // Load contacts for first page
    const contactsPage = await loadContacts(context, 0, 9);
    const keyboard = createContactsKeyboard(contactsPage);

    const options = {
      reply_markup: {
        inline_keyboard: keyboard,
      },
      parse_mode: 'MarkdownV2',
    };

    // Get username for mention from context
    const mention = context.username ? `@${context.username} ` : '';

    const text =
      `${mention}   👤 *Controparte transazione*\n\n📋 Scegli dalla lista o crea un nuovo contatto\n\📄 Pagina ${
        contactsPage.currentPage + 1
      } di ${contactsPage.totalPages}`;

    return {
      text,
      options,
    };
  } catch (error) {
    console.error('❌ Error presenting contact selection:', error);

    // Fallback to text input
    return presentNewContactInput(context);
  }
};

/**
 * Handle contact selection callbacks
 */
export const handlePersonNameCallback: CallbackHandler<string> = (
  callbackQuery: TelegramCallbackQuery,
) => {
  const callbackData = callbackQuery.data!;

  if (callbackData.startsWith('contact:select:')) {
    // Contact selected
    const contactName = callbackData.replace('contact:select:', '');
    return {
      valid: true,
      value: contactName,
      error: undefined,
    };
  }

  if (callbackData === 'contact:new') {
    // New contact requested - need to switch to text input
    return {
      valid: true,
      value: 'NEW_CONTACT_MODE',
      error: undefined,
    };
  }

  if (callbackData.startsWith('contact:page:')) {
    // Page navigation - need keyboard update
    return {
      valid: true,
      value: 'UPDATE_KEYBOARD',
      error: undefined,
    };
  }

  if (callbackData === 'contact:noop') {
    // No-op callback for disabled buttons - ignore silently
    return {
      valid: false,
      value: undefined,
      error: undefined, // Don't show error for disabled buttons
    };
  }

  return {
    valid: false,
    value: undefined,
    error: 'Selezione non valida',
  };
};

/**
 * Update contacts keyboard for pagination
 */
export const updateContactsKeyboard = async (
  context: StepContext,
  callbackData: string,
): Promise<StepContent> => {
  try {
    const pageMatch = callbackData.match(/contact:page:(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 0;

    const contactsPage = await loadContacts(context, page, 9);
    const keyboard = createContactsKeyboard(contactsPage);

    const options = {
      reply_markup: {
        inline_keyboard: keyboard,
      },
      parse_mode: 'MarkdownV2',
    };

    const mention = context.username ? `@${context.username} ` : '';

    const text =
      `${mention}👤 **Seleziona il contatto per la transazione:**\n\n` +
      `📋 Scegli dalla lista o aggiungi un nuovo contatto\n` +
      `📄 Pagina ${contactsPage.currentPage + 1} di ${contactsPage.totalPages}`;

    return {
      text,
      options,
    };
  } catch (error) {
    console.error('❌ Error updating contacts keyboard:', error);
    return presentPersonNameInput(context);
  }
};

/**
 * Present new contact input interface (fallback to text input)
 */
export const presentNewContactInput = (
  context: StepContext,
): StepContent => {
  const options = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Inserisci il nuovo nome',
      selective: true,
    },
    parse_mode: 'MarkdownV2',
  };

  const mention = context.username ? `@${context.username} ` : '';

  const text = `${mention}   ➕ *Aggiungi nuovo contatto:*\n\n` +
    `📝 Inserisci il nome completo\n` +
    `📋 Esempi: Mario Rossi, Anna & Marco, Giuseppe`;

  return {
    text,
    options,
  };
};

/**
 * Present contact selection confirmation (keyboard removed)
 */
export const presentPersonNameConfirmation = (
  context: StepContext,
  selectedContactName: string,
): StepContent => {
  const _mention = context.username ? `@${context.username} ` : '';

  const text = `✅ *Contatto selezionato:* ${selectedContactName}`;

  const options = {
    parse_mode: 'MarkdownV2',
    // No reply_markup - keyboard is removed
  };

  return {
    text,
    options,
  };
};

/**
 * Save new contact to database
 */
export const saveNewContact = async (
  context: StepContext,
  contactName: string,
): Promise<boolean> => {
  try {
    const { error } = await context.supabase
      .from('contacts')
      .insert({ contact: contactName });

    if (error) {
      console.error('❌ Error saving new contact:', error);
      return false;
    }

    console.log(`✅ New contact saved: ${contactName}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to save new contact:', error);
    return false;
  }
};

/**
 * Present person name input error
 */
export const presentPersonNameError: ErrorPresenter = (
  context: StepContext,
  error: string,
): StepContent => {
  // Get username for mention
  const mention = context.username ? `@${context.username} ` : '';

  const options = {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Inserisci il nome',
      selective: true,
    },
    parse_mode: 'MarkdownV2',
  };

  const text = `${mention}${error}\n\n` +
    `👤 **Riprova inserendo il nome:**\n` +
    `📝 Inserisci il nome completo\n` +
    `📋 Esempi: Mario Rossi, Anna De Sanctis, John D'Angelo`;

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
    handlePersonNameCallback, // Now handles callbacks
    presentPersonNameError,
    '👤 Seleziona il contatto per la transazione',
  );
};

// Export a default instance
export const personNameStep = createPersonNameStep();
