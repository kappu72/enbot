/**
 * Utility functions for safely handling MarkdownV2 formatting in Telegram messages
 */

/**
 * Escapes special characters for MarkdownV2 format
 * According to Telegram API docs, these characters must be escaped:
 * _ * [ ] ( ) ~ ` > # + - = | { } . !
 * 
 * @param text - The text to escape
 * @returns The escaped text safe for MarkdownV2
 */
export function escapeMarkdownV2(text: string): string {
  // Characters that need to be escaped in MarkdownV2
  const specialChars = /([_*\[\]()~`>#+=\-|{}.!])/g;
  
  return text.replace(specialChars, '\\$1');
}

/**
 * Safely formats a monetary amount for MarkdownV2
 * 
 * @param amount - The numeric amount
 * @param currency - Currency symbol (default: '€')
 * @returns Escaped formatted amount string
 */
export function formatCurrencyMarkdownV2(amount: number, currency = '€'): string {
  const formattedAmount = amount.toFixed(2);
  return `${escapeMarkdownV2(currency)}${escapeMarkdownV2(formattedAmount)}`;
}

/**
 * Safely formats a date for MarkdownV2 (MM-YYYY format)
 * 
 * @param period - Period string in MM-YYYY format
 * @returns Escaped date string
 */
export function formatPeriodMarkdownV2(period: string): string {
  return escapeMarkdownV2(period);
}

/**
 * Creates bold text for MarkdownV2
 * 
 * @param text - Text to make bold
 * @returns Bold formatted text with escaped content
 */
export function boldMarkdownV2(text: string): string {
  return `*${escapeMarkdownV2(text)}*`;
}

/**
 * Creates italic text for MarkdownV2
 * 
 * @param text - Text to make italic
 * @returns Italic formatted text with escaped content
 */
export function italicMarkdownV2(text: string): string {
  return `_${escapeMarkdownV2(text)}_`;
}
