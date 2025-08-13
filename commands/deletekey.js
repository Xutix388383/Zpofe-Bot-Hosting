const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebhookManager = require('../webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletekey')
    .setDescription('Delete a key permanently')
    .addStringOption(opt => opt.setName('key').setDescription('License key').setRequired(true)),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    try {
      const key = interaction.options.getString('key');
      
      // Validate key format (basic validation)
      if (!key || key.trim().length === 0) {
        return await interaction.reply({ content: '❌ Please provide a valid license key.', flags: 64 });
      }

      const apiUrl = process.env.API_URL.replace(/\/+$/, '');
      const keysFilePath = path.join(__dirname, '..', 'keys.json');
      
      const res = await axios.post(`${apiUrl}/deletekey`, { key: key.trim() });

      if (res.data.success) {
        // Remove from keys.json
        try {
          if (fs.existsSync(keysFilePath)) {
            const keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
            keysData.keys = keysData.keys.filter(k => k.key !== key.trim());
            fs.writeFileSync(keysFilePath, JSON.stringify(keysData, null, 2));
          }
        } catch (jsonError) {
          console.error('Failed to update keys.json:', jsonError.message);
        }
      }

      try {
        const success = res.data.success;
        await interaction.reply({ 
          content: success
            ? `🗑️ Key \`${key}\` deleted successfully`
            : `❌ Failed to delete key: ${res.data.message || 'Unknown error'}`,
          flags: 64
        });
        
        // Log key deletion to webhook
        if (success) {
          const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
          await webhook.logKeyAttempt({ key }, 'Deleted', interaction.user.tag, success);
        }
      } catch (replyError) {
        console.error('Failed to send reply:', replyError.message);
      }
    } catch (error) {
      console.error('Delete Key API Error:', error.response?.data || error.message);
      
      // Provide more specific error messages based on status code
      try {
        if (!interaction.replied && !interaction.deferred) {
          if (error.response?.status === 404) {
            await interaction.reply({ content: '❌ Key not found or already deleted', flags: 64 });
          } else if (error.response?.status === 400) {
            await interaction.reply({ content: '❌ Invalid key format', flags: 64 });
          } else {
            await interaction.reply({ content: '❌ Failed to delete key - server error', flags: 64 });
          }
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};
