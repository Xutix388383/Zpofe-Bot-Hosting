
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View key stats'),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', ephemeral: true });
    }

    try {
      const res = await axios.get(`${process.env.API_URL}/stats`);
      await interaction.reply(`📊 Stats:\nTotal: ${res.data.total}\nBound: ${res.data.bound}\nUnbound: ${res.data.unbound}`);
    } catch (error) {
      console.error('Stats API Error:', error.response?.data || error.message);
      await interaction.reply('❌ Failed to fetch stats');
    }
  }
};
