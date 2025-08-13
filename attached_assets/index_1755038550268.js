
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Register commands
client.once('ready', async () => {
  const guildId = '1396597333143064667';
  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    await guild.commands.set(client.commands.map(cmd => cmd.data));
    console.log('✅ Commands registered');
  }
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// Handle commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
  }
});

client.login(process.env.BOT_TOKEN);
