
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempkey')
    .setDescription('Generate a temporary key that expires in 5 minutes'),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', ephemeral: true });
    }

    try {
      // Generate a new key
      const res = await axios.post(`${process.env.API_URL}/genkey`);
      const tempKey = res.data.key;

      // Reply with the temporary key
      await interaction.reply(`⏰ Generated temporary key (expires in 5 minutes):\n\`\`\`\n${tempKey}\n\`\`\``);

      // Set a timer to delete the key after 5 minutes (300,000 milliseconds)
      setTimeout(async () => {
        try {
          await axios.post(`${process.env.API_URL}/deletekey`, { key: tempKey });
          console.log(`🗑️ Temporary key ${tempKey} automatically deleted after 5 minutes`);
          
          // Try to send a follow-up message (will fail if interaction is old)
          try {
            await interaction.followUp({ 
              content: `⏰ Temporary key \`${tempKey}\` has expired and been deleted.`,
              ephemeral: true 
            });
          } catch (followUpError) {
            // Interaction might be too old, just log it
            console.log(`Could not send follow-up for expired key ${tempKey}`);
          }
        } catch (deleteError) {
          console.error('Failed to delete temporary key:', deleteError.response?.data || deleteError.message);
        }
      }, 5 * 60 * 1000); // 5 minutes in milliseconds

    } catch (error) {
      console.error('Temp Key API Error:', error.response?.data || error.message);
      await interaction.reply('❌ Failed to generate temporary key');
    }
  }
};
