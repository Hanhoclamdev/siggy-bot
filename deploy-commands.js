// deploy-commands.js
// Chạy file này MỘT LẦN để đăng ký slash commands với Discord:
//   node deploy-commands.js

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1479566308252061736'; // Application ID của Siggy

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Hỏi Siggy bất kỳ điều gì')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('Câu hỏi của bạn')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('lore')
    .setDescription('Siggy kể một câu chuyện về đa vũ trụ'),

  new SlashCommandBuilder()
    .setName('ritual')
    .setDescription('Siggy giải thích về Ritual ecosystem'),

  new SlashCommandBuilder()
    .setName('gm')
    .setDescription('Chào Siggy buổi sáng'),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Xóa lịch sử hội thoại của Siggy trong kênh này'),

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Đang đăng ký ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Đăng ký slash commands thành công!');
  } catch (err) {
    console.error('Lỗi khi đăng ký commands:', err);
  }
})();
