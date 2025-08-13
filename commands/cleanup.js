const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Clean up expired temporary keys from storage'),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    const keysFilePath = path.join(__dirname, '..', 'keys.json');

    try {
      if (!fs.existsSync(keysFilePath)) {
        return await interaction.reply({ content: '📝 No keys.json file found. Nothing to clean up!', flags: 64 });
      }

      const keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
      const now = new Date();
      const originalCount = keysData.keys.length;

      // Filter out expired temporary keys
      const cleanedKeys = keysData.keys.filter(keyData => {
        if (keyData.type === 'permanent') {
          return true; // Keep all permanent keys
        }
        
        if (keyData.type === 'temporary') {
          const expiresAt = new Date(keyData.expiresAt);
          return expiresAt > now; // Keep only non-expired temporary keys
        }
        
        return true; // Keep unknown types for safety
      });

      const removedCount = originalCount - cleanedKeys.length;

      if (removedCount === 0) {
        return await interaction.reply({ 
          content: '✨ No expired keys found. Storage is already clean!', 
          flags: 64 
        });
      }

      // Update the JSON file
      keysData.keys = cleanedKeys;
      fs.writeFileSync(keysFilePath, JSON.stringify(keysData, null, 2));

      await interaction.reply({ 
        content: `🧹 Cleanup complete! Removed ${removedCount} expired key${removedCount !== 1 ? 's' : ''} from storage.\n\n` +
                `**Before:** ${originalCount} keys\n` +
                `**After:** ${cleanedKeys.length} keys`, 
        flags: 64 
      });

    } catch (error) {
      console.error('Cleanup Error:', error.message);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Failed to cleanup keys storage', flags: 64 });
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};