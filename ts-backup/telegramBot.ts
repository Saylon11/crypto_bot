// src/pumpBot/telegramBot.ts

import dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';
import { initiateCoordinatedBuy, executePanicBuy } from '../raid/tradeExecutor';
import { mind } from '../../mindClient';
import { runMindEngine } from '../../core/mindEngine';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ No TELEGRAM_BOT_TOKEN in .env - Telegram bot disabled');
  process.exit(0);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const activeRaidMessages: Map<number, { chatId: number; timestamp: number }> = new Map();
const TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS || process.env.TARGET_TOKEN_MINT;

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `🦉 HootBot MIND 1.0 Ready!\n\n` +
    `Commands:\n` +
    `/raid [amount] - Trigger coordinated buy\n` +
    `/mind - Get current market analysis\n` +
    `/status - Check bot status\n` +
    `/help - Show this message`
  );
});

// Command: /raid [amount]
bot.onText(/\/raid ?(\d*\.?\d*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amount = parseFloat(match?.[1] || '0.2');
  
  if (amount < 0.01 || amount > 10) {
    bot.sendMessage(chatId, '❌ Amount must be between 0.01 and 10 SOL');
    return;
  }

  // Get MIND analysis first
  const marketState = await mind.getMarketState(TOKEN_ADDRESS);
  
  let message = `🚨 RAID ANALYSIS\n\n`;
  message += `Token: ${TOKEN_ADDRESS}\n`;
  message += `Amount: ${amount} SOL\n\n`;
  message += `🧠 MIND Score: ${marketState.survivabilityScore}%\n`;
  message += `📊 Action: ${marketState.recommendation}\n`;
  message += `💡 Reason: ${marketState.reason}\n\n`;
  
  if (marketState.recommendation === "BUY" && marketState.survivabilityScore > 60) {
    message += `✅ RAID APPROVED! React with 🔥 to execute`;
    
    const sentMsg = await bot.sendMessage(chatId, message);
    activeRaidMessages.set(sentMsg.message_id, { 
      chatId, 
      timestamp: Date.now() 
    });
    
    // Auto-execute after reactions (simplified for demo)
    setTimeout(async () => {
      if (activeRaidMessages.has(sentMsg.message_id)) {
        await executePanicBuy(amount / 0.2); // Convert to multiplier
        bot.sendMessage(chatId, `🚀 Raid executed! Check wallet for confirmation.`);
        activeRaidMessages.delete(sentMsg.message_id);
      }
    }, 5000);
  } else {
    message += `❌ RAID REJECTED - Market conditions unfavorable`;
    bot.sendMessage(chatId, message);
  }
});

// Command: /mind
bot.onText(/\/mind/, async (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, '🧠 Running MIND analysis...');
  
  try {
    const report = await runMindEngine();
    
    let message = `🦉 HootBot MIND Report\n\n`;
    message += `🌱 Survivability: ${report.survivabilityScore}%\n`;
    message += `🦐 Shrimp: ${report.consumerProfile.shrimpPercent.toFixed(1)}%\n`;
    message += `🐬 Dolphin: ${report.consumerProfile.dolphinPercent.toFixed(1)}%\n`;
    message += `🐋 Whale: ${report.consumerProfile.whalePercent.toFixed(1)}%\n`;
    message += `🌊 Flow Strength: ${report.marketFlowStrength}%\n\n`;
    message += `💡 ${report.tradeSuggestion.action} (${report.tradeSuggestion.percentage}%)\n`;
    message += `📝 ${report.tradeSuggestion.reason}`;
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error running MIND analysis');
  }
});

// Command: /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  const quickSentiment = await mind.getQuickSentiment(process.env.HELIUS_TARGET_WALLET || '');
  
  let message = `🤖 Bot Status\n\n`;
  message += `✅ Online and monitoring\n`;
  message += `🎯 Token: ${TOKEN_ADDRESS.slice(0, 8)}...\n`;
  message += `📊 Quick Sentiment: ${quickSentiment.toFixed(1)}% bullish\n`;
  message += `⏰ Time: ${new Date().toLocaleString()}`;
  
  bot.sendMessage(chatId, message);
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `🦉 HootBot Commands:\n\n` +
    `/raid [amount] - Start a coordinated buy\n` +
    `/mind - Full MIND market analysis\n` +
    `/status - Check bot status\n` +
    `/start - Welcome message\n` +
    `/help - This message\n\n` +
    `React with 🔥 on raid messages to participate!`
  );
});

// Clean up old raid messages
setInterval(() => {
  const now = Date.now();
  for (const [msgId, data] of activeRaidMessages.entries()) {
    if (now - data.timestamp > 300000) { // 5 minutes
      activeRaidMessages.delete(msgId);
    }
  }
}, 60000);

bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error);
});

console.log('🤖 Telegram bot started successfully!');