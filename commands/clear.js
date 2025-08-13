const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear bot messages in this channel')
    .addIntegerOption(opt => 
      opt.setName('amount')
        .setDescription('Number of bot messages to delete (1-100)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  async execute(interaction) {
    // Check if user has the required role
    const hasRole = interaction.member.roles.cache.has('1398549353911685200');
    if (!hasRole) {
      return await interaction.reply({ content: '❌ You need the required role to use this command.', flags: 64 });
    }

    const amount = interaction.options.getInteger('amount') || 10;
    
    try {
      await interaction.deferReply({ flags: 64 }); // Ephemeral defer
      
      // Fetch messages from the channel
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      
      // Filter for bot messages only
      const botMessages = messages.filter(msg => 
        msg.author.id === interaction.client.user.id && 
        msg.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000 // Only messages newer than 14 days
      );
      
      if (botMessages.size === 0) {
        return await interaction.editReply('📝 No bot messages found to delete.');
      }
      
      // Limit to requested amount
      const messagesToDelete = botMessages.first(Math.min(amount, botMessages.size));
      
      if (messagesToDelete.length === 0) {
        return await interaction.editReply('📝 No bot messages found to delete.');
      }
      
      // Delete messages
      let deletedCount = 0;
      for (const message of messagesToDelete) {
        try {
          await message.delete();
          deletedCount++;
        } catch (deleteError) {
          console.error('Failed to delete message:', deleteError.message);
        }
      }
      
      await interaction.editReply(`🧹 Successfully deleted ${deletedCount} bot message${deletedCount !== 1 ? 's' : ''}.`);
      
    } catch (error) {
      console.error('Clear Command Error:', error.message);
      try {
        if (interaction.deferred) {
          await interaction.editReply('❌ Failed to clear messages - check bot permissions');
        } else if (!interaction.replied) {
          await interaction.reply({ content: '❌ Failed to clear messages - check bot permissions', flags: 64 });
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError.message);
      }
    }
  }
};