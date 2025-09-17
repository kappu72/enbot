import dotenv from 'dotenv';
import { EnBot } from './bot';
import http from 'http';

// Load environment variables
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedGroupId = process.env.ALLOWED_GROUP_ID;
const adminUserIds = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim())) : [];
const port = process.env.PORT || 3000;

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

try {
  const bot = new EnBot(token, allowedGroupId, adminUserIds);
  console.log('✅ EnBot started successfully!');
  
  // Create HTTP server to satisfy Render's port binding requirement
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'EnBot Telegram Bot',
      timestamp: new Date().toISOString()
    }));
  });

  server.listen(port, () => {
    console.log(`🌐 HTTP server listening on port ${port}`);
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
