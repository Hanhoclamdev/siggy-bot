// index.js - Entry point cho Siggy (Discord bot + Web server)

require('dotenv').config();  // load .env nếu có (tốt cho local dev, Railway dùng service variables nên ko bắt buộc)

console.log('🚀 Starting Siggy...');

let botStatus = 'pending';
let serverStatus = 'pending';

try {
  require('./bot.js');
  botStatus = 'success';
  console.log('✅ Discord bot started successfully');
} catch (err) {
  botStatus = 'error';
  console.error('❌ Discord bot failed to start:', err.message);
  console.error(err.stack);  // log stack để debug dễ hơn
}

try {
  require('./server.js');
  serverStatus = 'success';
  console.log('✅ Web server started successfully');
} catch (err) {
  serverStatus = 'error';
  console.error('❌ Web server failed to start:', err.message);
  console.error(err.stack);
}

if (botStatus === 'success' && serverStatus === 'success') {
  console.log('🎉 Siggy fully operational! (Bot + Web server ready)');
} else {
  console.warn('⚠️ Siggy started with issues – check logs above');
}

// Graceful shutdown (Railway kill process sẽ trigger)
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  process.exit(0);
});