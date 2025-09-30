import {
  boldMarkdownV2,
  escapeMarkdownV2,
  validateMarkdownV2,
} from './supabase/functions/enbot-webhook/utils/markdown-utils.ts';

// Test individual functions
const categoryName = 'Pronto Soccorso';
console.log('Category name:', categoryName);
console.log('boldMarkdownV2 result:', boldMarkdownV2(categoryName));
console.log('escapeMarkdownV2 result:', escapeMarkdownV2(categoryName));

// Test validation of bold text
const boldText = boldMarkdownV2(categoryName);
console.log('Bold text validation:', validateMarkdownV2(boldText));

// Simulate the original problematic message construction
const mention = '@username';
const title = 'Descrizione';

const message = escapeMarkdownV2(mention) + '   📝 ' + boldMarkdownV2(title) +
  '\n\n' +
  'Inserisci una descrizione per la categoria ' + boldMarkdownV2(categoryName) +
  escapeMarkdownV2('.') + '\n\n' +
  'Puoi lasciare vuoto premendo invio o scrivere una descrizione dettagliata' +
  escapeMarkdownV2('.');

console.log('\nFull message validation:');
console.log('Is valid:', validateMarkdownV2(message).isValid);
console.log('Errors:', validateMarkdownV2(message).errors);
