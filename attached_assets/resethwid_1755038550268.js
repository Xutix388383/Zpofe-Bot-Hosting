const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resethwid')
    .setDescription('Reset HWID for a key')
    .addStringOption(opt => opt.setName('key').setDescription('License key').setRequired(true)),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', ephemeral: true });
    }

    try {
      const key = interaction.options.getString('key');
      const res = await axios.post(`${process.env.API_URL}/resethwid`, { key });

      await interaction.reply(res.data.success
        ? `✅ HWID reset for \`${key}\``
        : `❌ Failed: ${res.data.message}`);
    } catch (error) {
      console.error('Reset HWID API Error:', error.response?.data || error.message);
      await interaction.reply('❌ Failed to reset HWID');
    }
  }
};