import os
import logging
import sqlite3
from datetime import datetime
from typing import Dict, Any

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler, 
    MessageHandler, filters, ContextTypes, ConversationHandler
)
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Conversation states
FAMILY, CATEGORY, AMOUNT, PERIOD, CONTACT = range(5)

# Predefined families
FAMILIES = [
    "Famiglia Rossi",
    "Famiglia Bianchi", 
    "Famiglia Verdi",
    "Famiglia Neri",
    "Famiglia Blu"
]

# Categories
CATEGORIES = [
    "Quota Mensile",
    "Quota Iscrizione", 
    "Altro"
]

class TransactionBot:
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.allowed_group_id = os.getenv('ALLOWED_GROUP_ID')
        self.db_path = os.getenv('DATABASE_PATH', 'transactions.db')
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for storing transactions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                family TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                period TEXT NOT NULL,
                contact TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                username TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def is_authorized(self, update: Update) -> bool:
        """Check if the user is authorized to use the bot"""
        if not self.allowed_group_id:
            return True  # If no group restriction, allow all
        
        chat_id = str(update.effective_chat.id)
        return chat_id == self.allowed_group_id
    
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Start the conversation and ask for family selection"""
        if not self.is_authorized(update):
            await update.message.reply_text("❌ Questo bot può essere utilizzato solo nel gruppo autorizzato.")
            return ConversationHandler.END
        
        keyboard = []
        for family in FAMILIES:
            keyboard.append([InlineKeyboardButton(family, callback_data=f"family_{family}")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "💰 **Registrazione Transazione**\n\n"
            "Seleziona la famiglia:",
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
        
        return FAMILY
    
    async def select_family(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Handle family selection"""
        query = update.callback_query
        await query.answer()
        
        family = query.data.replace("family_", "")
        context.user_data['family'] = family
        
        # Show category selection
        keyboard = []
        for category in CATEGORIES:
            keyboard.append([InlineKeyboardButton(category, callback_data=f"category_{category}")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            f"👨‍👩‍👧‍👦 **Famiglia selezionata:** {family}\n\n"
            "Seleziona la categoria:",
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
        
        return CATEGORY
    
    async def select_category(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Handle category selection"""
        query = update.callback_query
        await query.answer()
        
        category = query.data.replace("category_", "")
        context.user_data['category'] = category
        
        await query.edit_message_text(
            f"👨‍👩‍👧‍👦 **Famiglia:** {context.user_data['family']}\n"
            f"📂 **Categoria:** {category}\n\n"
            "💰 Inserisci l'importo in Euro (es. 25.50):"
        )
        
        return AMOUNT
    
    async def get_amount(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Handle amount input"""
        try:
            amount = float(update.message.text.replace(',', '.'))
            if amount <= 0:
                raise ValueError("L'importo deve essere positivo")
            
            context.user_data['amount'] = amount
            
            await update.message.reply_text(
                f"👨‍👩‍👧‍👦 **Famiglia:** {context.user_data['family']}\n"
                f"📂 **Categoria:** {context.user_data['category']}\n"
                f"💰 **Importo:** €{amount:.2f}\n\n"
                "📅 Inserisci il periodo (formato: YYYY-MM-DD, es. 2024-01-15):"
            )
            
            return PERIOD
            
        except ValueError:
            await update.message.reply_text(
                "❌ Formato non valido. Inserisci un importo numerico valido (es. 25.50):"
            )
            return AMOUNT
    
    async def get_period(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Handle period input"""
        try:
            period = update.message.text.strip()
            # Validate date format
            datetime.strptime(period, '%Y-%m-%d')
            
            context.user_data['period'] = period
            
            await update.message.reply_text(
                f"👨‍👩‍👧‍👦 **Famiglia:** {context.user_data['family']}\n"
                f"📂 **Categoria:** {context.user_data['category']}\n"
                f"💰 **Importo:** €{context.user_data['amount']:.2f}\n"
                f"📅 **Periodo:** {period}\n\n"
                "👤 Inserisci il username del contatto (es. @username):"
            )
            
            return CONTACT
            
        except ValueError:
            await update.message.reply_text(
                "❌ Formato data non valido. Usa il formato YYYY-MM-DD (es. 2024-01-15):"
            )
            return PERIOD
    
    async def get_contact(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Handle contact input and save transaction"""
        contact = update.message.text.strip()
        
        # Validate username format
        if not contact.startswith('@'):
            contact = '@' + contact
        
        # Save transaction to database
        self.save_transaction(update, context, contact)
        
        # Send notification to the specified contact
        await self.send_notification(update, context, contact)
        
        # Confirm to user
        await update.message.reply_text(
            f"✅ **Transazione registrata con successo!**\n\n"
            f"👨‍👩‍👧‍👦 **Famiglia:** {context.user_data['family']}\n"
            f"📂 **Categoria:** {context.user_data['category']}\n"
            f"💰 **Importo:** €{context.user_data['amount']:.2f}\n"
            f"📅 **Periodo:** {context.user_data['period']}\n"
            f"👤 **Contatto:** {contact}\n\n"
            f"📨 Notifica inviata a {contact}",
            parse_mode='Markdown'
        )
        
        # Clear user data
        context.user_data.clear()
        
        return ConversationHandler.END
    
    def save_transaction(self, update: Update, context: ContextTypes.DEFAULT_TYPE, contact: str):
        """Save transaction to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO transactions 
            (family, category, amount, period, contact, user_id, username)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            context.user_data['family'],
            context.user_data['category'],
            context.user_data['amount'],
            context.user_data['period'],
            contact,
            update.effective_user.id,
            update.effective_user.username or 'N/A'
        ))
        
        conn.commit()
        conn.close()
    
    async def send_notification(self, update: Update, context: ContextTypes.DEFAULT_TYPE, contact: str):
        """Send notification to the specified contact"""
        try:
            notification_message = (
                f"🔔 **Nuova Transazione Registrata**\n\n"
                f"👨‍👩‍👧‍👦 **Famiglia:** {context.user_data['family']}\n"
                f"📂 **Categoria:** {context.user_data['category']}\n"
                f"💰 **Importo:** €{context.user_data['amount']:.2f}\n"
                f"📅 **Periodo:** {context.user_data['period']}\n"
                f"👤 **Registrato da:** @{update.effective_user.username or 'utente'}\n"
                f"⏰ **Data:** {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )
            
            # Try to send to the contact
            await context.bot.send_message(
                chat_id=contact,
                text=notification_message,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Failed to send notification to {contact}: {e}")
            # Notify the user that notification failed
            await update.message.reply_text(
                f"⚠️ Transazione salvata ma non è stato possibile inviare la notifica a {contact}.\n"
                f"Verifica che l'username sia corretto."
            )
    
    async def cancel(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Cancel the conversation"""
        await update.message.reply_text("❌ Operazione annullata.")
        context.user_data.clear()
        return ConversationHandler.END
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Send help message"""
        if not self.is_authorized(update):
            await update.message.reply_text("❌ Questo bot può essere utilizzato solo nel gruppo autorizzato.")
            return
        
        help_text = (
            "🤖 **Bot di Gestione Transazioni**\n\n"
            "**Comandi disponibili:**\n"
            "/start - Inizia una nuova registrazione transazione\n"
            "/help - Mostra questo messaggio di aiuto\n\n"
            "**Come usare:**\n"
            "1. Usa /start per iniziare\n"
            "2. Segui le istruzioni per inserire i dati\n"
            "3. La transazione verrà salvata e una notifica inviata al contatto specificato"
        )
        
        await update.message.reply_text(help_text, parse_mode='Markdown')
    
    def run(self):
        """Run the bot"""
        if not self.bot_token:
            logger.error("TELEGRAM_BOT_TOKEN not found in environment variables")
            return
        
        # Create application
        application = Application.builder().token(self.bot_token).build()
        
        # Create conversation handler
        conv_handler = ConversationHandler(
            entry_points=[CommandHandler('start', self.start)],
            states={
                FAMILY: [CallbackQueryHandler(self.select_family, pattern='^family_')],
                CATEGORY: [CallbackQueryHandler(self.select_category, pattern='^category_')],
                AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, self.get_amount)],
                PERIOD: [MessageHandler(filters.TEXT & ~filters.COMMAND, self.get_period)],
                CONTACT: [MessageHandler(filters.TEXT & ~filters.COMMAND, self.get_contact)],
            },
            fallbacks=[CommandHandler('cancel', self.cancel)],
        )
        
        # Add handlers
        application.add_handler(conv_handler)
        application.add_handler(CommandHandler('help', self.help_command))
        
        # Start the bot
        logger.info("Starting bot...")
        application.run_polling()

if __name__ == '__main__':
    bot = TransactionBot()
    bot.run()
