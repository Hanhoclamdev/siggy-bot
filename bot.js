const { Client, GatewayIntentBits, Partials } = require('discord.js');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// --- Config ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MULERUN_API_KEY = process.env.MULERUN_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}
if (!MULERUN_API_KEY && !OPENAI_API_KEY) {
  console.error('At least one of MULERUN_API_KEY or OPENAI_API_KEY must be set');
  process.exit(1);
}

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');

// --- Dual Provider Setup (Round-Robin, MuleRun first) ---
const providers = [];

if (MULERUN_API_KEY) {
  providers.push({
    name: 'MuleRun',
    client: new OpenAI({ apiKey: MULERUN_API_KEY, baseURL: 'https://api.mulerun.com/v1' }),
    model: process.env.MULERUN_MODEL || 'gpt-4.1-mini',
  });
}
if (OPENAI_API_KEY) {
  providers.push({
    name: 'OpenAI',
    client: new OpenAI({ apiKey: OPENAI_API_KEY }),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
}

let providerIndex = 0; // starts with MuleRun (index 0) since it's pushed first

function getNextProvider() {
  const provider = providers[providerIndex % providers.length];
  providerIndex++;
  return provider;
}

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// --- Conversation memory (per channel, last 20 messages) ---
const conversations = new Map();
const MAX_HISTORY = 20;

function getHistory(channelId) {
  if (!conversations.has(channelId)) {
    conversations.set(channelId, []);
  }
  return conversations.get(channelId);
}

function addToHistory(channelId, role, content) {
  const history = getHistory(channelId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// --- Bot ready ---
client.once('ready', () => {
  console.log(`Siggy is online as ${client.user.tag}`);
  client.user.setActivity('Channeling the Grid', { type: 3 }); // "Watching"
});

// --- Message handler ---
client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Respond when: mentioned, replied to, or in DMs
  const isMentioned = message.mentions.has(client.user);
  const isDM = !message.guild;
  const isReply = message.reference && message.reference.messageId;

  let shouldRespond = isMentioned || isDM;

  // Check if replying to the bot
  if (isReply && !shouldRespond) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.author.id === client.user.id) {
        shouldRespond = true;
      }
    } catch (_) {}
  }

  if (!shouldRespond) return;

  // Clean the message content (remove bot mention)
  let userMessage = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  if (!userMessage) {
    userMessage = 'gm';
  }

  // Show typing indicator
  try {
    await message.channel.sendTyping();
  } catch (_) {}

  // Add to history and get response
  const channelId = message.channel.id;
  addToHistory(channelId, 'user', userMessage);

  // Round-robin with fallback: try primary provider, fallback to the other on error
  let reply = null;
  const primary = getNextProvider();
  const fallback = providers.length > 1
    ? providers.find(p => p.name !== primary.name)
    : null;

  for (const provider of [primary, fallback].filter(Boolean)) {
    try {
      console.log(`[${provider.name}] Calling model: ${provider.model}`);
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...getHistory(channelId),
        ],
        max_tokens: 500,
        temperature: 0.9,
      });

      reply = completion.choices[0].message.content;
      break; // success, stop trying
    } catch (err) {
      console.error(`[${provider.name}] Error:`, err.message);
      if (provider === primary && fallback) {
        console.log(`Falling back to ${fallback.name}...`);
      }
    }
  }

  if (reply) {
    addToHistory(channelId, 'assistant', reply);

    // Discord message limit is 2000 chars
    if (reply.length <= 2000) {
      await message.reply(reply);
    } else {
      const chunks = reply.match(/[\s\S]{1,2000}/g);
      for (const chunk of chunks) {
        await message.channel.send(chunk);
      }
    }
  } else {
    await message.reply('*gazes into the void* The arcane channels are disrupted. Try again, traveler.');
  }
});

// --- Start ---
client.login(DISCORD_TOKEN);
