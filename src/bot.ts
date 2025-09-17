import TelegramBot from 'node-telegram-bot-api';
import { Database } from './database';
import { UserSession, Transaction, FAMILY_OPTIONS, CATEGORY_OPTIONS } from './types';

export class EnBot {
  private bot: TelegramBot;
  private db: Database;
  private userSessions: Map<number, UserSession> = new Map();
  private allowedGroupId: string;
  private adminUserIds: number[];

  constructor(token: string, allowedGroupId: string, adminUserIds: number[] = []) {
    this.bot = new TelegramBot(token, { polling: false });
    this.db = new Database();
    this.allowedGroupId = allowedGroupId;
    this.adminUserIds = adminUserIds;
    this.setupHandlers();
  }

  async setupWebhook(webhookUrl: string): Promise<void> {
    try {
      console.log(`🔗 Setting up webhook: ${webhookUrl}`);
      await this.bot.setWebHook(webhookUrl);
      console.log('✅ Webhook configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(): Promise<void> {
    try {
      console.log('🗑️ Deleting webhook...');
      await this.bot.deleteWebHook();
      console.log('✅ Webhook deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete webhook:', error);
      throw error;
    }
  }

  async processUpdate(update: any): Promise<void> {
    try {
      // Process the update using the bot's internal handler
      if (update.message) {
        const msg = update.message;
        
        // Handle text commands
        if (msg.text) {
          if (msg.text.startsWith('/start')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              this.bot.sendMessage(msg.chat.id, '❌ Questo bot può essere utilizzato solo nel gruppo autorizzato o da utenti admin.');
              return;
            }
            this.startTransaction(msg);
          } else if (msg.text.startsWith('/help')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            this.showHelp(msg);
          } else if (msg.text.startsWith('/cancel')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            this.cancelTransaction(msg);
          } else if (msg.text.startsWith('/history')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            this.showTransactionHistory(msg);
          } else if (msg.text.startsWith('/getid')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            this.showChatId(msg);
          } else {
            // Handle regular text messages
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            this.handleTextMessage(msg);
          }
        }
      }
      
      // Handle callback queries
      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        if (!callbackQuery.message?.chat.id || !this.isAllowedChat(callbackQuery.message.chat.id, callbackQuery.from.id)) {
          return;
        }
        this.handleCallbackQuery(callbackQuery);
      }
    } catch (error) {
      console.error('❌ Error processing update:', error);
    }
  }

  private setupHandlers(): void {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
        this.bot.sendMessage(msg.chat.id, '❌ Questo bot può essere utilizzato solo nel gruppo autorizzato o da utenti admin.');
        return;
      }
      this.startTransaction(msg);
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
        return;
      }
      this.showHelp(msg);
    });

    // Cancel command
    this.bot.onText(/\/cancel/, (msg) => {
      if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
        return;
      }
      this.cancelTransaction(msg);
    });

    // History command
    this.bot.onText(/\/history/, (msg) => {
      if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
        return;
      }
      this.showTransactionHistory(msg);
    });

    // Get ID command
    this.bot.onText(/\/getid/, (msg) => {
      if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
        return;
      }
      this.showChatId(msg);
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', (callbackQuery) => {
      if (!callbackQuery.message?.chat.id || !this.isAllowedChat(callbackQuery.message.chat.id, callbackQuery.from.id)) {
        return;
      }
      this.handleCallbackQuery(callbackQuery);
    });

    // Handle text messages
    this.bot.on('message', (msg) => {
      if (!this.isAllowedChat(msg.chat.id, msg.from?.id) || msg.text?.startsWith('/')) {
        return;
      }
      this.handleTextMessage(msg);
    });
  }

  private isAllowedChat(chatId: number, userId?: number): boolean {
    // Allow admin users from any chat
    if (userId && this.adminUserIds.includes(userId)) {
      return true;
    }
    // Allow anyone from the specified group
    return chatId.toString() === this.allowedGroupId;
  }

  private startTransaction(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    console.log(`🚀 Starting transaction for user ${userId} in chat ${chatId}`);

    if (!userId) {
      console.log('❌ No userId found, cannot start transaction');
      return;
    }

    // Initialize user session
    this.userSessions.set(userId, {
      chatId,
      userId,
      step: 'family',
      transactionData: {}
    });

    console.log(`✅ Session created for user ${userId}, step: family`);
    this.sendFamilySelection(chatId);
  }

  private sendFamilySelection(chatId: number): void {
    const keyboard = {
      reply_markup: {
        inline_keyboard: FAMILY_OPTIONS.map(family => [
          { text: family, callback_data: `family_${family}` }
        ])
      }
    };

    this.bot.sendMessage(chatId, '👨‍👩‍👧‍👦 Seleziona la famiglia:', keyboard);
  }

  private sendCategorySelection(chatId: number): void {
    const keyboard = {
      reply_markup: {
        inline_keyboard: CATEGORY_OPTIONS.map(category => [
          { text: category, callback_data: `category_${category}` }
        ])
      }
    };

    this.bot.sendMessage(chatId, '📋 Seleziona la categoria:', keyboard);
  }

  private handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): void {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;

    if (!chatId || !data) return;

    const session = this.userSessions.get(userId);
    if (!session) return;

    if (data.startsWith('family_')) {
      const family = data.replace('family_', '');
      session.transactionData.family = family;
      session.step = 'category';
      
      this.bot.answerCallbackQuery(callbackQuery.id, { text: `Famiglia selezionata: ${family}` });
      this.sendCategorySelection(chatId);
    } else if (data.startsWith('category_')) {
      const category = data.replace('category_', '');
      session.transactionData.category = category;
      session.step = 'amount';
      
      this.bot.answerCallbackQuery(callbackQuery.id, { text: `Categoria selezionata: ${category}` });
      this.bot.sendMessage(chatId, '💰 Inserisci l\'importo in EUR (es. 25.50):');
    }
  }

  private handleTextMessage(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    console.log(`📨 Received text message from user ${userId}: "${text}"`);

    if (!userId || !text) {
      console.log('❌ Missing userId or text, ignoring message');
      return;
    }

    const session = this.userSessions.get(userId);
    if (!session) {
      console.log(`❌ No session found for user ${userId}`);
      return;
    }

    console.log(`🔄 Processing message for user ${userId}, current step: ${session.step}`);

    switch (session.step) {
      case 'amount':
        console.log(`💰 Handling amount input: "${text}"`);
        this.handleAmountInput(chatId, userId, text, session);
        break;
      case 'period':
        console.log(`📅 Handling period input: "${text}"`);
        this.handlePeriodInput(chatId, userId, text, session);
        break;
      case 'contact':
        console.log(`👤 Handling contact input: "${text}"`);
        this.handleContactInput(chatId, userId, text, session);
        break;
      default:
        console.log(`❓ Unknown step: ${session.step}`);
    }
  }

  private handleAmountInput(chatId: number, userId: number, text: string, session: UserSession): void {
    console.log(`💰 Processing amount input: "${text}" for user ${userId}`);
    const amount = parseFloat(text);
    console.log(`💰 Parsed amount: ${amount}`);
    
    if (isNaN(amount) || amount <= 0) {
      console.log(`❌ Invalid amount: ${amount}`);
      this.bot.sendMessage(chatId, '❌ Inserisci un importo valido in EUR (es. 25.50):');
      return;
    }

    session.transactionData.amount = amount;
    session.step = 'period';
    console.log(`✅ Amount saved: ${amount}, moving to period step`);
    
    this.bot.sendMessage(chatId, '📅 Inserisci il periodo (formato: YYYY-MM-DD, es. 2024-01-15):');
  }

  private handlePeriodInput(chatId: number, userId: number, text: string, session: UserSession): void {
    console.log(`📅 Processing period input: "${text}" for user ${userId}`);
    // Simple date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(text)) {
      console.log(`❌ Invalid date format: "${text}"`);
      this.bot.sendMessage(chatId, '❌ Inserisci una data valida nel formato YYYY-MM-DD (es. 2024-01-15):');
      return;
    }

    session.transactionData.period = text;
    session.step = 'contact';
    console.log(`✅ Period saved: ${text}, moving to contact step`);
    
    this.bot.sendMessage(chatId, '👤 Inserisci il username del contatto (es. @username):');
  }

  private handleContactInput(chatId: number, userId: number, text: string, session: UserSession): void {
    console.log(`👤 Processing contact input: "${text}" for user ${userId}`);
    // Validate username format
    if (!text.startsWith('@')) {
      console.log(`❌ Invalid username format: "${text}"`);
      this.bot.sendMessage(chatId, '❌ Inserisci un username valido che inizi con @ (es. @username):');
      return;
    }

    session.transactionData.contact = text;
    console.log(`✅ Contact saved: ${text}, completing transaction`);
    
    // Complete the transaction
    this.completeTransaction(chatId, userId, session);
  }

  private async completeTransaction(chatId: number, userId: number, session: UserSession): Promise<void> {
    try {
      const transaction: Omit<Transaction, 'id'> = {
        family: session.transactionData.family!,
        category: session.transactionData.category!,
        amount: session.transactionData.amount!,
        period: session.transactionData.period!,
        contact: session.transactionData.contact!,
        recordedBy: `@${session.userId}`,
        recordedAt: new Date().toISOString(),
        chatId
      };

      const transactionId = await this.db.saveTransaction(transaction);
      
      // Send confirmation to the group
      const confirmationMessage = `
✅ **Transazione registrata con successo!**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Contatto:** ${transaction.contact}
• **Registrato da:** ${transaction.recordedBy}
• **ID Transazione:** #${transactionId}

📤 **Notifica inviata a:** ${transaction.contact}
      `;

      this.bot.sendMessage(chatId, confirmationMessage, { parse_mode: 'Markdown' });

      // Send notification to the contact
      const notificationMessage = `
🔔 **Nuova transazione registrata**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Registrato da:** ${transaction.recordedBy}
• **ID Transazione:** #${transactionId}
      `;

      try {
        await this.bot.sendMessage(transaction.contact, notificationMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error sending notification:', error);
        this.bot.sendMessage(chatId, `⚠️ Impossibile inviare la notifica a ${transaction.contact}. Verifica che l'username sia corretto.`);
      }

      // Clear session
      this.userSessions.delete(userId);

    } catch (error) {
      console.error('Error saving transaction:', error);
      this.bot.sendMessage(chatId, '❌ Errore durante il salvataggio della transazione. Riprova.');
    }
  }

  private async showTransactionHistory(msg: TelegramBot.Message): Promise<void> {
    try {
      console.log(`📊 Showing transaction history for user ${msg.from?.id}`);
      const transactions = await this.db.getTransactions(10);
      
      if (transactions.length === 0) {
        this.bot.sendMessage(msg.chat.id, '📋 Nessuna transazione trovata nel database.');
        return;
      }

      let historyMessage = '📊 **Ultime 10 Transazioni:**\n\n';
      
      transactions.forEach((transaction, index) => {
        const date = new Date(transaction.recordedAt).toLocaleDateString('it-IT');
        const time = new Date(transaction.recordedAt).toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        historyMessage += `**${index + 1}.** #${transaction.id}\n`;
        historyMessage += `👨‍👩‍👧‍👦 **Famiglia:** ${transaction.family}\n`;
        historyMessage += `📋 **Categoria:** ${transaction.category}\n`;
        historyMessage += `💰 **Importo:** €${transaction.amount}\n`;
        historyMessage += `📅 **Periodo:** ${transaction.period}\n`;
        historyMessage += `👤 **Contatto:** ${transaction.contact}\n`;
        historyMessage += `✍️ **Registrato da:** ${transaction.recordedBy}\n`;
        historyMessage += `🕒 **Data:** ${date} alle ${time}\n\n`;
      });

      // Split message if too long (Telegram has a 4096 character limit)
      if (historyMessage.length > 4000) {
        const chunks = this.splitMessage(historyMessage, 4000);
        for (const chunk of chunks) {
          await this.bot.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' });
        }
      } else {
        await this.bot.sendMessage(msg.chat.id, historyMessage, { parse_mode: 'Markdown' });
      }
      
    } catch (error) {
      console.error('Error showing transaction history:', error);
      this.bot.sendMessage(msg.chat.id, '❌ Errore durante il recupero della cronologia delle transazioni.');
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
          // Single line is too long, split it
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

  private showChatId(msg: TelegramBot.Message): void {
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

    this.bot.sendMessage(msg.chat.id, idMessage, { parse_mode: 'Markdown' });
  }

  private showHelp(msg: TelegramBot.Message): void {
    const helpMessage = `
🤖 **EnBot - Gestione Transazioni**

**Comandi disponibili:**
• /start - Inizia una nuova transazione
• /history - Mostra le ultime 10 transazioni
• /getid - Mostra ID chat e utente
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
    `;

    this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
  }

  private cancelTransaction(msg: TelegramBot.Message): void {
    const userId = msg.from?.id;
    if (!userId) return;

    const session = this.userSessions.get(userId);
    if (session) {
      this.userSessions.delete(userId);
      this.bot.sendMessage(msg.chat.id, '❌ Transazione annullata.');
    } else {
      this.bot.sendMessage(msg.chat.id, 'ℹ️ Nessuna transazione in corso da annullare.');
    }
  }
}
