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
🤖 **EnBot \\- Gestione Transazioni**

**Comandi disponibili:**
• /entrata \\- 💰 Registra una nuova entrata
• /uscita \\- 💸 Registra una nuova uscita  
• /notacredito \\- 📄 Registra una nota di credito
• /help \\- ❓ Mostra questo messaggio di aiuto
• /cancel \\- ❌ Annulla la transazione in corso

**Come utilizzare:**
1\\. Usa uno dei comandi per registrare una transazione
2\\. Seleziona la categoria appropriata
3\\. Segui le istruzioni per inserire i dati richiesti
4\\. Usa /cancel se vuoi annullare

**Tipi di transazioni:**
• **Entrate**: Quote mensili, esami, iscrizioni, eventi, depositi, altro
• **Uscite**: Cambusa, circolo, legna, manutenzione, stipendi, rimborsi, altro
• **Note di credito**: Stipendi, cambusa, materiale didattico, manutenzione, utenze, altro

**Flussi speciali:**
• **Entrate**: Descrizione opzionale per "Eventi" e "Altro"
• **Uscite**: Nome persona per "Stipendi contributi" e "Rimborsi"
• **Note di credito**: Descrizione per "Spese Varie"

🔒 **Sicurezza:**
Questo bot può essere utilizzato solo nel gruppo autorizzato\\.`;

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
