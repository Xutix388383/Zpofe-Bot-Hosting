
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generate new Zpofes keys')
    .addIntegerOption(opt => opt.setName('amount').setDescription('How many keys?').setRequired(true)),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', ephemeral: true });
    }

    try {
      const amount = interaction.options.getInteger('amount');
      const keys = [];

      for (let i = 0; i < amount; i++) {
        const res = await axios.post(`${process.env.API_URL}/genkey`);
        keys.push(res.data.key);
      }

      await interaction.reply(`✅ Generated ${amount} keys:\n\`\`\`\n${keys.join('\n')}\n\`\`\``);
    } catch (error) {
      console.error('Generate API Error:', error.response?.data || error.message);
      await interaction.reply('❌ Failed to generate keys');
    }
  }
};
