import { REST, Routes } from 'discord.js';
import { commands } from './commands';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Missing required environment variables: DISCORD_TOKEN and DISCORD_CLIENT_ID');
  process.exit(1);
}

// Convert commands to JSON format
const commandData = commands.map(command => command.data.toJSON());

// Create REST instance
const rest = new REST().setToken(token);

// Register commands
(async () => {
  try {
    console.log(`🔄 Started refreshing ${commandData.length} application (/) commands.`);
    
    let data: any;
    
    if (guildId) {
      // Register commands for specific guild (faster for development)
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData }
      );
      console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands.`);
    } else {
      // Register commands globally (takes up to 1 hour to propagate)
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandData }
      );
      console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
