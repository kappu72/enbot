import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// Types
interface Transaction {
  id: number;
  family: string;
  category: string;
  amount: number;
  period: string;
  contact: string;
  recordedBy: string;
  recordedAt: string;
  chatId: number;
}

interface UserSession {
  chatId: number;
  userId: number;
  step: 'idle' | 'family' | 'category' | 'amount' | 'period' | 'contact';
  transactionData: Partial<Transaction>;
}

const FAMILY_OPTIONS = [
  'Famiglia Rossi',
  'Famiglia Bianchi', 
  'Famiglia Verdi',
  'Famiglia Neri',
  'Famiglia Blu'
];

const CATEGORY_OPTIONS = [
  'quota mensile',
  'quota iscrizione', 
  'altro'
];

export class EnBot {
  private supabase: SupabaseClient;
  private userSessions: Map<number, UserSession> = new Map();
  private allowedGroupId: string;
  private adminUserIds: number[];

  constructor(
    private botToken: string, 
    allowedGroupId: string, 
    adminUserIds: number[] = [],
    supabase: SupabaseClient
  ) {
    this.supabase = supabase;
    this.allowedGroupId = allowedGroupId;
    this.adminUserIds = adminUserIds;
  }

  private isAllowedChat(chatId: number, userId?: number): boolean {
    // Allow admin users from any chat
    if (userId && this.adminUserIds.includes(userId)) {
      return true;
    }
    // Allow anyone from the specified group
    return chatId.toString() === this.allowedGroupId;
  }

  async processUpdate(update: any): Promise<void> {
    try {
      // Process the update
      if (update.message) {
        const msg = update.message;
        
        // Handle text commands
        if (msg.text) {
          if (msg.text.startsWith('/start')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              await this.sendMessage(msg.chat.id, '❌ Questo bot può essere utilizzato solo nel gruppo autorizzato o da utenti admin.');
              return;
            }
            await this.startTransaction(msg);
          } else if (msg.text.startsWith('/help')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            await this.showHelp(msg);
          } else if (msg.text.startsWith('/cancel')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            await this.cancelTransaction(msg);
          } else if (msg.text.startsWith('/history')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            await this.showTransactionHistory(msg);
          } else if (msg.text.startsWith('/getid')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            await this.showChatId(msg);
          } else if (msg.text.startsWith('/testmsg')) {
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            const match = msg.text.match(/\/testmsg (.+)/);
            if (match) {
              await this.sendTestMessage(msg, match[1]);
            }
          } else {
            // Handle regular text messages
            if (!this.isAllowedChat(msg.chat.id, msg.from?.id)) {
              return;
            }
            await this.handleTextMessage(msg);
          }
        }
      }
      
      // Handle callback queries
      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        if (!callbackQuery.message?.chat.id || !this.isAllowedChat(callbackQuery.message.chat.id, callbackQuery.from.id)) {
          return;
        }
        await this.handleCallbackQuery(callbackQuery);
      }
    } catch (error) {
      console.error('❌ Error processing update:', error);
    }
  }

  private async startTransaction(msg: any): Promise<void> {
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
    await this.sendFamilySelection(chatId);
  }

  private async sendFamilySelection(chatId: number): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: FAMILY_OPTIONS.map(family => [
          { text: family, callback_data: `family_${family}` }
        ])
      }
    };

    await this.sendMessage(chatId, '👨‍👩‍👧‍👦 Seleziona la famiglia:', keyboard);
  }

  private async sendCategorySelection(chatId: number): Promise<void> {
    const keyboard = {
      reply_markup: {
        inline_keyboard: CATEGORY_OPTIONS.map(category => [
          { text: category, callback_data: `category_${category}` }
        ])
      }
    };

    await this.sendMessage(chatId, '📋 Seleziona la categoria:', keyboard);
  }

  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
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
      
      await this.answerCallbackQuery(callbackQuery.id, `Famiglia selezionata: ${family}`);
      await this.sendCategorySelection(chatId);
    } else if (data.startsWith('category_')) {
      const category = data.replace('category_', '');
      session.transactionData.category = category;
      session.step = 'amount';
      
      await this.answerCallbackQuery(callbackQuery.id, `Categoria selezionata: ${category}`);
      await this.sendMessage(chatId, '💰 Inserisci l\'importo in EUR (es. 25.50):');
    }
  }

  private async handleTextMessage(msg: any): Promise<void> {
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
        console.log(`💰 Handling amount input: "${text}" for user ${userId}`);
        await this.handleAmountInput(chatId, userId, text, session);
        break;
      case 'period':
        console.log(`📅 Handling period input: "${text}" for user ${userId}`);
        await this.handlePeriodInput(chatId, userId, text, session);
        break;
      case 'contact':
        console.log(`👤 Handling contact input: "${text}" for user ${userId}`);
        await this.handleContactInput(chatId, userId, text, session);
        break;
      default:
        console.log(`❓ Unknown step: ${session.step}`);
    }
  }

  private async handleAmountInput(chatId: number, userId: number, text: string, session: UserSession): Promise<void> {
    console.log(`💰 Processing amount input: "${text}" for user ${userId}`);
    const amount = parseFloat(text);
    console.log(`💰 Parsed amount: ${amount}`);
    
    if (isNaN(amount) || amount <= 0) {
      console.log(`❌ Invalid amount: ${amount}`);
      await this.sendMessage(chatId, '❌ Inserisci un importo valido in EUR (es. 25.50):');
      return;
    }

    session.transactionData.amount = amount;
    session.step = 'period';
    console.log(`✅ Amount saved: ${amount}, moving to period step`);
    
    await this.sendMessage(chatId, '📅 Inserisci il periodo (formato: YYYY-MM-DD, es. 2024-01-15):');
  }

  private async handlePeriodInput(chatId: number, userId: number, text: string, session: UserSession): Promise<void> {
    console.log(`📅 Processing period input: "${text}" for user ${userId}`);
    // Simple date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(text)) {
      console.log(`❌ Invalid date format: "${text}"`);
      await this.sendMessage(chatId, '❌ Inserisci una data valida nel formato YYYY-MM-DD (es. 2024-01-15):');
      return;
    }

    session.transactionData.period = text;
    session.step = 'contact';
    console.log(`✅ Period saved: ${text}, moving to contact step`);
    
    await this.sendMessage(chatId, '👤 Inserisci il username del contatto (es. @username):');
  }

  private async handleContactInput(chatId: number, userId: number, text: string, session: UserSession): Promise<void> {
    console.log(`👤 Processing contact input: "${text}" for user ${userId}`);
    // Validate username format
    if (!text.startsWith('@')) {
      console.log(`❌ Invalid username format: "${text}"`);
      await this.sendMessage(chatId, '❌ Inserisci un username valido che inizi con @ (es. @username):');
      return;
    }

    session.transactionData.contact = text;
    console.log(`✅ Contact saved: ${text}, completing transaction`);
    
    // Complete the transaction
    await this.completeTransaction(chatId, userId, session);
  }

  private async completeTransaction(chatId: number, userId: number, session: UserSession): Promise<void> {
    try {
      const transaction = {
        family: session.transactionData.family!,
        category: session.transactionData.category!,
        amount: session.transactionData.amount!,
        period: session.transactionData.period!,
        contact: session.transactionData.contact!,
        recorded_by: `@${userId}`,
        recorded_at: new Date().toISOString(),
        chat_id: chatId
      };

      const { data, error } = await this.supabase
        .from('transactions')
        .insert(transaction)
        .select('id')
        .single();

      if (error) {
        console.error('Error saving transaction:', error);
        await this.sendMessage(chatId, '❌ Errore durante il salvataggio della transazione. Riprova.');
        return;
      }

      const transactionId = data.id;
      
      // Send confirmation to the group
      const confirmationMessage = `
✅ **Transazione registrata con successo!**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Contatto:** ${transaction.contact}
• **Registrato da:** ${transaction.recorded_by}
• **ID Transazione:** #${transactionId}

📤 **Notifica inviata a:** ${transaction.contact}
      `;

      await this.sendMessage(chatId, confirmationMessage, { parse_mode: 'Markdown' });

      // Send notification to the contact
      const notificationMessage = `
🔔 **Nuova transazione registrata**

📋 **Dettagli:**
• **Famiglia:** ${transaction.family}
• **Categoria:** ${transaction.category}
• **Importo:** €${transaction.amount}
• **Periodo:** ${transaction.period}
• **Registrato da:** ${transaction.recorded_by}
• **ID Transazione:** #${transactionId}
      `;

      try {
        await this.sendMessage(transaction.contact, notificationMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error sending notification:', error);
        await this.sendMessage(chatId, `⚠️ Impossibile inviare la notifica a ${transaction.contact}. Verifica che l'username sia corretto.`);
      }

      // Clear session
      this.userSessions.delete(userId);

    } catch (error) {
      console.error('Error saving transaction:', error);
      await this.sendMessage(chatId, '❌ Errore durante il salvataggio della transazione. Riprova.');
    }
  }

  private async showTransactionHistory(msg: any): Promise<void> {
    try {
      console.log(`📊 Showing transaction history for user ${msg.from?.id}`);
      
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching transactions:', error);
        await this.sendMessage(msg.chat.id, '❌ Errore durante il recupero della cronologia delle transazioni.');
        return;
      }
      
      if (data.length === 0) {
        await this.sendMessage(msg.chat.id, '📋 Nessuna transazione trovata nel database.');
        return;
      }

      let historyMessage = '📊 **Ultime 10 Transazioni:**\n\n';
      
      data.forEach((transaction, index) => {
        const date = new Date(transaction.recorded_at).toLocaleDateString('it-IT');
        const time = new Date(transaction.recorded_at).toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        historyMessage += `**${index + 1}.** #${transaction.id}\n`;
        historyMessage += `👨‍👩‍👧‍👦 **Famiglia:** ${transaction.family}\n`;
        historyMessage += `📋 **Categoria:** ${transaction.category}\n`;
        historyMessage += `💰 **Importo:** €${transaction.amount}\n`;
        historyMessage += `📅 **Periodo:** ${transaction.period}\n`;
        historyMessage += `👤 **Contatto:** ${transaction.contact}\n`;
        historyMessage += `✍️ **Registrato da:** ${transaction.recorded_by}\n`;
        historyMessage += `🕒 **Data:** ${date} alle ${time}\n\n`;
      });

      // Split message if too long (Telegram has a 4096 character limit)
      if (historyMessage.length > 4000) {
        const chunks = this.splitMessage(historyMessage, 4000);
        for (const chunk of chunks) {
          await this.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' });
        }
      } else {
        await this.sendMessage(msg.chat.id, historyMessage, { parse_mode: 'Markdown' });
      }
      
    } catch (error) {
      console.error('Error showing transaction history:', error);
      await this.sendMessage(msg.chat.id, '❌ Errore durante il recupero della cronologia delle transazioni.');
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

  private async showChatId(msg: any): Promise<void> {
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

    await this.sendMessage(msg.chat.id, idMessage, { parse_mode: 'Markdown' });
  }

  private async showHelp(msg: any): Promise<void> {
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

    await this.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
  }

  private async cancelTransaction(msg: any): Promise<void> {
    const userId = msg.from?.id;
    if (!userId) return;

    const session = this.userSessions.get(userId);
    if (session) {
      this.userSessions.delete(userId);
      await this.sendMessage(msg.chat.id, '❌ Transazione annullata.');
    } else {
      await this.sendMessage(msg.chat.id, 'ℹ️ Nessuna transazione in corso da annullare.');
    }
  }

  private async sendTestMessage(msg: any, target: string): Promise<void> {
    try {
      console.log(`📤 Sending test message to: ${target}`);
      
      const testMessage = `
🧪 **Messaggio di Test**

Ciao! Questo è un messaggio di test inviato dal bot EnBot.

**Inviato da:** ${msg.from?.first_name} (${msg.from?.username ? '@' + msg.from.username : 'N/A'})
**Timestamp:** ${new Date().toLocaleString('it-IT')}

Se ricevi questo messaggio, significa che il bot può contattarti correttamente! ✅
      `;
      
      await this.sendMessage(msg.chat.id, "Flusso completato!", {
        reply_markup: {
          inline_keyboard: [[{
            text: "💬 Invia messaggio privato",
            url: `https://t.me/${target}?text=${encodeURIComponent(testMessage)}`
          }]]
        }
      });
        
    } catch (error) {
      console.error('❌ Error sending test message:', error);
      
      let errorMessage = '❌ Errore nell\'invio del messaggio.';
      
      if (error instanceof Error) {
        if (error.message.includes('chat not found')) {
          errorMessage = '❌ Chat non trovata. L\'utente potrebbe non aver mai scritto al bot.';
        } else if (error.message.includes('user is deactivated')) {
          errorMessage = '❌ L\'utente è disattivato.';
        } else if (error.message.includes('blocked')) {
          errorMessage = '❌ L\'utente ha bloccato il bot.';
        }
      }
      
      await this.sendMessage(msg.chat.id, errorMessage);
    }
  }

  // Telegram API methods
  private async sendMessage(chatId: number | string, text: string, options?: any): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      ...options
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
  }

  private async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;
    const payload = {
      callback_query_id: callbackQueryId,
      text: text
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
  }

  async setupWebhook(webhookUrl: string): Promise<void> {
    try {
      console.log(`🔗 Setting up webhook: ${webhookUrl}`);
      const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
      const payload = { url: webhookUrl };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }

      console.log('✅ Webhook configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(): Promise<void> {
    try {
      console.log('🗑️ Deleting webhook...');
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }

      console.log('✅ Webhook deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete webhook:', error);
      throw error;
    }
  }
}
