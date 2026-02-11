// Sync command implementation - finds and reports missing transactions on Google Sheets
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
  type CommandSession,
} from './command-interface.ts';

/**
 * Mapping from DB command_type to Google Sheets tab name
 */
const SHEET_TAB_MAPPING: Record<string, string> = {
  'entrata': 'Entrate Cassa',
  'uscita': 'Uscite Cassa',
  'notacredito': 'Note di credito',
};

/**
 * Friendly Italian labels for command types
 */
const COMMAND_TYPE_LABELS: Record<string, string> = {
  'entrata': 'Entrata',
  'uscita': 'Uscita',
  'notacredito': 'Nota di credito',
};

interface MissingTransaction {
  id: number;
  commandType: string;
  category: string;
  amount: number;
  family: string;
  year: string;
  month: string;
  description: string;
  recordedAt: string;
  recordedBy: string;
  createdAt: string;
  reason: string;
}

/**
 * Escape special HTML characters for Telegram HTML parse mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class SyncCommand extends BaseCommand {
  static commandName = 'sync';
  static description = '🔄 Verifica e sincronizza transazioni mancanti';

  constructor(context: CommandContext) {
    super(context, SyncCommand.commandName);
  }

  protected override async startCommand(): Promise<CommandResult> {
    // Check if Google Sheets client is available
    if (!this.context.googleSheetsClient) {
      await this.context.telegram.sendMessage(
        this.context.chatId,
        '❌ Google Sheets non configurato. Imposta GOOGLE_SERVICE_ACCOUNT_KEY e GOOGLE_SPREADSHEET_ID.',
        { parse_mode: 'HTML' },
      );
      return { success: false, error: 'Google Sheets not configured' };
    }

    // Send progress message
    await this.context.telegram.sendMessage(
      this.context.chatId,
      '🔄 Analisi sincronizzazione in corso...',
      { parse_mode: 'HTML' },
    );

    try {
      // 1. Fetch ALL transactions from DB
      const { data: allTransactions, error: dbError } = await this.context
        .supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: true });

      if (dbError || !allTransactions) {
        console.error('❌ SyncCommand: Failed to fetch transactions:', dbError);
        await this.context.telegram.sendMessage(
          this.context.chatId,
          '❌ Errore nel recupero delle transazioni dal database.',
          { parse_mode: 'HTML' },
        );
        return { success: false, error: 'DB error' };
      }

      console.log(
        `🔍 SyncCommand: Found ${allTransactions.length} total transactions in DB`,
      );

      // 2. Read existing data from each Google Sheets tab
      const existingSheetData: Record<string, string[][]> = {};
      for (
        const [commandType, sheetName] of Object.entries(SHEET_TAB_MAPPING)
      ) {
        console.log(
          `🔍 SyncCommand: Reading sheet tab "${sheetName}" for type "${commandType}"`,
        );
        existingSheetData[commandType] = await this.context.googleSheetsClient
          .getSheetData(sheetName);
        console.log(
          `📊 SyncCommand: Found ${
            existingSheetData[commandType].length
          } rows in "${sheetName}"`,
        );
      }

      // 3. Find missing transactions
      const missingTransactions: MissingTransaction[] = [];

      for (const tx of allTransactions) {
        const commandType = tx.command_type;
        const payload = tx.payload;
        const recordedAt = payload.recorded_at || tx.created_at;

        if (!tx.is_synced) {
          // is_synced = false -> definitely missing from sheet
          missingTransactions.push({
            id: tx.id,
            commandType,
            category: payload.category || '',
            amount: parseFloat(payload.amount) || 0,
            family: payload.family || '',
            year: payload.year || '',
            month: payload.month || '',
            description: payload.description || '',
            recordedAt,
            recordedBy: payload.recorded_by || '',
            createdAt: tx.created_at,
            reason: 'Non sincronizzata (is_synced=false)',
          });
        } else {
          // is_synced = true -> check if actually present on the sheet
          const sheetRows = existingSheetData[commandType] || [];

          // Compare using recordedAt (column G, index 6) as unique key
          const found = sheetRows.some((row) => {
            const sheetRecordedAt = row[6] || '';
            return sheetRecordedAt === recordedAt;
          });

          if (!found) {
            missingTransactions.push({
              id: tx.id,
              commandType,
              category: payload.category || '',
              amount: parseFloat(payload.amount) || 0,
              family: payload.family || '',
              year: payload.year || '',
              month: payload.month || '',
              description: payload.description || '',
              recordedAt,
              recordedBy: payload.recorded_by || '',
              createdAt: tx.created_at,
              reason: 'Segnata sync ma assente da Sheet',
            });
          }
        }
      }

      console.log(
        `🔍 SyncCommand: Found ${missingTransactions.length} missing transactions`,
      );

      // 4. If no missing transactions, report success
      if (missingTransactions.length === 0) {
        await this.context.telegram.sendMessage(
          this.context.chatId,
          `✅ <b>Tutto sincronizzato</b>\n\nTutte le <b>${allTransactions.length}</b> transazioni del DB sono presenti sui rispettivi fogli Google Sheets.`,
          { parse_mode: 'HTML' },
        );
        return { success: true, message: 'All transactions synced' };
      }

      // 5. Create sync tab with all missing transactions
      const now = new Date();
      const pad = (n: number): string => String(n).padStart(2, '0');
      const syncTabName = `Sync ${now.getFullYear()}-${
        pad(now.getMonth() + 1)
      }-${pad(now.getDate())} ${pad(now.getHours())}.${
        pad(now.getMinutes())
      }`;

      const headers = [
        'ID',
        'Tipo',
        'Categoria',
        'Valore',
        'Anno ref',
        'Mese ref',
        'Descrizione',
        'Controparte',
        'Data creazione',
        'Creato da',
        'Motivo',
      ];

      const rows: (string | number)[][] = missingTransactions.map((tx) => [
        tx.id,
        COMMAND_TYPE_LABELS[tx.commandType] || tx.commandType,
        tx.category,
        tx.amount,
        tx.year,
        tx.month,
        tx.description,
        tx.family,
        tx.recordedAt,
        tx.recordedBy,
        tx.reason,
      ]);

      await this.context.googleSheetsClient.createCustomSheet(
        syncTabName,
        headers,
        rows,
      );

      console.log(
        `✅ SyncCommand: Created sync tab "${syncTabName}" with ${rows.length} rows`,
      );

      // 6. Build and send summary message (using HTML to avoid MarkdownV2 escaping issues)
      const unsyncedCount = missingTransactions.filter(
        (t) => t.reason.includes('is_synced=false'),
      ).length;
      const ghostSyncedCount = missingTransactions.length - unsyncedCount;

      // Count per type
      const countByType: Record<string, number> = {};
      for (const tx of missingTransactions) {
        const label = COMMAND_TYPE_LABELS[tx.commandType] || tx.commandType;
        countByType[label] = (countByType[label] || 0) + 1;
      }

      const typeBreakdown = Object.entries(countByType)
        .map(([label, count]) =>
          `  • <b>${count}</b> ${escapeHtml(label)}`
        )
        .join('\n');

      const summaryLines = [
        `🔄 <b>Sync completato</b>`,
        '',
        `Trovate <b>${missingTransactions.length}</b> transazioni mancanti:`,
        '',
      ];

      if (unsyncedCount > 0) {
        summaryLines.push(
          `• <b>${unsyncedCount}</b> mai sincronizzate (is_synced=false)`,
        );
      }

      if (ghostSyncedCount > 0) {
        summaryLines.push(
          `• <b>${ghostSyncedCount}</b> segnate come sincronizzate ma assenti da Sheet`,
        );
      }

      summaryLines.push('');
      summaryLines.push('<b>Per tipo:</b>');
      summaryLines.push(typeBreakdown);
      summaryLines.push('');
      summaryLines.push(
        `📋 Salvate nel tab <b>"${escapeHtml(syncTabName)}"</b>`,
      );

      await this.context.telegram.sendMessage(
        this.context.chatId,
        summaryLines.join('\n'),
        { parse_mode: 'HTML' },
      );

      return {
        success: true,
        message:
          `Sync completed: ${missingTransactions.length} missing transactions saved to "${syncTabName}"`,
      };
    } catch (error) {
      console.error('❌ SyncCommand: Error during sync:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.context.telegram.sendMessage(
        this.context.chatId,
        `❌ <b>Errore durante la sincronizzazione</b>\n\n${escapeHtml(errorMsg)}`,
        { parse_mode: 'HTML' },
      );
      return { success: false, error: 'Sync error' };
    }
  }

  protected override async handleTextInput(
    _text: string,
  ): Promise<CommandResult> {
    return {
      success: false,
      error: 'Il comando /sync non accetta input di testo',
    };
  }

  protected override async handleCallbackData(
    _data: string,
    _session: CommandSession,
  ): Promise<CommandResult> {
    return {
      success: false,
      error: 'Il comando /sync non accetta callback',
    };
  }

  override getHelpText(): string {
    return '/sync - Verifica e sincronizza transazioni mancanti su Google Sheets';
  }

  override getDescription(): string {
    return SyncCommand.description;
  }
}
