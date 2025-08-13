const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebhookManager = require('../webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generate new Zpofes keys')
    .addIntegerOption(opt => opt.setName('amount').setDescription('How many keys?').setRequired(true)),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    try {
      const amount = interaction.options.getInteger('amount');
      
      // Validate amount
      if (amount < 1 || amount > 10) {
        return await interaction.reply({ content: '❌ Amount must be between 1 and 10 keys.', flags: 64 });
      }

      const keys = [];
      const apiUrl = process.env.API_URL.replace(/\/+$/, '');
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

      // Show initial response for longer operations
      await interaction.deferReply({ flags: 64 }); // Ephemeral

      for (let i = 0; i < amount; i++) {
        const res = await axios.post(`${apiUrl}/genkey`);
        const newKey = res.data.key;
        keys.push(newKey);

        // Add to keys.json with metadata
        const keyData = {
          key: newKey,
          type: 'permanent',
          created: new Date().toISOString(),
          expiresAt: null,
          expiresInMinutes: null
        };
        keysData.keys.push(keyData);
        
        // Log key generation to webhook
        const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
        await webhook.logKeyAttempt(keyData, 'Generated', interaction.user.tag);
      }

      // Save to keys.json
      fs.writeFileSync(keysFilePath, JSON.stringify(keysData, null, 2));

      await interaction.editReply(`✅ Generated ${amount} keys:\n\`\`\`\n${keys.join('\n')}\n\`\`\``);
    } catch (error) {
      console.error('Generate API Error:', error.response?.data || error.message);
      
      try {
        if (interaction.deferred) {
          await interaction.editReply('❌ Failed to generate keys');
        } else if (!interaction.replied) {
          await interaction.reply({ content: '❌ Failed to generate keys', flags: 64 });
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};