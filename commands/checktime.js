const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checktime')
    .setDescription('Check expiration time for keys')
    .addStringOption(opt => 
      opt.setName('key')
        .setDescription('Specific key to check (leave empty to check all temporary keys)')
        .setRequired(false)
    ),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    const specificKey = interaction.options.getString('key');
    const keysFilePath = path.join(__dirname, '..', 'keys.json');

    try {
      if (!fs.existsSync(keysFilePath)) {
        return await interaction.reply({ content: '📝 No keys.json file found. Generate some keys first!', flags: 64 });
      }

      const keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
      const now = new Date();

      if (specificKey) {
        // Check specific key
        const keyData = keysData.keys.find(k => k.key === specificKey.trim());
        
        if (!keyData) {
          return await interaction.reply({ content: `❌ Key \`${specificKey}\` not found in storage.`, flags: 64 });
        }

        let response = `🔍 **Key Time Information**\n\n`;
        response += `**Key:** \`${keyData.key}\`\n`;
        response += `**Type:** ${keyData.type === 'permanent' ? '♾️ Permanent' : '⏳ Temporary'}\n`;
        response += `**Created:** ${new Date(keyData.created).toLocaleString()}\n`;

        if (keyData.type === 'temporary') {
          const expiresAt = new Date(keyData.expiresAt);
          const timeLeft = expiresAt - now;
          
          if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            response += `**Expires At:** ${expiresAt.toLocaleString()}\n`;
            response += `**Time Remaining:** ${hours}h ${minutes}m ${seconds}s\n`;
            response += `**Status:** 🟢 Active`;
          } else {
            response += `**Expired At:** ${expiresAt.toLocaleString()}\n`;
            response += `**Status:** 🔴 Expired`;
          }
        } else {
          response += `**Status:** 🟢 Never Expires`;
        }

        if (keyData.hwidReset) {
          response += `\n**HWID Reset:** ${new Date(keyData.hwidReset).toLocaleString()}`;
        }

        await interaction.reply({ content: response, flags: 64 });

      } else {
        // Check all temporary keys
        const tempKeys = keysData.keys.filter(k => k.type === 'temporary');
        
        if (tempKeys.length === 0) {
          return await interaction.reply({ content: '📝 No temporary keys found in storage.', flags: 64 });
        }

        let response = `⏰ **Temporary Keys Status** (${tempKeys.length} total)\n\n`;
        
        const activeKeys = [];
        const expiredKeys = [];

        tempKeys.forEach(keyData => {
          const expiresAt = new Date(keyData.expiresAt);
          const timeLeft = expiresAt - now;

          if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            activeKeys.push({
              key: keyData.key,
              timeLeft: `${hours}h ${minutes}m`,
              expiresAt: expiresAt.toLocaleString()
            });
          } else {
            expiredKeys.push({
              key: keyData.key,
              expiredAt: expiresAt.toLocaleString()
            });
          }
        });

        if (activeKeys.length > 0) {
          response += `**🟢 Active Keys (${activeKeys.length}):**\n`;
          activeKeys.slice(0, 10).forEach((key, index) => {
            response += `${index + 1}. \`${key.key}\` - ${key.timeLeft} left\n`;
          });
          if (activeKeys.length > 10) {
            response += `... and ${activeKeys.length - 10} more\n`;
          }
          response += '\n';
        }

        if (expiredKeys.length > 0) {
          response += `**🔴 Expired Keys (${expiredKeys.length}):**\n`;
          expiredKeys.slice(0, 5).forEach((key, index) => {
            response += `${index + 1}. \`${key.key}\` - Expired\n`;
          });
          if (expiredKeys.length > 5) {
            response += `... and ${expiredKeys.length - 5} more\n`;
          }
        }

        // Trim response if too long
        if (response.length > 2000) {
          response = `⏰ **Temporary Keys Summary**\n\n🟢 Active: ${activeKeys.length}\n🔴 Expired: ${expiredKeys.length}\n\nUse \`/checktime [key]\` to check specific keys.`;
        }

        await interaction.reply({ content: response, flags: 64 });
      }

    } catch (error) {
      console.error('Check Time Error:', error.message);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Failed to check key times', flags: 64 });
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};