// Cancel command implementation
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from './command-interface.ts';

export class CancelCommand extends BaseCommand {
  static commandName = 'cancel';
  static description = '❌ Cancella la sessione attiva corrente';

  constructor(context: CommandContext) {
    super(context, CancelCommand.commandName);
  }

  override getHelpText(): string {
    return '/cancel - Cancella la sessione attiva corrente';
  }

  override getDescription(): string {
    return CancelCommand.description;
  }

  protected async startCommand(): Promise<CommandResult> {
    // Check if user has an active session
    const userSession = await this.context.sessionManager.loadUserSession(
      this.context.userId,
      this.context.chatId,
    );

    if (!userSession) {
      // No active session
      const noSessionMessage = `❌ Nessuna sessione attiva da cancellare`;
      await this.sendMessage(noSessionMessage);
      return { success: true, message: 'No active session to cancel' };
    }

    // Show confirmation prompt
    const confirmationMessage =
      `⚠️ Sei sicuro di voler cancellare la sessione attiva?\n\n` +
      `📋 Comando in corso: *${userSession.command_type}*\n` +
      `🔄 Stato: *${userSession.step}*\n\n` +
      `Tutti i dati inseriti finora andranno persi\\.`;

    const keyboard = [
      [
        { text: '✅ Conferma', callback_data: 'CONFIRM_CANCEL' },
        { text: '❌ Annulla', callback_data: 'CANCEL_CANCEL' },
      ],
    ];

    await this.sendMessage(confirmationMessage, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });

    return { success: true, message: 'Confirmation prompt sent' };
  }

  protected async handleTextInput(_text: string): Promise<CommandResult> {
    // Check if text contains "conferma" or "si"
    const confirmText = _text.toLowerCase().trim();
    if (
      confirmText.includes('conferma') ||
      confirmText.includes('sì') ||
      confirmText === 'si'
    ) {
      return await this.handleCallbackData('CONFIRM_CANCEL');
    } else {
      return await this.handleCallbackData('CANCEL_CANCEL');
    }
  }

  protected async handleCallbackData(
    data: string,
  ): Promise<CommandResult> {
    console.log(`🔍 CancelCommand: Handling callback data: ${data}`);

    if (data === 'CONFIRM_CANCEL') {
      return await this.confirmCancellation();
    } else if (data === 'CANCEL_CANCEL') {
      return await this.cancelCancellation();
    }

    return { success: false, error: 'Invalid callback data' };
  }

  private async confirmCancellation(): Promise<CommandResult> {
    try {
      console.log(`🗑️ CancelCommand: Confirming cancellation`);

      // Delete the user session with message cleanup
      await this.deleteUserSessionWithCleanup(true, false);

      // Send confirmation message
      const confirmationMessage = `✅ Sessione cancellata con successo\\!\n\n` +
        `Tutti i dati inseriti sono stati eliminati\\.`;

      await this.sendMessage(confirmationMessage, {
        parse_mode: 'MarkdownV2',
      });

      return { success: true, message: 'Session cancelled successfully' };
    } catch (error) {
      console.error('❌ CancelCommand: Error during cancellation:', error);

      const errorMessage =
        `❌ Errore durante la cancellazione della sessione\\.\n\n` +
        `Riprova più tardi o contatta l'amministratore\\.`;

      await this.sendMessage(errorMessage);
      return { success: false, error: 'Cancellation failed' };
    }
  }

  private async cancelCancellation(): Promise<CommandResult> {
    const cancelMessage = `❌ Operazione annullata\\.\n\n` +
      `La sessione rimane attiva\\.`;

    await this.sendMessage(cancelMessage, {
      parse_mode: 'MarkdownV2',
    });
    return { success: true, message: 'Cancellation cancelled' };
  }
}
