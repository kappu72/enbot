// Message and command handler
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { BotConfig, TelegramMessage } from './types.ts';
import { TelegramClient } from './telegram-client.ts';

export class MessageHandler {
  private supabase: SupabaseClient;
  private telegram: TelegramClient;
  private config: BotConfig;

  constructor(
    supabase: SupabaseClient,
    telegram: TelegramClient,
    config: BotConfig,
  ) {
    this.supabase = supabase;
    this.telegram = telegram;
    this.config = config;
  }

  async showTransactionHistory(msg: TelegramMessage): Promise<void> {
    try {
      console.log(`📊 Showing transaction history for user ${msg.from?.id}`);

      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching transactions:', error);
        await this.telegram.sendMessage(
          msg.chat.id,
          '❌ Errore durante il recupero della cronologia delle transazioni.',
        );
        return;
      }

      if (data.length === 0) {
        await this.telegram.sendMessage(
          msg.chat.id,
          '📋 Nessuna transazione trovata nel database.',
        );
        return;
      }

      let historyMessage = '📊 **Ultime 10 Transazioni:**\n\n';

      data.forEach((transaction, index) => {
        const date = new Date(transaction.recorded_at).toLocaleDateString(
          'it-IT',
        );
        const time = new Date(transaction.recorded_at).toLocaleTimeString(
          'it-IT',
          {
            hour: '2-digit',
            minute: '2-digit',
          },
        );

        historyMessage += `**${index + 1}.** #${transaction.id}\n`;
        historyMessage += `👨‍👩‍👧‍👦 **Famiglia:** ${transaction.family}\n`;
        historyMessage += `📋 **Categoria:** ${transaction.category}\n`;
        historyMessage += `💰 **Importo:** €${transaction.amount}\n`;
        historyMessage += `📅 **Periodo:** ${transaction.period}\n`;
        historyMessage += `👤 **Contatto:** ${transaction.contact}\n`;
        historyMessage += `✍️ **Registrato da:** ${transaction.recorded_by}\n`;
        historyMessage += `🕒 **Data:** ${date} alle ${time}\n\n`;
      });

      // Split message if too long
      if (historyMessage.length > 4000) {
        const chunks = this.splitMessage(historyMessage, 4000);
        for (const chunk of chunks) {
          await this.telegram.sendMessage(msg.chat.id, chunk, {
            parse_mode: 'Markdown',
          });
        }
      } else {
        await this.telegram.sendMessage(msg.chat.id, historyMessage, {
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      console.error('Error showing transaction history:', error);
      await this.telegram.sendMessage(
        msg.chat.id,
        '❌ Errore durante il recupero della cronologia delle transazioni.',
      );
    }
  }

  async showChatId(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const username = msg.from?.username;
    const firstName = msg.from?.first_name;
    const lastName = msg.from?.last_name;

    const idMessage = `
🆔 **Informazioni Chat e Utente:**

**Chat ID:** \`${chatId}\`
**User ID:** \`${userId}\`
**Username:** @${username || 'N/A'}
**Nome:** ${firstName || 'N/A'} ${lastName || ''}

**Tipo Chat:** ${msg.chat.type}
**Titolo Chat:** ${msg.chat.title || 'N/A'}

💡 **Come usare:**
• Per chat private: usa il **User ID**
• Per gruppi: usa il **Chat ID** (numero negativo)
• Per canali: usa il **Chat ID** (numero negativo con -100)
    `;

    await this.telegram.sendMessage(msg.chat.id, idMessage, {
      parse_mode: 'Markdown',
    });
  }

  async showHelp(msg: TelegramMessage): Promise<void> {
    const helpMessage = `
🤖 **EnBot - Gestione Transazioni**

**Comandi disponibili:**
• /start - Inizia una nuova transazione
• /history - Mostra le ultime 10 transazioni
• /getid - Mostra ID chat e utente
• /testmsg @username - Invia messaggio di test a un utente
• /help - Mostra questo messaggio di aiuto
• /cancel - Annulla la transazione in corso

**Come utilizzare:**
1. Usa /start per iniziare
2. Segui le istruzioni per inserire:
   • Famiglia (selezione da menu)
   • Categoria (selezione da menu)
   • Importo in EUR
   • Periodo (formato: YYYY-MM-DD)
   • Username del contatto (@username)

**Categorie disponibili:**
• quota mensile
• quota iscrizione
• altro

**Comandi di test:**
• /testmsg @nome - Testa l'invio di messaggi
    `;

    await this.telegram.sendMessage(msg.chat.id, helpMessage, {
      parse_mode: 'Markdown',
    });
  }

  async sendTestMessage(msg: TelegramMessage, target: string): Promise<void> {
    try {
      console.log(`📤 Sending test message to: ${target}`);

      const testMessage = `
🧪 **Messaggio di Test**

Ciao! Questo è un messaggio di test inviato dal bot EnBot.

**Inviato da:** ${msg.from?.first_name} (${
        msg.from?.username ? '@' + msg.from.username : 'N/A'
      })
**Timestamp:** ${new Date().toLocaleString('it-IT')}

Se ricevi questo messaggio, significa che il bot può contattarti correttamente! ✅
      `;

      await this.telegram.sendMessage(msg.chat.id, 'Flusso completato!', {
        reply_markup: {
          inline_keyboard: [[{
            text: '💬 Invia messaggio privato',
            url: `https://t.me/${target}?text=${
              encodeURIComponent(testMessage)
            }`,
          }]],
        },
      });
    } catch (error) {
      console.error('❌ Error sending test message:', error);

      let errorMessage = "❌ Errore nell'invio del messaggio.";

      if (error instanceof Error) {
        if (error.message.includes('chat not found')) {
          errorMessage =
            "❌ Chat non trovata. L'utente potrebbe non aver mai scritto al bot.";
        } else if (error.message.includes('user is deactivated')) {
          errorMessage = "❌ L'utente è disattivato.";
        } else if (error.message.includes('blocked')) {
          errorMessage = "❌ L'utente ha bloccato il bot.";
        }
      }

      await this.telegram.sendMessage(msg.chat.id, errorMessage);
    }
  }

  private splitMessage(message: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const lines = message.split('\n');

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          chunks.push(line.substring(0, maxLength));
          currentChunk = line.substring(maxLength);
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
