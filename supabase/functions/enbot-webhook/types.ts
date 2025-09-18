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
  step:
    | 'idle'
    | 'family'
    | 'category'
    | 'amount'
    | 'period'
    | 'billing_month'
    | 'billing_year'
    | 'year'
    | 'contact'
    | 'complete';
  transactionData: Partial<Transaction>;
}

export interface PersistedUserSession {
  id: number;
  user_id: number;
  chat_id: number;
  command_type: string;
  step:
    | 'idle'
    | 'family'
    | 'billing_month'
    | 'billing_year'
    | 'category'
    | 'amount'
    | 'period'
    | 'month'
    | 'year'
    | 'contact';
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

// Import official Telegram types from Grammy (always up-to-date with Telegram Bot API)
import type {
  CallbackQuery,
  Message,
  Update,
} from 'https://deno.land/x/grammy@v1.21.1/types.ts';

// Re-export Grammy types with our naming convention for consistency
export type TelegramMessage = Message;
export type TelegramCallbackQuery = CallbackQuery;
export type TelegramUpdate = Update;

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

// Type guards and utility functions for Grammy types
export function isTextMessage(
  message: TelegramMessage,
): message is TelegramMessage & { text: string } {
  return 'text' in message && typeof message.text === 'string';
}

export function isCallbackQuery(
  update: TelegramUpdate,
): update is TelegramUpdate & { callback_query: TelegramCallbackQuery } {
  return 'callback_query' in update && update.callback_query !== undefined;
}

export function hasCallbackData(
  callbackQuery: TelegramCallbackQuery,
): callbackQuery is TelegramCallbackQuery & { data: string } {
  return 'data' in callbackQuery && typeof callbackQuery.data === 'string';
}
