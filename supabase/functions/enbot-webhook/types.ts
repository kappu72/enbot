// Base types and interfaces for the EnBot system

export interface Transaction {
  id: number;
  family: string;
  category: string;
  amount: number;
  period: string;
  contact: string;
  recordedBy: string;
  recordedAt: string;
  chatId: number;
}

export interface UserSession {
  chatId: number;
  userId: number;
  step: 'idle' | 'family' | 'category' | 'amount' | 'period' | 'contact';
  transactionData: Partial<Transaction>;
}

export interface PersistedUserSession {
  id: number;
  user_id: number;
  chat_id: number;
  step: 'idle' | 'family' | 'category' | 'amount' | 'period' | 'contact';
  transaction_data: Partial<Transaction>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface BotConfig {
  botToken: string;
  allowedGroupId: string;
  adminUserIds: number[];
  isDevelopment: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name: string;
    username?: string;
    last_name?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  text?: string;
  date: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  message?: {
    chat: {
      id: number;
    };
  };
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export const FAMILY_OPTIONS = [
  'Famiglia Rossi',
  'Famiglia Bianchi',
  'Famiglia Verdi',
  'Famiglia Neri',
  'Famiglia Blu',
] as const;

export const CATEGORY_OPTIONS = [
  'quota mensile',
  'quota iscrizione',
  'altro',
] as const;

export type FamilyOption = typeof FAMILY_OPTIONS[number];
export type CategoryOption = typeof CATEGORY_OPTIONS[number];
