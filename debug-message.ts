import {
  boldMarkdownV2,
  escapeMarkdownV2,
  validateMarkdownV2,
} from './supabase/functions/enbot-webhook/utils/markdown-utils.ts';

// Simulate the exact conditions from the error
const context = {
  username: undefined, // This is likely the issue - no username
  session: {
    transactionData: {
      category: 'P.Soccorso',
    },
  },
};

const categoryName = 'P.Soccorso';

// Replicate getMessageTitle function
const mention = context.username ? `@${context.username} ` : '';
const titlePart = `${escapeMarkdownV2(mention)}   📝 ${
  boldMarkdownV2('Descrizione')
}\n\n`;

console.log('Mention:', repr(mention));
console.log('Title part:', repr(titlePart));
console.log('Title part validation:', validateMarkdownV2(titlePart));

// Replicate the full message
const message = titlePart +
  `Inserisci una descrizione per la categoria ${boldMarkdownV2(categoryName)}${
    escapeMarkdownV2('.')
  }\n\n` +
  `Puoi lasciare vuoto premendo invio o scrivere una descrizione dettagliata${
    escapeMarkdownV2('.')
  }.`;

console.log('Full message length:', message.length);
if (message.length > 156) {
  console.log('Position 156 character:', repr(message[156]));
  console.log('Character code:', message.charCodeAt(156));
} else {
  console.log('Message too short for position 156');
}
console.log('Full message validation:', validateMarkdownV2(message));

// Show the message with all characters visible
console.log('\nFull message with repr:');
console.log(repr(message));

// Helper function to show actual characters including spaces and special chars
function repr(str: string): string {
  if (!str) return '';
  return str
    .split('')
    .map((char) => {
      if (char === ' ') return '[SPACE]';
      if (char === '\n') return '[NEWLINE]';
      if (char === '\t') return '[TAB]';
      return char;
    })
    .join('');
}
