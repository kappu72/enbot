// Help command implementation
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from './command-interface.ts';
import type { TelegramMessage } from '../types.ts';

export class HelpCommand extends BaseCommand {
  static commandName = 'help';
  static description = '❓ Mostra la guida dei comandi';
  constructor(context: CommandContext) {
    super(context, HelpCommand.commandName);
  }

  async execute(): Promise<CommandResult> {
    const helpMessage = `
🤖 **EnBot - Gestione Transazioni**

**Comandi disponibili:**
• /entrata - Registra una nuova entrata (con selezione categoria)
• /help - Mostra questo messaggio di aiuto
• /cancel - Annulla la transazione in corso

**Come utilizzare:**
1. Usa /entrata per registrare una nuova entrata
2. Seleziona la categoria appropriata
3. Segui le istruzioni per inserire i dati richiesti
4. Usa /cancel se vuoi annullare

**Categorie disponibili:**
• Q. Mese (Quota Mensile)
• Q. Esame (Quota Esame)  
• Iscrizione (Quota Iscrizione)
• Eventi
• Cauzione (Deposito Cauzionale)
• Altro

**Comandi di test:**
• /testmsg @nome - Testa l'invio di messaggi

🔒 **Sicurezza:**
Questo bot può essere utilizzato solo nel gruppo autorizzato.`;

    await this.sendMessage(helpMessage, { parse_mode: 'MarkdownV2' });

    return { success: true, message: 'Help displayed' };
  }

  override getHelpText(): string {
    return '/help - Mostra questo messaggio di aiuto';
  }

  override getDescription(): string {
    return HelpCommand.description;
  }
}
