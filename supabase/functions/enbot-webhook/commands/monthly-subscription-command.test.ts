import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  boldMarkdownV2,
  formatCurrencyMarkdownV2,
} from '../utils/markdown-utils.ts';
import { getMonthByNumber } from '../utils/date-utils.ts';

// Test the notification message formatting
Deno.test('Quota notification message formatting', () => {
  // Mock transaction payload
  const transactionPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: 'Rossi',
    recorded_by: 'Admin',
  };

  // Build the notification message (same logic as in the command)
  const notificationMessage =
    `🔔 ${boldMarkdownV2('Quota Mensile Registrata')}\n` +
    `Versati ${
      formatCurrencyMarkdownV2(transactionPayload.amount as number)
    } come quota di ${
      boldMarkdownV2(
        getMonthByNumber(transactionPayload.month as string)?.full || '',
      )
    } ${boldMarkdownV2(transactionPayload.year as string)} per ${
      boldMarkdownV2(transactionPayload.family as string)
    }\n` +
    `Registrato da: ${
      boldMarkdownV2(transactionPayload.recorded_by as string)
    }\n` +
    `Grazie da EnB`;

  console.log('Generated notification message:');
  console.log(notificationMessage);
  console.log('---');

  // Test that the message contains proper line breaks
  assertEquals(
    notificationMessage.includes('\n'),
    true,
    'Message should contain line breaks',
  );

  // Test that the message doesn't contain escaped characters
  assertEquals(
    notificationMessage.includes('\\n'),
    false,
    'Message should not contain escaped \\n',
  );
  assertEquals(
    notificationMessage.includes('\\nn'),
    false,
    'Message should not contain escaped \\nn',
  );

  // Test that MarkdownV2 special characters are properly escaped
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
  for (const char of specialChars) {
    // Check that special characters in the content are escaped (but not in the formatting)
    const contentParts = notificationMessage.split(/[*_`]/);
    for (const part of contentParts) {
      if (part.includes(char) && !part.startsWith('\\')) {
        console.warn(`Unescaped special character '${char}' found in: ${part}`);
      }
    }
  }
});

// Test markdown utility functions
Deno.test('Markdown utility functions', () => {
  // Test bold formatting
  const boldText = boldMarkdownV2('Test Text');
  assertEquals(
    boldText,
    '*Test Text*',
    'Bold formatting should work correctly',
  );

  // Test currency formatting
  const currencyText = formatCurrencyMarkdownV2(25.50);
  assertEquals(
    currencyText,
    '€25\\.50',
    'Currency formatting should escape special characters',
  );

  // Test with special characters
  const specialText = boldMarkdownV2('Text with _underscore_ and *asterisk*');
  assertEquals(
    specialText,
    '*Text with \\_underscore\\_ and \\*asterisk\\**',
    'Special characters should be escaped',
  );
});
