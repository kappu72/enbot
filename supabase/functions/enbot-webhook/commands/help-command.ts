// Help command implementation
import type { CommandContext, CommandResult } from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramMessage } from '../types.ts';

export class HelpCommand extends BaseCommand {
  constructor(context: CommandContext) {
    super(context, 'help');
  }

  canHandle(message: TelegramMessage): boolean {
    return message.text === '/help';
  }

  async execute(): Promise<CommandResult> {
    const helpMessage = `
🤖 **EnBot - Gestione Transazioni**

**Comandi disponibili:**
• /start o /transaction - Inizia una nuova transazione completa
• /quote - Registra una quota mensile (salta selezione categoria)
• /history - Mostra le ultime 10 transazioni
• /getid - Mostra ID chat e utente
• /testmsg @username - Invia messaggio di test a un utente
• /help - Mostra questo messaggio di aiuto
• /cancel - Annulla la transazione in corso

**Come utilizzare:**
1. Usa /start per una transazione completa
2. Usa /quote per una quota mensile veloce
3. Segui le istruzioni per inserire i dati richiesti
4. Usa /cancel se vuoi annullare

**Categorie disponibili:**
• quota mensile
• quota iscrizione
• altro

**Comandi di test:**
• /testmsg @nome - Testa l'invio di messaggi

🔒 **Sicurezza:**
Questo bot può essere utilizzato solo nel gruppo autorizzato.`;

    await this.sendMessage(helpMessage, { parse_mode: 'Markdown' });

    return { success: true, message: 'Help displayed' };
  }

  getHelpText(): string {
    return '/help - Mostra questo messaggio di aiuto';
  }

  getDescription(): string {
    return 'Mostra la lista di tutti i comandi disponibili e le istruzioni per utilizzare il bot';
  }
}
