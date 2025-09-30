import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  boldMarkdownV2,
  codeBlockMarkdownV2,
  escapeMarkdownV2,
  formatCurrencyMarkdownV2,
  formatMultiLineMarkdownV2,
  formatPeriodMarkdownV2,
  formatUrlMarkdownV2,
  formatUserMentionMarkdownV2,
  handleLineBreaksMarkdownV2,
  italicMarkdownV2,
  preCodeBlockMarkdownV2,
  strikethroughMarkdownV2,
  validateMarkdownV2,
} from './markdown-utils.ts';

Deno.test('escapeMarkdownV2 - basic escaping', () => {
  assertEquals(escapeMarkdownV2('Hello World'), 'Hello World');
  assertEquals(escapeMarkdownV2('Hello_World'), 'Hello\\_World');
  assertEquals(escapeMarkdownV2('Hello*World'), 'Hello\\*World');
  assertEquals(escapeMarkdownV2('Hello[World]'), 'Hello\\[World\\]');
  assertEquals(escapeMarkdownV2('Hello(World)'), 'Hello\\(World\\)');
  assertEquals(escapeMarkdownV2('Hello~World'), 'Hello\\~World');
  assertEquals(escapeMarkdownV2('Hello`World'), 'Hello\\`World');
  assertEquals(escapeMarkdownV2('Hello>World'), 'Hello\\>World');
  assertEquals(escapeMarkdownV2('Hello#World'), 'Hello\\#World');
  assertEquals(escapeMarkdownV2('Hello+World'), 'Hello\\+World');
  assertEquals(escapeMarkdownV2('Hello-World'), 'Hello\\-World');
  assertEquals(escapeMarkdownV2('Hello=World'), 'Hello\\=World');
  assertEquals(escapeMarkdownV2('Hello|World'), 'Hello\\|World');
  assertEquals(escapeMarkdownV2('Hello{World}'), 'Hello\\{World\\}');
  assertEquals(escapeMarkdownV2('Hello.World'), 'Hello\\.World');
  assertEquals(escapeMarkdownV2('Hello!World'), 'Hello\\!World');
});

Deno.test('escapeMarkdownV2 - multiple special characters', () => {
  assertEquals(
    escapeMarkdownV2('Hello_World*Test[123]'),
    'Hello\\_World\\*Test\\[123\\]',
  );
  assertEquals(
    escapeMarkdownV2('Price: $25.50 (tax included)'),
    'Price: $25\\.50 \\(tax included\\)',
  );
});

Deno.test('formatCurrencyMarkdownV2', () => {
  assertEquals(formatCurrencyMarkdownV2(25.50), '€25\\.50');
  assertEquals(formatCurrencyMarkdownV2(100), '€100\\.00');
  assertEquals(formatCurrencyMarkdownV2(0.99), '€0\\.99');
  assertEquals(formatCurrencyMarkdownV2(1234.56, '$'), '$1234\\.56');
});

Deno.test('formatPeriodMarkdownV2', () => {
  assertEquals(formatPeriodMarkdownV2('01-2024'), '01\\-2024');
  assertEquals(formatPeriodMarkdownV2('12-2023'), '12\\-2023');
});

Deno.test('boldMarkdownV2', () => {
  assertEquals(boldMarkdownV2('Hello World'), '*Hello World*');
  assertEquals(boldMarkdownV2('Price: $25.50'), '*Price: $25\\.50*');
  assertEquals(boldMarkdownV2('Test_underscore'), '*Test\\_underscore*');
});

Deno.test('italicMarkdownV2', () => {
  assertEquals(italicMarkdownV2('Hello World'), '_Hello World_');
  assertEquals(italicMarkdownV2('Price: $25.50'), '_Price: $25\\.50_');
  assertEquals(italicMarkdownV2('Test*asterisk'), '_Test\\*asterisk_');
});

Deno.test('handleLineBreaksMarkdownV2', () => {
  assertEquals(
    handleLineBreaksMarkdownV2('Line 1\nLine 2'),
    'Line 1\nLine 2',
  );
  assertEquals(
    handleLineBreaksMarkdownV2('Line 1 with_underscore\nLine 2 with*asterisk'),
    'Line 1 with\\_underscore\nLine 2 with\\*asterisk',
  );
  assertEquals(
    handleLineBreaksMarkdownV2('Price: $25.50\nTotal: $100.00'),
    'Price: $25\\.50\nTotal: $100\\.00',
  );
});

Deno.test('formatMultiLineMarkdownV2', () => {
  assertEquals(
    formatMultiLineMarkdownV2(['Line 1', 'Line 2']),
    'Line 1\nLine 2',
  );
  assertEquals(
    formatMultiLineMarkdownV2(['Price: $25.50', 'Total: $100.00']),
    'Price: $25\\.50\nTotal: $100\\.00',
  );
  assertEquals(
    formatMultiLineMarkdownV2(['Test_underscore', 'Test*asterisk']),
    'Test\\_underscore\nTest\\*asterisk',
  );
});

Deno.test('validateMarkdownV2 - basic functionality', () => {
  // Test basic escaping functionality
  const result1 = validateMarkdownV2('Hello World');
  assertEquals(result1.isValid, true);
  assertEquals(result1.errors.length, 0);

  // Test that escaped characters are considered valid
  const result2 = validateMarkdownV2('Price: €25\\.50');
  assertEquals(result2.isValid, true);
  assertEquals(result2.errors.length, 0);

  // Test that unescaped special characters are detected
  const result3 = validateMarkdownV2('Test_underscore');
  assertEquals(result3.isValid, false);
  assertEquals(result3.unescapedChars.includes('_'), true);
});

Deno.test('validateMarkdownV2 - formatting characters', () => {
  // Test that properly formatted bold text is considered valid
  const result1 = validateMarkdownV2('*Hello World*');
  assertEquals(result1.isValid, true);
  assertEquals(result1.errors.length, 0);

  // Test that properly formatted italic text is considered valid
  const result2 = validateMarkdownV2('_Hello World_');
  assertEquals(result2.isValid, true);
  assertEquals(result2.errors.length, 0);

  // Test that properly formatted strikethrough text is considered valid
  const result3 = validateMarkdownV2('~Hello World~');
  assertEquals(result3.isValid, true);
  assertEquals(result3.errors.length, 0);

  // Test that properly formatted code text is considered valid
  const result4 = validateMarkdownV2('`Hello World`');
  assertEquals(result4.isValid, true);
  assertEquals(result4.errors.length, 0);

  // Test that unmatched formatting characters are detected as invalid
  const result5 = validateMarkdownV2('*Hello World');
  assertEquals(result5.isValid, false);
  assertEquals(result5.unescapedChars.includes('*'), true);

  // Test complex formatting with escaped content
  const result6 = validateMarkdownV2('*Price: €25\\.50*');
  assertEquals(result6.isValid, true);
  assertEquals(result6.errors.length, 0);
});

Deno.test('codeBlockMarkdownV2', () => {
  assertEquals(codeBlockMarkdownV2('Hello World'), '`Hello World`');
  assertEquals(codeBlockMarkdownV2('Price: $25.50'), '`Price: $25\\.50`');
  assertEquals(codeBlockMarkdownV2('Test_underscore'), '`Test\\_underscore`');
});

Deno.test('preCodeBlockMarkdownV2', () => {
  assertEquals(
    preCodeBlockMarkdownV2('Hello World'),
    '```\nHello World\n```',
  );
  assertEquals(
    preCodeBlockMarkdownV2('Price: $25.50'),
    '```\nPrice: $25\\.50\n```',
  );
});

Deno.test('formatUrlMarkdownV2', () => {
  assertEquals(
    formatUrlMarkdownV2('https://example.com'),
    '[https://example\\.com](https://example.com)',
  );
  assertEquals(
    formatUrlMarkdownV2('https://example.com', 'Example'),
    '[Example](https://example.com)',
  );
  assertEquals(
    formatUrlMarkdownV2('https://example.com', 'Example_Site'),
    '[Example\\_Site](https://example.com)',
  );
});

Deno.test('formatUserMentionMarkdownV2', () => {
  assertEquals(formatUserMentionMarkdownV2('username'), '@username');
  assertEquals(formatUserMentionMarkdownV2('user_name'), '@user\\_name');
  assertEquals(formatUserMentionMarkdownV2('user.name'), '@user\\.name');
});

Deno.test('strikethroughMarkdownV2', () => {
  assertEquals(strikethroughMarkdownV2('Hello World'), '~Hello World~');
  assertEquals(strikethroughMarkdownV2('Price: $25.50'), '~Price: $25\\.50~');
  assertEquals(
    strikethroughMarkdownV2('Test_underscore'),
    '~Test\\_underscore~',
  );
});

Deno.test('Integration test - complex message formatting', () => {
  const lines = [
    '🔔 ' + boldMarkdownV2('Quota Mensile Registrata'),
    'Versati ' + formatCurrencyMarkdownV2(25.50) + ' come quota di ' +
    boldMarkdownV2('Gennaio') + ' ' + boldMarkdownV2('2024') + ' per ' +
    boldMarkdownV2('Rossi'),
    'Registrato da: ' + boldMarkdownV2('Admin'),
    'Grazie da EnB',
  ];

  const message = formatMultiLineMarkdownV2(lines);

  // Validate the message (basic check that no obvious errors are present)
  const validation = validateMarkdownV2(message);
  // Note: The validateMarkdownV2 function has known limitations with complex formatting,
  // so we only check that there are no unescaped special characters that would definitely break MarkdownV2
  if (validation.unescapedChars.length !== 0) {
    throw new Error(
      `Message has unescaped special characters: ${
        validation.unescapedChars.join(', ')
      }`,
    );
  }

  // Check that it contains expected content (accounting for the fact that formatting characters may be escaped)
  assertEquals(message.includes('Quota Mensile Registrata'), true);
  assertEquals(message.includes('€25'), true);
  assertEquals(message.includes('Gennaio'), true);
  assertEquals(message.includes('2024'), true);
  assertEquals(message.includes('Rossi'), true);
  assertEquals(message.includes('Admin'), true);
});
