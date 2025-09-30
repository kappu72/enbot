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
export function formatCurrencyMarkdownV2(
  amount: number,
  currency = '€',
): string {
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

/**
 * Handles line breaks properly in MarkdownV2
 * Ensures that \n characters are preserved and not escaped
 *
 * @param text - Text that may contain line breaks
 * @returns Text with proper line break handling for MarkdownV2
 */
export function handleLineBreaksMarkdownV2(text: string): string {
  // Split by line breaks, escape each line, then rejoin
  return text
    .split('\n')
    .map((line) => escapeMarkdownV2(line))
    .join('\n');
}

/**
 * Formats multi-line messages with proper escaping for MarkdownV2
 * Handles line breaks and escapes special characters in each line
 *
 * @param lines - Array of text lines to format
 * @returns Properly formatted multi-line MarkdownV2 text
 */
export function formatMultiLineMarkdownV2(lines: string[]): string {
  return lines
    .map((line) => escapeMarkdownV2(line))
    .join('\n');
}

/**
 * Validates if text is properly escaped for MarkdownV2
 * Checks for unescaped special characters that would break MarkdownV2
 *
 * @param text - Text to validate
 * @returns Object with validation result and details
 */
export function validateMarkdownV2(text: string): {
  isValid: boolean;
  errors: string[];
  unescapedChars: string[];
} {
  const specialChars = [
    '_',
    '*',
    '[',
    ']',
    '(',
    ')',
    '~',
    '`',
    '>',
    '#',
    '+',
    '-',
    '=',
    '|',
    '{',
    '}',
    '.',
    '!',
  ];
  const errors: string[] = [];
  const unescapedChars: string[] = [];

  // Check each character in the text
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (specialChars.includes(char)) {
      const beforeChar = text[i - 1];

      // If the character is not preceded by a backslash, it's unescaped
      if (beforeChar !== '\\') {
        // Check if this is a formatting marker (bold, italic, etc.)
        const isFormattingMarker = isFormattingChar(text, i, char);

        if (!isFormattingMarker) {
          if (!unescapedChars.includes(char)) {
            unescapedChars.push(char);
          }
          errors.push(`Unescaped special character '${char}' at position ${i}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    unescapedChars,
  };
}

/**
 * Helper function to determine if a special character is used for formatting
 * This function checks if a character is part of valid MarkdownV2 formatting
 * by looking for properly matched pairs in both directions
 */
function isFormattingChar(
  text: string,
  position: number,
  char: string,
): boolean {
  // Check if character is escaped (preceded by backslash)
  if (position > 0 && text[position - 1] === '\\') {
    return false;
  }

  // For paired formatting characters, check if they form valid pairs
  if (char === '*' || char === '_' || char === '~' || char === '`') {
    const pairChar = char;

    // Look for a matching character in either direction
    // First check forward (for opening characters)
    let foundForward = false;
    let searchPos = position + 1;

    while (searchPos < text.length) {
      const currentChar = text[searchPos];

      // Skip escaped characters
      if (currentChar === '\\') {
        searchPos += 2;
        continue;
      }

      if (currentChar === pairChar) {
        foundForward = true;
        break;
      }

      searchPos++;
    }

    // If we found a match forward, this character is part of formatting
    if (foundForward) {
      return true;
    }

    // If no forward match, check backward (for closing characters)
    let foundBackward = false;
    searchPos = position - 1;

    while (searchPos >= 0) {
      const currentChar = text[searchPos];

      // Skip escaped characters
      if (currentChar === '\\') {
        searchPos -= 2;
        continue;
      }

      if (currentChar === pairChar) {
        foundBackward = true;
        break;
      }

      searchPos--;
    }

    return foundBackward;
  }

  return false; // Not a formatting character
}

/**
 * Creates a code block for MarkdownV2
 *
 * @param text - Text to format as code
 * @returns Code block formatted text with escaped content
 */
export function codeBlockMarkdownV2(text: string): string {
  return `\`${escapeMarkdownV2(text)}\``;
}

/**
 * Creates a pre-formatted code block for MarkdownV2
 *
 * @param text - Text to format as pre-formatted code
 * @returns Pre-formatted code block with escaped content
 */
export function preCodeBlockMarkdownV2(text: string): string {
  return `\`\`\`\n${escapeMarkdownV2(text)}\n\`\`\``;
}

/**
 * Safely formats a URL for MarkdownV2
 * Note: URLs in MarkdownV2 should not be escaped, but this function
 * ensures the URL is properly formatted
 *
 * @param url - URL to format
 * @param text - Optional display text (defaults to URL)
 * @returns Formatted URL link for MarkdownV2
 */
export function formatUrlMarkdownV2(url: string, text?: string): string {
  const displayText = text || url;
  return `[${escapeMarkdownV2(displayText)}](${url})`;
}

/**
 * Safely formats a user mention for MarkdownV2
 *
 * @param username - Username to mention (without @)
 * @returns Formatted user mention for MarkdownV2
 */
export function formatUserMentionMarkdownV2(username: string): string {
  return `@${escapeMarkdownV2(username)}`;
}

/**
 * Creates a strikethrough text for MarkdownV2
 *
 * @param text - Text to strikethrough
 * @returns Strikethrough formatted text with escaped content
 */
export function strikethroughMarkdownV2(text: string): string {
  return `~${escapeMarkdownV2(text)}~`;
}
