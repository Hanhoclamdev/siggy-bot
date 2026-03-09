// Entry point: runs both Discord bot + Web server
console.log('Starting Siggy...');

// Start Discord bot
require('./bot.js');

// Start web server
require('./server.js');

console.log('Siggy is fully loaded.');