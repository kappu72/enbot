import {
  boldMarkdownV2,
  escapeMarkdownV2,
  validateMarkdownV2,
} from './supabase/functions/enbot-webhook/utils/markdown-utils.ts';

// Test the exact issue
const categoryName = 'P.Soccorso';
const message =
  `Inserisci una descrizione per la categoria ${boldMarkdownV2(categoryName)}${
    escapeMarkdownV2('.')
  }\n\n` +
  `Puoi lasciare vuoto premendo invio o scrivere una descrizione dettagliata${
    escapeMarkdownV2('.')
  }.`;

console.log('Message length:', message.length);
console.log('Message:', JSON.stringify(message));

const validation = validateMarkdownV2(message);
console.log('Validation:', validation);

// Check each character around position 156
for (let i = 150; i < Math.min(message.length, 160); i++) {
  console.log(
    `Position ${i}: '${message[i]}' (char code: ${message.charCodeAt(i)})`,
  );
}
