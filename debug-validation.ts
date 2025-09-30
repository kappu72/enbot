import { validateMarkdownV2 } from './supabase/functions/enbot-webhook/utils/markdown-utils.ts';

const testText = '*Hello World*';
console.log('Testing:', testText);
console.log('Length:', testText.length);

const result = validateMarkdownV2(testText);
console.log('Result:', result);

console.log('\nTesting various cases:');

// Test cases
const testCases = [
  '*Hello World*', // Should be valid
  '_Hello World_', // Should be valid
  '~Hello World~', // Should be valid
  '`Hello World`', // Should be valid
  '*Hello World', // Should be invalid (unmatched opening)
  'Hello World*', // Should be invalid (unmatched closing)
  'Test_underscore', // Should be invalid (unescaped)
  'Test*asterisk', // Should be invalid (unescaped)
];

testCases.forEach((testCase, index) => {
  const result = validateMarkdownV2(testCase);
  console.log(`${index + 1}. "${testCase}" -> Valid: ${result.isValid}`);
});
