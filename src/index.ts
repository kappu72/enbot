import dotenv from 'dotenv';
import { EnBot } from './bot';

// Load environment variables
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedGroupId = process.env.ALLOWED_GROUP_ID;

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

try {
  const bot = new EnBot(token, allowedGroupId);
  console.log('✅ EnBot started successfully!');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down EnBot...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down EnBot...');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start EnBot:', error);
  process.exit(1);
}
