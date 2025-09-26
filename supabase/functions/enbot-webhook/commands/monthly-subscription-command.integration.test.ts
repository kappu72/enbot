import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  boldMarkdownV2,
  formatCurrencyMarkdownV2,
  formatMultiLineMarkdownV2,
} from '../utils/markdown-utils.ts';
import { getMonthByNumber } from '../utils/date-utils.ts';

/**
 * Integration tests for the quota command message formatting
 * These tests verify that the entire message formatting pipeline works correctly
 */

// Test the complete quota notification message generation
Deno.test('Integration: Complete quota notification message generation', () => {
  // Simulate a complete transaction payload
  const transactionPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: 'Rossi',
    recorded_by: 'Admin',
  };

  // Build the complete notification message (same logic as in the actual command)
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

  // Verify the message structure
  assertEquals(
    notificationMessage.includes('🔔'),
    true,
    'Message should contain notification emoji',
  );
  assertEquals(
    notificationMessage.includes('*Quota Mensile Registrata*'),
    true,
    'Message should contain bold title',
  );
  assertEquals(
    notificationMessage.includes('€25\\.50'),
    true,
    'Message should contain formatted currency',
  );
  assertEquals(
    notificationMessage.includes('*Gennaio*'),
    true,
    'Message should contain bold month name',
  );
  assertEquals(
    notificationMessage.includes('*2024*'),
    true,
    'Message should contain bold year',
  );
  assertEquals(
    notificationMessage.includes('*Rossi*'),
    true,
    'Message should contain bold family name',
  );
  assertEquals(
    notificationMessage.includes('*Admin*'),
    true,
    'Message should contain bold recorded_by name',
  );
  assertEquals(
    notificationMessage.includes('Grazie da EnB'),
    true,
    'Message should contain closing message',
  );

  // Verify line breaks are present
  assertEquals(
    notificationMessage.includes('\n'),
    true,
    'Message should contain line breaks',
  );

  // Count line breaks to ensure proper structure
  const lineBreaks = (notificationMessage.match(/\n/g) || []).length;
  assertEquals(
    lineBreaks,
    3,
    'Message should contain exactly 3 line breaks',
  );
});

// Test quota notification with different transaction scenarios
Deno.test('Integration: Quota notification with various transaction scenarios', () => {
  const testCases = [
    {
      payload: {
        amount: 0.50,
        month: '01',
        year: '2024',
        family: 'Rossi',
        recorded_by: 'Admin',
      },
      expectedCurrency: '€0\\.50',
      expectedMonth: 'Gennaio',
    },
    {
      payload: {
        amount: 100.00,
        month: '06',
        year: '2024',
        family: 'Bianchi',
        recorded_by: 'User1',
      },
      expectedCurrency: '€100\\.00',
      expectedMonth: 'Giugno',
    },
    {
      payload: {
        amount: 1234.56,
        month: '12',
        year: '2023',
        family: 'Verdi',
        recorded_by: 'User2',
      },
      expectedCurrency: '€1234\\.56',
      expectedMonth: 'Dicembre',
    },
  ];

  for (const testCase of testCases) {
    const notificationMessage =
      `🔔 ${boldMarkdownV2('Quota Mensile Registrata')}\n` +
      `Versati ${
        formatCurrencyMarkdownV2(testCase.payload.amount as number)
      } come quota di ${
        boldMarkdownV2(
          getMonthByNumber(testCase.payload.month as string)?.full || '',
        )
      } ${boldMarkdownV2(testCase.payload.year as string)} per ${
        boldMarkdownV2(testCase.payload.family as string)
      }\n` +
      `Registrato da: ${
        boldMarkdownV2(testCase.payload.recorded_by as string)
      }\n` +
      `Grazie da EnB`;

    // Verify currency formatting
    assertEquals(
      notificationMessage.includes(testCase.expectedCurrency),
      true,
      `Message should contain ${testCase.expectedCurrency} for amount ${testCase.payload.amount}`,
    );

    // Verify month formatting
    assertEquals(
      notificationMessage.includes(`*${testCase.expectedMonth}*`),
      true,
      `Message should contain *${testCase.expectedMonth}* for month ${testCase.payload.month}`,
    );

    // Verify family name formatting
    assertEquals(
      notificationMessage.includes(`*${testCase.payload.family}*`),
      true,
      `Message should contain *${testCase.payload.family}* in bold`,
    );

    // Verify recorded_by formatting
    assertEquals(
      notificationMessage.includes(`*${testCase.payload.recorded_by}*`),
      true,
      `Message should contain *${testCase.payload.recorded_by}* in bold`,
    );
  }
});

// Test quota notification with special characters in names
Deno.test('Integration: Quota notification with special characters', () => {
  const transactionPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: 'Rossi-Martini',
    recorded_by: 'Admin_User',
  };

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

  // Verify special characters are properly escaped in bold formatting
  assertEquals(
    notificationMessage.includes('*Rossi\\-Martini*'),
    true,
    'Hyphen in family name should be escaped in bold formatting',
  );
  assertEquals(
    notificationMessage.includes('*Admin\\_User*'),
    true,
    'Underscore in recorded_by should be escaped in bold formatting',
  );
});

// Test quota notification with multi-line formatting
Deno.test('Integration: Quota notification with multi-line formatting', () => {
  const transactionPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: 'Rossi',
    recorded_by: 'Admin',
  };

  // Build message using multi-line formatting
  const lines = [
    `🔔 ${boldMarkdownV2('Quota Mensile Registrata')}`,
    `Versati ${
      formatCurrencyMarkdownV2(transactionPayload.amount as number)
    } come quota di ${
      boldMarkdownV2(
        getMonthByNumber(transactionPayload.month as string)?.full || '',
      )
    } ${boldMarkdownV2(transactionPayload.year as string)} per ${
      boldMarkdownV2(transactionPayload.family as string)
    }`,
    `Registrato da: ${
      boldMarkdownV2(transactionPayload.recorded_by as string)
    }`,
    'Grazie da EnB',
  ];

  const message = formatMultiLineMarkdownV2(lines);

  // Verify the message structure
  assertEquals(
    message.includes('🔔'),
    true,
    'Multi-line message should contain notification emoji',
  );
  assertEquals(
    message.includes('\\*Quota Mensile Registrata\\*'),
    true,
    'Multi-line message should contain escaped bold title',
  );
  assertEquals(
    message.includes('€25\\\\.50'),
    true,
    'Multi-line message should contain double-escaped currency',
  );
  assertEquals(
    message.includes('\\*Gennaio\\*'),
    true,
    'Multi-line message should contain escaped bold month',
  );
  assertEquals(
    message.includes('\\*2024\\*'),
    true,
    'Multi-line message should contain escaped bold year',
  );
  assertEquals(
    message.includes('\\*Rossi\\*'),
    true,
    'Multi-line message should contain escaped bold family name',
  );
  assertEquals(
    message.includes('\\*Admin\\*'),
    true,
    'Multi-line message should contain escaped bold recorded_by name',
  );
  assertEquals(
    message.includes('Grazie da EnB'),
    true,
    'Multi-line message should contain closing message',
  );

  // Verify line breaks are preserved
  assertEquals(
    message.includes('\n'),
    true,
    'Multi-line message should contain line breaks',
  );

  // Count line breaks
  const lineBreaks = (message.match(/\n/g) || []).length;
  assertEquals(
    lineBreaks,
    3,
    'Multi-line message should contain exactly 3 line breaks',
  );
});

// Test quota notification with edge cases
Deno.test('Integration: Quota notification edge cases', () => {
  // Test with empty family name
  const emptyFamilyPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: '',
    recorded_by: 'Admin',
  };

  const emptyFamilyMessage =
    `🔔 ${boldMarkdownV2('Quota Mensile Registrata')}\n` +
    `Versati ${
      formatCurrencyMarkdownV2(emptyFamilyPayload.amount as number)
    } come quota di ${
      boldMarkdownV2(
        getMonthByNumber(emptyFamilyPayload.month as string)?.full || '',
      )
    } ${boldMarkdownV2(emptyFamilyPayload.year as string)} per ${
      boldMarkdownV2(emptyFamilyPayload.family as string)
    }\n` +
    `Registrato da: ${
      boldMarkdownV2(emptyFamilyPayload.recorded_by as string)
    }\n` +
    `Grazie da EnB`;

  // Verify empty family name is handled
  assertEquals(
    emptyFamilyMessage.includes('per **'),
    true,
    'Message with empty family should contain "per **"',
  );

  // Test with very long family name
  const longFamilyName =
    'Very Long Family Name With Many Words That Could Cause Issues';
  const longFamilyPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: longFamilyName,
    recorded_by: 'Admin',
  };

  const longFamilyMessage =
    `🔔 ${boldMarkdownV2('Quota Mensile Registrata')}\n` +
    `Versati ${
      formatCurrencyMarkdownV2(longFamilyPayload.amount as number)
    } come quota di ${
      boldMarkdownV2(
        getMonthByNumber(longFamilyPayload.month as string)?.full || '',
      )
    } ${boldMarkdownV2(longFamilyPayload.year as string)} per ${
      boldMarkdownV2(longFamilyPayload.family as string)
    }\n` +
    `Registrato da: ${
      boldMarkdownV2(longFamilyPayload.recorded_by as string)
    }\n` +
    `Grazie da EnB`;

  // Verify long family name is handled
  assertEquals(
    longFamilyMessage.includes(`*${longFamilyName}*`),
    true,
    'Message with long family name should contain the full name in bold',
  );
});

// Test quota notification message length and structure
Deno.test('Integration: Quota notification message structure validation', () => {
  const transactionPayload = {
    amount: 25.50,
    month: '01',
    year: '2024',
    family: 'Rossi',
    recorded_by: 'Admin',
  };

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

  // Verify message is not too long (Telegram has a 4096 character limit)
  assertEquals(
    notificationMessage.length < 4096,
    true,
    "Message should be under Telegram's 4096 character limit",
  );

  // Verify message contains all required components
  const requiredComponents = [
    '🔔',
    'Quota Mensile Registrata',
    'Versati',
    'come quota di',
    'per',
    'Registrato da:',
    'Grazie da EnB',
  ];

  for (const component of requiredComponents) {
    assertEquals(
      notificationMessage.includes(component),
      true,
      `Message should contain required component: ${component}`,
    );
  }

  // Verify message structure with regex
  const messageStructureRegex =
    /🔔 \*Quota Mensile Registrata\*\nVersati €[\d\\.]+ come quota di \*[\w]+\* \*[\d]+\* per \*[\w\\-]+\*\nRegistrato da: \*[\w\\_]+\*\nGrazie da EnB/;
  assertEquals(
    messageStructureRegex.test(notificationMessage),
    true,
    'Message should match expected structure pattern',
  );
});
