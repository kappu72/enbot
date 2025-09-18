import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
  type CommandSession,
} from './command-interface.ts';

export class TransactionsCommand extends BaseCommand {
  constructor(context: CommandContext) {
    super(context, 'transactions');
  }

  canHandle(message: TelegramMessage | TelegramCallbackQuery): boolean {
    if ('text' in message && message.text) {
      return message.text.startsWith('/transactions');
    }
    if ('data' in message && message.data) {
      return message.data.startsWith('transactions_');
    }
    return false;
  }

  async execute(): Promise<CommandResult> {
    try {
      // Check if user is admin
      if (!this.isAdmin()) {
        await this.sendMessage(
          '❌ Questo comando è disponibile solo per gli amministratori.',
        );
        return { success: false, error: 'Not authorized' };
      }

      if (this.context.message?.text?.startsWith('/transactions')) {
        return await this.showTransactionsMenu();
      }

      if (this.context.callbackQuery?.data) {
        return await this.handleCallback(this.context.callbackQuery);
      }

      return { success: false, error: 'Invalid input' };
    } catch (error) {
      console.error('❌ Error in TransactionsCommand:', error);
      await this.sendMessage(
        "❌ Si è verificato un errore durante l'esecuzione del comando.",
      );
      return { success: false, error: error.message };
    }
  }

  private async showTransactionsMenu(): Promise<CommandResult> {
    const stats = await this.getTransactionStats();

    const messageText = `💰 **Gestione Transazioni**\n\n` +
      `📊 **Statistiche:**\n` +
      `• Transazioni totali: ${stats.total}\n` +
      `• Ultimo mese: ${stats.lastMonth}\n` +
      `• Ultima settimana: ${stats.lastWeek}\n` +
      `• Oggi: ${stats.today}\n\n` +
      `Seleziona un'azione:`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📋 Mostra Tutte le Transazioni',
            callback_data: 'transactions_show_all',
          },
        ],
        [
          {
            text: '📅 Transazioni Recenti (7gg)',
            callback_data: 'transactions_show_recent',
          },
          {
            text: '📊 Statistiche Dettagliate',
            callback_data: 'transactions_show_stats',
          },
        ],
        [
          {
            text: '🗑️ Elimina Vecchie (>1 anno)',
            callback_data: 'transactions_clean_old',
          },
          { text: '🧹 Elimina Tutte', callback_data: 'transactions_clean_all' },
        ],
        [
          {
            text: '🔄 Aggiorna Statistiche',
            callback_data: 'transactions_refresh',
          },
        ],
      ],
    };

    await this.sendMessage(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    return { success: true, message: 'Transactions menu displayed' };
  }

  private async handleCallback(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const action = callbackQuery.data?.replace('transactions_', '');

    await this.answerCallbackQuery(callbackQuery.id);

    switch (action) {
      case 'show_all':
        return await this.showAllTransactions();
      case 'show_recent':
        return await this.showRecentTransactions();
      case 'show_stats':
        return await this.showDetailedStats();
      case 'clean_old':
        return await this.cleanOldTransactions();
      case 'clean_all':
        return await this.cleanAllTransactions();
      case 'refresh':
        return await this.showTransactionsMenu();
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  private async getTransactionStats(): Promise<{
    total: number;
    lastMonth: number;
    lastWeek: number;
    today: number;
  }> {
    try {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      // Get total count
      const { count: totalCount, error: totalError } = await this.context
        .supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get last month count
      const { count: monthCount, error: monthError } = await this.context
        .supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

      if (monthError) throw monthError;

      // Get last week count
      const { count: weekCount, error: weekError } = await this.context.supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      if (weekError) throw weekError;

      // Get today count
      const { count: todayCount, error: todayError } = await this.context
        .supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      if (todayError) throw todayError;

      return {
        total: totalCount || 0,
        lastMonth: monthCount || 0,
        lastWeek: weekCount || 0,
        today: todayCount || 0,
      };
    } catch (error) {
      console.error('❌ Error getting transaction stats:', error);
      return { total: 0, lastMonth: 0, lastWeek: 0, today: 0 };
    }
  }

  private async showAllTransactions(): Promise<CommandResult> {
    try {
      const { data: transactions, error } = await this.context.supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20); // Limit to last 20 transactions

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        await this.sendMessage('📭 Nessuna transazione trovata nel database.');
        return { success: true, message: 'No transactions found' };
      }

      let messageText = `💰 **Tutte le Transazioni (ultime 20)**\n\n`;

      for (const transaction of transactions) {
        const date = new Date(transaction.created_at).toLocaleString('it-IT');
        const amount = parseFloat(transaction.amount).toFixed(2);
        messageText +=
          `💶 **€${amount}** | ${transaction.family} | ${transaction.category}\n`;
        messageText += `📅 ${date} | ${transaction.period}\n`;
        if (transaction.contact) {
          messageText += `👤 ${transaction.contact}\n`;
        }
        messageText += `\n`;
      }

      // Add back button
      const keyboard = {
        inline_keyboard: [
          [{ text: '« Torna al Menu', callback_data: 'transactions_refresh' }],
        ],
      };

      await this.sendMessage(messageText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      return { success: true, message: 'All transactions displayed' };
    } catch (error) {
      console.error('❌ Error showing all transactions:', error);
      await this.sendMessage('❌ Errore nel recuperare le transazioni.');
      return { success: false, error: error.message };
    }
  }

  private async showRecentTransactions(): Promise<CommandResult> {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data: transactions, error } = await this.context.supabase
        .from('transactions')
        .select('*')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        await this.sendMessage('📭 Nessuna transazione negli ultimi 7 giorni.');
        return { success: true, message: 'No recent transactions found' };
      }

      let messageText = `💰 **Transazioni Recenti (ultimi 7 giorni)**\n\n`;
      let totalAmount = 0;

      for (const transaction of transactions) {
        const date = new Date(transaction.created_at).toLocaleString('it-IT');
        const amount = parseFloat(transaction.amount);
        totalAmount += amount;
        messageText += `💶 **€${
          amount.toFixed(2)
        }** | ${transaction.family} | ${transaction.category}\n`;
        messageText += `📅 ${date}\n\n`;
      }

      messageText += `📊 **Totale: €${
        totalAmount.toFixed(2)
      }** (${transactions.length} transazioni)`;

      // Add back button
      const keyboard = {
        inline_keyboard: [
          [{ text: '« Torna al Menu', callback_data: 'transactions_refresh' }],
        ],
      };

      await this.sendMessage(messageText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      return { success: true, message: 'Recent transactions displayed' };
    } catch (error) {
      console.error('❌ Error showing recent transactions:', error);
      await this.sendMessage(
        '❌ Errore nel recuperare le transazioni recenti.',
      );
      return { success: false, error: error.message };
    }
  }

  private async showDetailedStats(): Promise<CommandResult> {
    try {
      // Get transactions by family and category
      const { data: transactions, error } = await this.context.supabase
        .from('transactions')
        .select('*')
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        await this.sendMessage("📭 Nessuna transazione nell'ultimo mese.");
        return { success: true, message: 'No transactions found' };
      }

      // Aggregate by family
      const familyStats: Record<string, { count: number; total: number }> = {};
      const categoryStats: Record<string, { count: number; total: number }> =
        {};
      let totalAmount = 0;

      for (const transaction of transactions) {
        const amount = parseFloat(transaction.amount);
        totalAmount += amount;

        // Family stats
        if (!familyStats[transaction.family]) {
          familyStats[transaction.family] = { count: 0, total: 0 };
        }
        familyStats[transaction.family].count++;
        familyStats[transaction.family].total += amount;

        // Category stats
        if (!categoryStats[transaction.category]) {
          categoryStats[transaction.category] = { count: 0, total: 0 };
        }
        categoryStats[transaction.category].count++;
        categoryStats[transaction.category].total += amount;
      }

      let messageText = `📊 **Statistiche Dettagliate (ultimo mese)**\n\n`;
      messageText += `💰 **Totale generale: €${
        totalAmount.toFixed(2)
      }** (${transactions.length} transazioni)\n\n`;

      messageText += `👥 **Per Famiglia:**\n`;
      for (const [family, stats] of Object.entries(familyStats)) {
        messageText += `• ${family}: €${
          stats.total.toFixed(2)
        } (${stats.count} transazioni)\n`;
      }

      messageText += `\n🏷️ **Per Categoria:**\n`;
      for (const [category, stats] of Object.entries(categoryStats)) {
        messageText += `• ${category}: €${
          stats.total.toFixed(2)
        } (${stats.count} transazioni)\n`;
      }

      // Add back button
      const keyboard = {
        inline_keyboard: [
          [{ text: '« Torna al Menu', callback_data: 'transactions_refresh' }],
        ],
      };

      await this.sendMessage(messageText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      return { success: true, message: 'Detailed stats displayed' };
    } catch (error) {
      console.error('❌ Error showing detailed stats:', error);
      await this.sendMessage(
        '❌ Errore nel calcolare le statistiche dettagliate.',
      );
      return { success: false, error: error.message };
    }
  }

  private async cleanOldTransactions(): Promise<CommandResult> {
    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      // Show confirmation dialog
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '✅ Sì, Elimina',
              callback_data: 'transactions_confirm_clean_old',
            },
            { text: '❌ Annulla', callback_data: 'transactions_refresh' },
          ],
        ],
      };

      if (
        this.context.callbackQuery?.data === 'transactions_confirm_clean_old'
      ) {
        // Execute the cleanup
        const { count, error } = await this.context.supabase
          .from('transactions')
          .delete({ count: 'exact' })
          .lt('created_at', oneYearAgo.toISOString());

        if (error) throw error;

        await this.sendMessage(
          `🧹 **Pulizia Completata**\n\n` +
            `Transazioni vecchie eliminate: **${count || 0}**\n` +
            `(più di 1 anno fa)`,
          { parse_mode: 'Markdown' },
        );

        // Show updated menu
        setTimeout(() => this.showTransactionsMenu(), 1000);

        return {
          success: true,
          message: `Cleaned ${count || 0} old transactions`,
        };
      } else {
        // Show confirmation
        await this.sendMessage(
          `⚠️ **CONFERMA ELIMINAZIONE**\n\n` +
            `Stai per eliminare tutte le transazioni più vecchie di 1 anno.\n` +
            `Questa operazione non può essere annullata.\n\n` +
            `Vuoi continuare?`,
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          },
        );

        return { success: true, message: 'Confirmation requested' };
      }
    } catch (error) {
      console.error('❌ Error cleaning old transactions:', error);
      await this.sendMessage(
        '❌ Errore durante la pulizia delle transazioni vecchie.',
      );
      return { success: false, error: error.message };
    }
  }

  private async cleanAllTransactions(): Promise<CommandResult> {
    try {
      // Show confirmation dialog
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '✅ Sì, Elimina Tutto',
              callback_data: 'transactions_confirm_clean_all',
            },
            { text: '❌ Annulla', callback_data: 'transactions_refresh' },
          ],
        ],
      };

      if (
        this.context.callbackQuery?.data === 'transactions_confirm_clean_all'
      ) {
        // Execute the cleanup
        const { count, error } = await this.context.supabase
          .from('transactions')
          .delete({ count: 'exact' });

        if (error) throw error;

        await this.sendMessage(
          `🧹 **Pulizia Totale Completata**\n\n` +
            `Tutte le transazioni eliminate: **${count || 0}**\n\n` +
            `⚠️ Il database delle transazioni è ora vuoto.`,
          { parse_mode: 'Markdown' },
        );

        // Show updated menu
        setTimeout(() => this.showTransactionsMenu(), 1000);

        return {
          success: true,
          message: `Cleaned all ${count || 0} transactions`,
        };
      } else {
        // Show confirmation
        await this.sendMessage(
          `🚨 **ATTENZIONE MASSIMA** 🚨\n\n` +
            `Stai per eliminare **TUTTE** le transazioni dal database.\n` +
            `Questa operazione cancellerà **TUTTI I DATI** permanentemente.\n\n` +
            `⚠️ **NON È POSSIBILE ANNULLARE QUESTA OPERAZIONE**\n\n` +
            `Sei ASSOLUTAMENTE sicuro di voler continuare?`,
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          },
        );

        return { success: true, message: 'Confirmation requested' };
      }
    } catch (error) {
      console.error('❌ Error cleaning all transactions:', error);
      await this.sendMessage(
        '❌ Errore durante la pulizia di tutte le transazioni.',
      );
      return { success: false, error: error.message };
    }
  }

  private isAdmin(): boolean {
    // Check if the context has access to config admin IDs
    const adminUserIds = [537383337]; // Fallback admin ID
    return adminUserIds.includes(this.context.userId);
  }

  getHelpText(): string {
    return '/transactions - Gestisci le transazioni (solo admin)';
  }

  getDescription(): string {
    return 'Visualizza statistiche, mostra tutte le transazioni, analizza dati e pulisci transazioni vecchie o tutte le transazioni. Comando disponibile solo per gli amministratori.';
  }
}
