const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebhookManager = require('../webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View key stats'),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    try {
      const apiUrl = process.env.API_URL.replace(/\/+$/, '');
      const keysFilePath = path.join(__dirname, '..', 'keys.json');
      
      // Get API stats
      const res = await axios.get(`${apiUrl}/stats`);
      
      // Get local JSON stats
      let localStats = { total: 0, permanent: 0, temporary: 0, active: 0 };
      if (fs.existsSync(keysFilePath)) {
        try {
          const keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
          localStats.total = keysData.keys.length;
          localStats.permanent = keysData.keys.filter(k => k.type === 'permanent').length;
          const now = new Date();
          localStats.temporary = keysData.keys.filter(k => k.type === 'temporary').length;
          localStats.active = keysData.keys.filter(k => 
            k.type === 'permanent' || (k.type === 'temporary' && new Date(k.expiresAt) > now)
          ).length;
        } catch (parseError) {
          console.error('Failed to parse keys.json:', parseError.message);
        }
      }
      
      // Create a formatted stats message
      const statsMessage = `📊 **License Key Statistics**\n\n` +
        `**API Stats:**\n` +
        `• Total Keys: ${res.data.total || 0}\n` +
        `• Bound Keys: ${res.data.bound || 0}\n` +
        `• Unbound Keys: ${res.data.unbound || 0}\n\n` +
        `**Local Storage (keys.json):**\n` +
        `• Total Keys: ${localStats.total}\n` +
        `• Permanent Keys: ${localStats.permanent}\n` +
        `• Temporary Keys: ${localStats.temporary}\n` +
        `• Active Keys: ${localStats.active}`;

      try {
        await interaction.reply({ content: statsMessage, flags: 64 });
        
        // Send webhook message with stats
        const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
        await webhook.sendStatsMessage({
          totalKeys: res.data.keys || 0,
          permanent: localStats.permanent,
          temporary: localStats.temporary,
          active: localStats.active,
          expired: localStats.expired,
          hwidResets: localStats.hwidResets
        }, interaction.user.tag);
        
      } catch (replyError) {
        console.error('Failed to send reply:', replyError.message);
      }
    } catch (error) {
      console.error('Stats API Error:', error.response?.data || error.message);
      
      // Provide more specific error messages based on status code
      try {
        if (!interaction.replied && !interaction.deferred) {
          if (error.response?.status === 503) {
            await interaction.reply({ content: '❌ Stats service temporarily unavailable', flags: 64 });
          } else if (error.response?.status === 401) {
            await interaction.reply({ content: '❌ Unauthorized access to stats', flags: 64 });
          } else {
            await interaction.reply({ content: '❌ Failed to fetch stats - server error', flags: 64 });
          }
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};
