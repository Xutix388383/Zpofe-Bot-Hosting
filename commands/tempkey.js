const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebhookManager = require('../webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempkey')
    .setDescription('Generate temporary keys that expire after specified time')
    .addIntegerOption(opt => opt.setName('time').setDescription('Time in minutes before expiration').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of keys to generate (1-10)').setRequired(true)),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    const time = interaction.options.getInteger('time');
    const amount = interaction.options.getInteger('amount');

    // Validate inputs
    if (time < 1 || time > 1440) { // Max 24 hours
      return await interaction.reply({ content: '❌ Time must be between 1 and 1440 minutes (24 hours).', flags: 64 });
    }
    if (amount < 1 || amount > 10) {
      return await interaction.reply({ content: '❌ Amount must be between 1 and 10 keys.', flags: 64 });
    }

    const apiUrl = process.env.API_URL.replace(/\/+$/, '');

    try {
      await interaction.deferReply({ flags: 64 }); // Ephemeral
      
      const keys = [];
      const keysFilePath = path.join(__dirname, '..', 'keys.json');
      
      // Load existing keys
      let keysData = { keys: [] };
      if (fs.existsSync(keysFilePath)) {
        try {
          keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
        } catch (parseError) {
          console.log('Creating new keys.json file');
        }
      }

      // Generate keys
      for (let i = 0; i < amount; i++) {
        const res = await axios.post(`${apiUrl}/genkey`);
        const tempKey = res.data.key;
        keys.push(tempKey);

        // Add to keys.json with metadata
        const keyData = {
          key: tempKey,
          type: 'temporary',
          created: new Date().toISOString(),
          expiresAt: new Date(Date.now() + time * 60 * 1000).toISOString(),
          expiresInMinutes: time
        };
        keysData.keys.push(keyData);
        
        // Log key generation to webhook
        const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
        await webhook.logKeyAttempt(keyData, 'Generated', interaction.user.tag);
      }

      // Save to keys.json
      fs.writeFileSync(keysFilePath, JSON.stringify(keysData, null, 2));

      await interaction.editReply(`⏰ Generated ${amount} temporary key${amount > 1 ? 's' : ''} (expires in ${time} minute${time > 1 ? 's' : ''}):\n\`\`\`\n${keys.join('\n')}\n\`\`\``);

      // Set timers to delete keys and remove from JSON
      keys.forEach(tempKey => {
        setTimeout(async () => {
          try {
            await axios.post(`${apiUrl}/deletekey`, { key: tempKey });
            console.log(`🗑️ Temporary key ${tempKey} automatically deleted after ${time} minutes`);
            
            // Remove from keys.json
            try {
              const currentData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
              currentData.keys = currentData.keys.filter(k => k.key !== tempKey);
              fs.writeFileSync(keysFilePath, JSON.stringify(currentData, null, 2));
            } catch (jsonError) {
              console.error('Failed to update keys.json:', jsonError.message);
            }
            
            // Log expiration to webhook instead of trying to follow up
            try {
              const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
              await webhook.logKeyAttempt({ key: tempKey }, 'Expired', 'System Cleanup', true);
            } catch (webhookError) {
              console.log(`Could not log expiration for key ${tempKey}`);
            }
          } catch (deleteError) {
            console.error('Failed to delete temporary key:', deleteError.response?.data || deleteError.message);
          }
        }, time * 60 * 1000);
      });

    } catch (error) {
      console.error('Temp Key API Error:', error.response?.data || error.message);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Failed to generate temporary keys', flags: 64 });
        } else if (interaction.deferred) {
          await interaction.editReply('❌ Failed to generate temporary keys');
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};
