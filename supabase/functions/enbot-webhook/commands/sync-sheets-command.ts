// Google Sheets sync command for bulk operations
import type { CommandContext, CommandResult } from './command-interface.ts';
import { BaseCommand } from './command-interface.ts';
import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import { createGoogleSheetsClient } from '../google-sheets-client.ts';

export class SyncSheetsCommand extends BaseCommand {
  constructor(context: CommandContext) {
    super(context, 'sync-sheets');
  }

  canHandle(
    message: TelegramMessage | TelegramCallbackQuery,
  ): Promise<boolean> {
    if ('text' in message) {
      return Promise.resolve(
        message.text === '/sync-sheets' || message.text === '/sync_sheets',
      );
    } else if ('data' in message) {
      return Promise.resolve(message.data?.startsWith('sync_') || false);
    }
    return Promise.resolve(false);
  }

  async execute(): Promise<CommandResult> {
    if (this.context.message) {
      return await this.handleMessage(this.context.message);
    } else if (this.context.callbackQuery) {
      return await this.handleCallbackQuery(this.context.callbackQuery);
    }

    return { success: false, message: 'No message or callback query provided' };
  }

  private async handleMessage(
    message: TelegramMessage,
  ): Promise<CommandResult> {
    if (message.text === '/sync-sheets' || message.text === '/sync_sheets') {
      return await this.showSyncOptions();
    }

    return { success: false, message: 'Unknown command' };
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const data = callbackQuery.data!;

    if (data === 'sync_all') {
      return await this.syncAllTransactions(callbackQuery);
    } else if (data === 'sync_recent') {
      return await this.syncRecentTransactions(callbackQuery);
    } else if (data === 'clear_sheets') {
      return await this.clearGoogleSheets(callbackQuery);
    } else if (data === 'sync_cancel') {
      await this.answerCallbackQuery(
        callbackQuery.id,
        'Operazione annullata',
        callbackQuery.message!.chat.id,
        callbackQuery.message!.message_id,
      );
      return { success: true, message: 'Operation cancelled' };
    }

    return { success: false, message: 'Unknown callback data' };
  }

  private async showSyncOptions(): Promise<CommandResult> {
    const googleSheetsClient = createGoogleSheetsClient();
    if (!googleSheetsClient) {
      await this.sendMessage(
        "❌ L'integrazione con Google Sheets non è configurata.\n\n" +
          "Per configurarla, imposta le seguenti variabili d'ambiente:\n" +
          '• `GOOGLE_SERVICE_ACCOUNT_KEY`\n' +
          '• `GOOGLE_SPREADSHEET_ID`\n' +
          '• `GOOGLE_SHEET_NAME` (opzionale)',
      );
      return { success: false, message: 'Google Sheets not configured' };
    }

    const message = `📊 **Sincronizzazione Google Sheets**

Seleziona l'operazione da eseguire:

📤 **Sincronizza Tutto** - Esporta tutte le transazioni dal database a Google Sheets
📅 **Sincronizza Recenti** - Esporta solo le transazioni dell'ultima settimana
🗑️ **Pulisci Fogli** - Rimuove tutti i dati dal foglio Google (mantiene le intestazioni)

⚠️ **Attenzione:** L'operazione di sincronizzazione sovrascriverà i dati esistenti nel foglio.`;

    await this.sendMessage(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📤 Sincronizza Tutto', callback_data: 'sync_all' },
            { text: '📅 Sincronizza Recenti', callback_data: 'sync_recent' },
          ],
          [
            { text: '🗑️ Pulisci Fogli', callback_data: 'clear_sheets' },
          ],
          [
            { text: '❌ Annulla', callback_data: 'sync_cancel' },
          ],
        ],
      },
    });

    return { success: true, message: 'Sync options shown' };
  }

  private async syncAllTransactions(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    try {
      await this.answerCallbackQuery(
        callbackQuery.id,
        'Iniziando sincronizzazione completa...',
        callbackQuery.message!.chat.id,
        callbackQuery.message!.message_id,
      );

      await this.sendMessage(
        '⏳ Recuperando tutte le transazioni dal database...',
      );

      const googleSheetsClient = createGoogleSheetsClient();
      if (!googleSheetsClient) {
        throw new Error('Google Sheets client not configured');
      }

      // Get all transactions from database con la nuova struttura
      const { data: transactions, error } = await this.context.supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!transactions || transactions.length === 0) {
        await this.sendMessage('ℹ️ Nessuna transazione trovata nel database.');
        return { success: true, message: 'No transactions found' };
      }

      await this.sendMessage(
        `📤 Sincronizzando ${transactions.length} transazioni su Google Sheets...`,
      );

      // Clear existing data first
      await googleSheetsClient.clearTransactions();

      // Convert database format to Google Sheets format
      const sheetsTransactions = transactions.map((t) => ({
        id: t.id,
        family: t.payload.family,
        category: t.payload.category,
        amount: t.payload.amount,
        period: t.payload.period,
        contact: t.payload.contact,
        recordedBy: t.payload.recordedBy,
        recordedAt: t.payload.recordedAt,
        chatId: t.chat_id,
      }));

      // Push all transactions to Google Sheets
      await googleSheetsClient.pushTransactions(sheetsTransactions);

      // Aggiorna il flag is_synced per tutte le transazioni sincronizzate
      await this.markTransactionsAsSynced(transactions.map((t) => t.id));

      await this.sendMessage(
        `✅ **Sincronizzazione completata!**

📊 **Risultati:**
• **Transazioni sincronizzate:** ${transactions.length}
• **Periodo:** Dal ${transactions[0].created_at.split('T')[0]} al ${
          transactions[transactions.length - 1].created_at.split('T')[0]
        }

Le transazioni sono ora disponibili nel foglio Google Sheets.`,
        { parse_mode: 'Markdown' },
      );

      return { success: true, message: 'All transactions synced successfully' };
    } catch (error) {
      console.error('❌ Error syncing all transactions:', error);
      await this.sendMessage(
        `❌ **Errore durante la sincronizzazione:**\n\n${
          error instanceof Error ? error.message : 'Errore sconosciuto'
        }\n\nRiprova più tardi o contatta il supporto.`,
        { parse_mode: 'Markdown' },
      );
      return { success: false, message: 'Sync error' };
    }
  }

  private async syncRecentTransactions(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    try {
      await this.answerCallbackQuery(
        callbackQuery.id,
        'Sincronizzando transazioni recenti...',
        callbackQuery.message!.chat.id,
        callbackQuery.message!.message_id,
      );

      await this.sendMessage(
        "⏳ Recuperando le transazioni dell'ultima settimana...",
      );

      const googleSheetsClient = createGoogleSheetsClient();
      if (!googleSheetsClient) {
        throw new Error('Google Sheets client not configured');
      }

      // Get transactions from the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: transactions, error } = await this.context.supabase
        .from('transactions')
        .select('*')
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!transactions || transactions.length === 0) {
        await this.sendMessage(
          "ℹ️ Nessuna transazione trovata nell'ultima settimana.",
        );
        return { success: true, message: 'No recent transactions found' };
      }

      await this.sendMessage(
        `📤 Sincronizzando ${transactions.length} transazioni recenti su Google Sheets...`,
      );

      // Convert database format to Google Sheets format
      const sheetsTransactions = transactions.map((t) => ({
        id: t.id,
        family: t.payload.family,
        category: t.payload.category,
        amount: t.payload.amount,
        period: t.payload.period,
        contact: t.payload.contact,
        recordedBy: t.payload.recordedBy,
        recordedAt: t.payload.recordedAt,
        chatId: t.chat_id,
      }));

      // Push recent transactions to Google Sheets (append mode)
      await googleSheetsClient.pushTransactions(sheetsTransactions);

      // Aggiorna il flag is_synced per le transazioni sincronizzate
      await this.markTransactionsAsSynced(transactions.map((t) => t.id));

      await this.sendMessage(
        `✅ **Sincronizzazione completata!**

📊 **Risultati:**
• **Transazioni sincronizzate:** ${transactions.length}
• **Periodo:** Ultima settimana (dal ${oneWeekAgo.toISOString().split('T')[0]})

Le transazioni recenti sono state aggiunte al foglio Google Sheets.`,
        { parse_mode: 'Markdown' },
      );

      return {
        success: true,
        message: 'Recent transactions synced successfully',
      };
    } catch (error) {
      console.error('❌ Error syncing recent transactions:', error);
      await this.sendMessage(
        `❌ **Errore durante la sincronizzazione:**\n\n${
          error instanceof Error ? error.message : 'Errore sconosciuto'
        }\n\nRiprova più tardi o contatta il supporto.`,
        { parse_mode: 'Markdown' },
      );
      return { success: false, message: 'Recent sync error' };
    }
  }

  private async clearGoogleSheets(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    try {
      await this.answerCallbackQuery(
        callbackQuery.id,
        'Pulendo il foglio Google Sheets...',
        callbackQuery.message!.chat.id,
        callbackQuery.message!.message_id,
      );

      await this.sendMessage(
        '⏳ Rimuovendo tutti i dati dal foglio Google Sheets...',
      );

      const googleSheetsClient = createGoogleSheetsClient();
      if (!googleSheetsClient) {
        throw new Error('Google Sheets client not configured');
      }

      await googleSheetsClient.clearTransactions();

      await this.sendMessage(
        '✅ **Foglio pulito con successo!**\n\nTutti i dati delle transazioni sono stati rimossi dal foglio Google Sheets. Le intestazioni sono state mantenute.',
        { parse_mode: 'Markdown' },
      );

      return { success: true, message: 'Google Sheets cleared successfully' };
    } catch (error) {
      console.error('❌ Error clearing Google Sheets:', error);
      await this.sendMessage(
        `❌ **Errore durante la pulizia:**\n\n${
          error instanceof Error ? error.message : 'Errore sconosciuto'
        }\n\nRiprova più tardi o contatta il supporto.`,
        { parse_mode: 'Markdown' },
      );
      return { success: false, message: 'Clear error' };
    }
  }

  /**
   * Marca le transazioni come sincronizzate nel database
   */
  private async markTransactionsAsSynced(
    transactionIds: number[],
  ): Promise<void> {
    if (transactionIds.length === 0) return;

    try {
      const { error } = await this.context.supabase
        .from('transactions')
        .update({
          is_synced: true,
          synced_at: new Date().toISOString(),
        })
        .in('id', transactionIds);

      if (error) {
        console.error(
          '❌ Failed to update sync status for bulk transactions:',
          error,
        );
      } else {
        console.log(
          `✅ Marked ${transactionIds.length} transactions as synced`,
        );
      }
    } catch (error) {
      console.error('❌ Error marking transactions as synced:', error);
    }
  }

  getHelpText(): string {
    return '/sync-sheets - Gestisce la sincronizzazione con Google Sheets';
  }

  getDescription(): string {
    return 'Sincronizza le transazioni del database con Google Sheets. Consente di esportare tutte le transazioni, quelle recenti o pulire il foglio.';
  }
}
