const { Client, GatewayIntentBits, Partials } = require('discord.js');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// --- Config ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

// --- Helper: gọi OpenAI và trả về reply ---
async function getAIReply(channelId, userMessage) {
  addToHistory(channelId, 'user', userMessage);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...getHistory(channelId),
    ],
    max_tokens: 500,
    temperature: 0.9,
  });

  const reply = completion.choices[0].message.content;
  addToHistory(channelId, 'assistant', reply);
  return reply;
}

// --- Bot ready ---
client.once('ready', () => {
  console.log(`Siggy is online as ${client.user.tag}`);
  client.user.setActivity('Channeling the Grid', { type: 3 }); // "Watching"
});

// --- Message handler (mention, reply, DM) ---
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

  try {
    const reply = await getAIReply(message.channel.id, userMessage);

    // Discord message limit is 2000 chars
    if (reply.length <= 2000) {
      await message.reply(reply);
    } else {
      const chunks = reply.match(/[\s\S]{1,2000}/g);
      for (const chunk of chunks) {
        await message.channel.send(chunk);
      }
    }
  } catch (err) {
    console.error('OpenAI error:', err.message);
    await message.reply('*gazes into the void* The arcane channels are disrupted. Try again, traveler.');
  }
});

// --- Slash command handler ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // /clear — xóa lịch sử hội thoại
  if (commandName === 'clear') {
    conversations.delete(interaction.channelId);
    return interaction.reply('*waves paw* Memory cleared. A fresh timeline begins.');
  }

  // Tạo prompt tùy theo command
  let userMessage = '';

  if (commandName === 'ask') {
    userMessage = interaction.options.getString('question');
  } else if (commandName === 'lore') {
    userMessage = 'Tell me a short mystical lore story about your multiverse adventures as Siggy the wizard cat.';
  } else if (commandName === 'ritual') {
    userMessage = 'Explain the Ritual ecosystem to me — what is it, what does it do, and why does it matter?';
  } else if (commandName === 'gm') {
    userMessage = 'gm';
  }

  // Defer reply — bot có 3 giây để phản hồi, defer để có thêm thời gian chờ OpenAI
  await interaction.deferReply();

  try {
    const reply = await getAIReply(interaction.channelId, userMessage);
    await interaction.editReply(reply);
  } catch (err) {
    console.error('Slash command OpenAI error:', err.message);
    await interaction.editReply('*gazes into the void* The arcane channels are disrupted. Try again, traveler.');
  }
});

// --- Start ---
client.login(DISCORD_TOKEN);
