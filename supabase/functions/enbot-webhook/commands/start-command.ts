// Start command implementation - calls help command
import {
  BaseCommand,
  type CommandContext,
  type CommandResult,
} from './command-interface.ts';
import { HelpCommand } from './help-command.ts';

export class StartCommand extends BaseCommand {
  static commandName = 'start';
  static description = '🚀 Avvia il bot e mostra la guida';

  constructor(context: CommandContext) {
    super(context, StartCommand.commandName);
  }

  override async execute(): Promise<CommandResult> {
    // Create a help command instance and execute it
    const helpCommand = new HelpCommand(this.context);
    return await helpCommand.execute();
  }

  override getHelpText(): string {
    return `🚀 ${StartCommand.description}\n\n` +
      `Questo comando avvia il bot e mostra la guida completa con tutti i comandi disponibili.\n\n` +
      `Usa /${StartCommand.commandName} per iniziare.`;
  }

  protected async startCommand(): Promise<CommandResult> {
    return this.execute();
  }

  protected async handleTextInput(_text: string): Promise<CommandResult> {
    return {
      success: false,
      error: 'Start command does not accept text input',
    };
  }

  protected async handleCallbackData(
    _data: string,
    _session: any,
  ): Promise<CommandResult> {
    return {
      success: false,
      error: 'Start command does not accept callback data',
    };
  }
}
