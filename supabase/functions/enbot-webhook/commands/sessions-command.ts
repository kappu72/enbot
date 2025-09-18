import type { TelegramCallbackQuery, TelegramMessage } from '../types.ts';
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
  type CommandSession,
} from './command-interface.ts';

export class SessionsCommand extends BaseCommand {
  constructor(context: CommandContext) {
    super(context, 'sessions');
  }

  canHandle(message: TelegramMessage | TelegramCallbackQuery): boolean {
    if ('text' in message && message.text) {
      return message.text.startsWith('/sessions');
    }
    if ('data' in message && message.data) {
      return message.data.startsWith('sessions_');
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

      if (this.context.message?.text?.startsWith('/sessions')) {
        return await this.showSessionsMenu();
      }

      if (this.context.callbackQuery?.data) {
        return await this.handleCallback(this.context.callbackQuery);
      }

      return { success: false, error: 'Invalid input' };
    } catch (error) {
      console.error('❌ Error in SessionsCommand:', error);
      await this.sendMessage(
        "❌ Si è verificato un errore durante l'esecuzione del comando.",
      );
      return { success: false, error: error.message };
    }
  }

  private async showSessionsMenu(): Promise<CommandResult> {
    const stats = await this.context.sessionManager.getSessionStats();

    const messageText = `🗂️ **Gestione Sessioni**\n\n` +
      `📊 **Statistiche:**\n` +
      `• Sessioni totali: ${stats.total}\n` +
      `• Sessioni attive: ${stats.active}\n` +
      `• Sessioni scadute: ${stats.expired}\n\n` +
      `Seleziona un'azione:`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📋 Mostra Tutte le Sessioni',
            callback_data: 'sessions_show_all',
          },
        ],
        [
          {
            text: '🗑️ Pulisci Sessioni Scadute',
            callback_data: 'sessions_clean_expired',
          },
          {
            text: '🧹 Pulisci Tutte le Sessioni',
            callback_data: 'sessions_clean_all',
          },
        ],
        [
          {
            text: '🔄 Aggiorna Statistiche',
            callback_data: 'sessions_refresh',
          },
        ],
      ],
    };

    await this.sendMessage(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    return { success: true, message: 'Sessions menu displayed' };
  }

  private async handleCallback(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<CommandResult> {
    const action = callbackQuery.data?.replace('sessions_', '');

    await this.answerCallbackQuery(callbackQuery.id);

    switch (action) {
      case 'show_all':
        return await this.showAllSessions();
      case 'clean_expired':
        return await this.cleanExpiredSessions();
      case 'clean_all':
        return await this.cleanAllSessions();
      case 'refresh':
        return await this.showSessionsMenu();
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  private async showAllSessions(): Promise<CommandResult> {
    try {
      // Get all sessions from database
      const { data: allSessions, error } = await this.context.supabase
        .from('user_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!allSessions || allSessions.length === 0) {
        await this.sendMessage('📭 Nessuna sessione trovata nel database.');
        return { success: true, message: 'No sessions found' };
      }

      // Group sessions by status
      const now = new Date();
      const activeSessions = allSessions.filter((s) =>
        new Date(s.expires_at) > now
      );
      const expiredSessions = allSessions.filter((s) =>
        new Date(s.expires_at) <= now
      );

      let messageText = `🗂️ **Tutte le Sessioni (${allSessions.length})**\n\n`;

      if (activeSessions.length > 0) {
        messageText += `✅ **Sessioni Attive (${activeSessions.length}):**\n`;
        for (const session of activeSessions.slice(0, 10)) { // Limit to 10 for readability
          const createdAt = new Date(session.created_at).toLocaleString(
            'it-IT',
          );
          const expiresAt = new Date(session.expires_at).toLocaleString(
            'it-IT',
          );
          messageText +=
            `• User ${session.user_id} | ${session.command_type} | ${session.step}\n`;
          messageText += `  📅 ${createdAt} → ${expiresAt}\n`;
        }
        if (activeSessions.length > 10) {
          messageText += `  ... e altre ${
            activeSessions.length - 10
          } sessioni\n`;
        }
        messageText += '\n';
      }

      if (expiredSessions.length > 0) {
        messageText += `❌ **Sessioni Scadute (${expiredSessions.length}):**\n`;
        for (const session of expiredSessions.slice(0, 5)) { // Limit to 5 for readability
          const createdAt = new Date(session.created_at).toLocaleString(
            'it-IT',
          );
          messageText +=
            `• User ${session.user_id} | ${session.command_type} | ${session.step}\n`;
          messageText += `  📅 ${createdAt}\n`;
        }
        if (expiredSessions.length > 5) {
          messageText += `  ... e altre ${
            expiredSessions.length - 5
          } sessioni\n`;
        }
      }

      // Add back button
      const keyboard = {
        inline_keyboard: [
          [{ text: '« Torna al Menu', callback_data: 'sessions_refresh' }],
        ],
      };

      await this.sendMessage(messageText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      return { success: true, message: 'All sessions displayed' };
    } catch (error) {
      console.error('❌ Error showing all sessions:', error);
      await this.sendMessage('❌ Errore nel recuperare le sessioni.');
      return { success: false, error: error.message };
    }
  }

  private async cleanExpiredSessions(): Promise<CommandResult> {
    try {
      const result = await this.context.sessionManager
        .cleanAllExpiredSessions();

      await this.sendMessage(
        `🧹 **Pulizia Completata**\n\n` +
          `Sessioni scadute eliminate: **${result.deleted}**`,
        { parse_mode: 'Markdown' },
      );

      // Show updated menu
      setTimeout(() => this.showSessionsMenu(), 1000);

      return {
        success: true,
        message: `Cleaned ${result.deleted} expired sessions`,
      };
    } catch (error) {
      console.error('❌ Error cleaning expired sessions:', error);
      await this.sendMessage(
        '❌ Errore durante la pulizia delle sessioni scadute.',
      );
      return { success: false, error: error.message };
    }
  }

  private async cleanAllSessions(): Promise<CommandResult> {
    try {
      // Show confirmation dialog
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '✅ Sì, Elimina Tutto',
              callback_data: 'sessions_confirm_clean_all',
            },
            { text: '❌ Annulla', callback_data: 'sessions_refresh' },
          ],
        ],
      };

      if (this.context.callbackQuery?.data === 'sessions_confirm_clean_all') {
        // Execute the cleanup
        const result = await this.context.sessionManager.cleanAllSessions();

        await this.sendMessage(
          `🧹 **Pulizia Totale Completata**\n\n` +
            `Tutte le sessioni eliminate: **${result.deleted}**\n\n` +
            `⚠️ Tutti gli utenti dovranno ricominciare le loro operazioni.`,
          { parse_mode: 'Markdown' },
        );

        // Show updated menu
        setTimeout(() => this.showSessionsMenu(), 1000);

        return {
          success: true,
          message: `Cleaned all ${result.deleted} sessions`,
        };
      } else {
        // Show confirmation
        await this.sendMessage(
          `⚠️ **ATTENZIONE**\n\n` +
            `Stai per eliminare **TUTTE** le sessioni dal database.\n` +
            `Questo cancellerà tutti i progressi degli utenti.\n\n` +
            `Sei sicuro di voler continuare?`,
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          },
        );

        return { success: true, message: 'Confirmation requested' };
      }
    } catch (error) {
      console.error('❌ Error cleaning all sessions:', error);
      await this.sendMessage(
        '❌ Errore durante la pulizia di tutte le sessioni.',
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
    return '/sessions - Gestisci le sessioni utente (solo admin)';
  }

  getDescription(): string {
    return 'Visualizza statistiche, mostra tutte le sessioni e pulisci sessioni scadute o tutte le sessioni. Comando disponibile solo per gli amministratori.';
  }
}
