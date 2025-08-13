const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listkeys')
    .setDescription('List all stored keys from keys.json')
    .addStringOption(opt => 
      opt.setName('type')
        .setDescription('Filter by key type')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Permanent', value: 'permanent' },
          { name: 'Temporary', value: 'temporary' },
          { name: 'Active', value: 'active' }
        )
    ),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    const filterType = interaction.options.getString('type') || 'all';
    const keysFilePath = path.join(__dirname, '..', 'keys.json');

    try {
      if (!fs.existsSync(keysFilePath)) {
        return await interaction.reply({ content: '📝 No keys.json file found. Generate some keys first!', flags: 64 });
      }

      const keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
      let filteredKeys = keysData.keys || [];

      // Apply filters
      const now = new Date();
      switch (filterType) {
        case 'permanent':
          filteredKeys = filteredKeys.filter(k => k.type === 'permanent');
          break;
        case 'temporary':
          filteredKeys = filteredKeys.filter(k => k.type === 'temporary');
          break;
        case 'active':
          filteredKeys = filteredKeys.filter(k => 
            k.type === 'permanent' || (k.type === 'temporary' && new Date(k.expiresAt) > now)
          );
          break;
        // 'all' or default - no filtering
      }

      if (filteredKeys.length === 0) {
        return await interaction.reply({ 
          content: `📝 No ${filterType === 'all' ? '' : filterType + ' '}keys found.`, 
          flags: 64 
        });
      }

      // Create paginated response for large lists
      const keysPerPage = 10;
      const totalPages = Math.ceil(filteredKeys.length / keysPerPage);
      const page = 1; // Default to first page
      
      const startIndex = (page - 1) * keysPerPage;
      const endIndex = startIndex + keysPerPage;
      const pageKeys = filteredKeys.slice(startIndex, endIndex);

      let response = `📋 **${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Keys** (Page ${page}/${totalPages})\n\n`;
      
      pageKeys.forEach((keyData, index) => {
        const keyNumber = startIndex + index + 1;
        const isExpired = keyData.type === 'temporary' && new Date(keyData.expiresAt) <= now;
        const status = isExpired ? '⏰ EXPIRED' : keyData.type === 'temporary' ? '⏳ TEMP' : '♾️ PERM';
        
        response += `**${keyNumber}.** \`${keyData.key}\` ${status}\n`;
        response += `   Created: ${new Date(keyData.created).toLocaleString()}\n`;
        
        if (keyData.type === 'temporary') {
          response += `   Expires: ${new Date(keyData.expiresAt).toLocaleString()}\n`;
        }
        
        if (keyData.hwidReset) {
          response += `   HWID Reset: ${new Date(keyData.hwidReset).toLocaleString()}\n`;
        }
        
        response += '\n';
      });

      if (response.length > 2000) {
        // If response is too long, split into multiple messages
        const keysList = pageKeys.map(k => k.key).join('\n');
        response = `📋 **${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Keys** (${filteredKeys.length} total)\n\`\`\`\n${keysList}\n\`\`\``;
      }

      await interaction.reply({ content: response, flags: 64 });

    } catch (error) {
      console.error('List Keys Error:', error.message);
      await interaction.reply({ content: '❌ Failed to read keys from storage', flags: 64 });
    }
  }
};