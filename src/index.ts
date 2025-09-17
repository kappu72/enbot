import dotenv from 'dotenv';
import { EnBot } from './bot';
import http from 'http';

// Load environment variables
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedGroupId = process.env.ALLOWED_GROUP_ID;
const adminUserIds = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim())) : [];
const port = process.env.PORT || 3000;
const webhookUrl = process.env.WEBHOOK_URL;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!allowedGroupId) {
  console.error('❌ ALLOWED_GROUP_ID is required');
  process.exit(1);
}

console.log('🚀 Starting EnBot...');
console.log(`📱 Bot Token: ${token.substring(0, 10)}...`);
console.log(`👥 Allowed Group ID: ${allowedGroupId}`);
console.log(`👑 Admin User IDs: ${adminUserIds.join(', ')}`);
console.log(`🔗 Webhook URL: ${webhookUrl || 'Not set'}`);

try {
  const bot = new EnBot(token, allowedGroupId, adminUserIds);
  console.log('✅ EnBot started successfully!');
  
  // Create HTTP server for webhook
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      // Handle webhook updates
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const update = JSON.parse(body);
          console.log('📨 Received webhook update:', update.update_id);
          await bot.processUpdate(update);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } catch (error) {
          console.error('❌ Error processing webhook:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    } else {
      // Health check endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'EnBot Telegram Bot',
        mode: 'webhook',
        timestamp: new Date().toISOString()
      }));
    }
  });

  server.listen(port, async () => {
    console.log(`🌐 HTTP server listening on port ${port}`);
    
    // Setup webhook if URL is provided
    if (webhookUrl) {
      try {
        await bot.setupWebhook(`${webhookUrl}/webhook`);
      } catch (error) {
        console.error('❌ Failed to setup webhook:', error);
      }
    } else {
      console.log('⚠️ WEBHOOK_URL not set, webhook not configured');
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down EnBot...');
    server.close(() => {
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down EnBot...');
    server.close(() => {
      process.exit(0);
    });
  });
  
} catch (error) {
  console.error('❌ Failed to start EnBot:', error);
  process.exit(1);
}
