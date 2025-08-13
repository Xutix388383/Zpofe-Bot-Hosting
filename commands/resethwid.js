const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebhookManager = require('../webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resethwid')
    .setDescription('Reset HWID for a key')
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
      
      const res = await axios.post(`${apiUrl}/resethwid`, { key: key.trim() });

      if (res.data.success) {
        // Update keys.json with reset info
        try {
          if (fs.existsSync(keysFilePath)) {
            const keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
            const keyIndex = keysData.keys.findIndex(k => k.key === key.trim());
            if (keyIndex !== -1) {
              keysData.keys[keyIndex].hwidReset = new Date().toISOString();
              fs.writeFileSync(keysFilePath, JSON.stringify(keysData, null, 2));
            }
          }
        } catch (jsonError) {
          console.error('Failed to update keys.json:', jsonError.message);
        }
      }

      try {
        const success = res.data.success;
        await interaction.reply({ 
          content: success
            ? `✅ HWID reset successfully for key \`${key}\``
            : `❌ Failed to reset HWID: ${res.data.message || 'Unknown error'}`,
          flags: 64
        });
        
        // Log HWID reset to webhook
        if (success) {
          const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
          await webhook.logKeyAttempt({ key, hwidReset: new Date().toISOString() }, 'HWID Reset', interaction.user.tag, success);
        }
      } catch (replyError) {
        console.error('Failed to send reply:', replyError.message);
      }
    } catch (error) {
      console.error('Reset HWID API Error:', error.response?.data || error.message);
      
      // Provide more specific error messages based on status code
      try {
        if (!interaction.replied && !interaction.deferred) {
          if (error.response?.status === 404) {
            await interaction.reply({ content: '❌ Key not found', flags: 64 });
          } else if (error.response?.status === 400) {
            await interaction.reply({ content: '❌ Invalid key format or key not bound to HWID', flags: 64 });
          } else {
            await interaction.reply({ content: '❌ Failed to reset HWID - server error', flags: 64 });
          }
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};
