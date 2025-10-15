import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { commands } from './commands';
import { storage } from './storage';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Create commands collection
const commandCollection = new Collection<string, any>();
commands.forEach(command => {
  commandCollection.set(command.data.name, command);
});

// Bot ready event
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🤖 E9 Trainer Bot is ready! Logged in as ${readyClient.user.tag}`);
  
  // Initialize storage
  await storage.initialize();
  console.log('💾 Storage system initialized');
  
  // Set bot status
  client.user?.setActivity('E9 creatures | /catch', { type: 1 }); // WATCHING
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commandCollection.get(interaction.commandName);
    
    if (!command) {
      console.error(`❌ No command matching ${interaction.commandName} was found.`);
      return;
    }
    
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing command ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: '❌ There was an error while executing this command!',
        ephemeral: true
      };
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        console.error('❌ Failed to send error message:', replyError);
      }
    }
  } else if (interaction.isButton()) {
    // Handle button interactions (boss attacks, refresh, etc.)
    try {
      await handleButtonInteraction(interaction);
    } catch (error) {
      console.error('❌ Error handling button interaction:', error);
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ An error occurred while processing your action.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('❌ Failed to send button error message:', replyError);
      }
    }
  }
});

// Track active interactions to prevent race conditions
const activeInteractions = new Set<string>();

// Handle button interactions globally (for boss attacks, refresh, etc.)
async function handleButtonInteraction(interaction: any) {
  const customId = interaction.customId;
  const interactionKey = `${interaction.user.id}_${customId}`;
  
  // Prevent multiple simultaneous interactions for the same user and button
  if (activeInteractions.has(interactionKey)) {
    return;
  }
  
  activeInteractions.add(interactionKey);
  
  try {
    // Handle boss-related button interactions (only refresh, attacks handled by commands.ts)
    if (customId.startsWith('refresh_boss_')) {
      // Extract boss ID from the button custom ID
      // Format: refresh_boss_${bossId}
      const bossId = customId.substring('refresh_boss_'.length);
      // Handle boss refresh
      await handleBossRefresh(interaction, bossId);
    }
    // Handle gym refresh button interactions (gym attacks handled by commands.ts)
    else if (customId.startsWith('refresh_gym_')) {
      // Extract gym ID from the button custom ID
      // Format: refresh_gym_${gymId}_${roundNumber}
      const parts = customId.split('_');
      const gymId = parts.slice(2, -1).join('_'); // Handle gym IDs with underscores
      // Don't use the round number from the button - always get current round from database
      
      // Handle gym refresh
      await handleGymRefresh(interaction, gymId, 0); // Pass 0 as roundNumber since we'll get current round from DB
    }
    // Add other button interaction handlers here as needed
  } finally {
    // Always clean up the interaction key
    activeInteractions.delete(interactionKey);
  }
}

// Import boss interaction handlers from commands
async function handleBossRefresh(interaction: any, bossId: string) {
  await interaction.deferUpdate();
  
  const activeBoss = await storage.getActiveBoss();
  
  if (!activeBoss || activeBoss.id !== bossId) {
    await interaction.editReply({
      content: '❌ Boss no longer exists or has been defeated!',
      embeds: [],
      components: []
    });
    return;
  }
  
  // Get user's attack status for personalized display
  const userId = interaction.user.id;
  const attackStatus = await storage.canUserAttackBoss(userId);
  
  // Recreate the boss embed with updated HP
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle('👹 RARE BOSS ACTIVE! 👹')
    .setDescription(`**${activeBoss.name}** is still active! Keep attacking to defeat it!`)
    .addFields(
      { name: '👹 Boss Name', value: activeBoss.name, inline: true },
      { name: '❤️ HP', value: `${activeBoss.baseStats.hp}/${activeBoss.baseStats.maxHp}`, inline: true },
      { name: '⚔️ Attack', value: activeBoss.baseStats.attack.toString(), inline: true },
      { name: '🛡️ Defense', value: activeBoss.baseStats.defense.toString(), inline: true },
      { name: '🎯 Your Attacks Left', value: storage.formatAttackRemaining(attackStatus.remaining), inline: true },
      { name: '⏰ Attack Cooldown', value: '30 seconds between attacks', inline: true },
      { name: '🏆 Reward', value: 'First to defeat gets Mythical tier guardian!', inline: true }
    )
    .setColor(0xff0000)
    .setTimestamp()
    .setImage(activeBoss.imageUrl || null);
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`attack_boss_${bossId}`)
        .setLabel('⚔️ Attack Boss')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👹')
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`refresh_boss_${bossId}`)
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
}

// handleBossAttack function removed - boss attacks are now handled by commands.ts

// Helper function to get rarity emoji (copied from commands.ts)
function getRarityEmoji(rarity: string): string {
  switch (rarity) {
    case 'common': return '⚪';
    case 'uncommon': return '🟢';
    case 'rare': return '🔵';
    case 'epic': return '🟣';
    case 'legendary': return '🟡';
    case 'mythical': return '🟠';
    case 'boss': return '👹';
    default: return '⚪';
  }
}

// Execute boss battle function (copied from commands.ts)
async function executeBossBattle(interaction: any, boss: any, creature: any, userId: string) {
  try {
    // Check if boss still exists before starting battle (race condition protection)
    const currentBoss = await storage.getActiveBoss();
    if (!currentBoss || currentBoss.id !== boss.id) {
      await interaction.editReply('❌ Boss no longer exists or has been defeated!');
      return;
    }
    
    // Create copies for battle (so we don't modify the originals)
    const battleCreature = { ...creature, stats: { ...creature.stats } };
    const battleBoss = { ...currentBoss, baseStats: { ...currentBoss.baseStats } };
    
    // Battle simulation - creature attacks first
    const creatureDamage = Math.max(1, battleCreature.stats.attack - Math.floor(battleBoss.baseStats.defense / 2) + Math.floor(Math.random() * 10) - 5);
    battleBoss.baseStats.hp = Math.max(0, battleBoss.baseStats.hp - creatureDamage);
    
    let creatureDied = false;
    let bossDamage = 0;
    
    // Boss attacks back if still alive
    if (battleBoss.baseStats.hp > 0) {
      bossDamage = Math.floor(Math.random() * 21) + 50; // Random damage between 50-70
      battleCreature.stats.hp = Math.max(0, battleCreature.stats.hp - bossDamage);
      creatureDied = battleCreature.stats.hp <= 0;
    }
    
    // Update boss HP in database
    await storage.updateBossHp(currentBoss.id, battleBoss.baseStats.hp);
    
    // Record the attack
    await storage.recordBossAttack(userId, currentBoss.id, creature.id, creatureDamage, creatureDied);
    
    // Remove dead creature if it died
    if (creatureDied) {
      await storage.removeDeadCreatureFromBossBattle(userId, creature.id);
    }
    
    // Create detailed battle result embed
    const { EmbedBuilder } = await import('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Boss Battle Result')
      .setDescription(`**${creature.name}** attacked **${currentBoss.name}**!`)
      .addFields(
        { name: '💥 Damage Dealt', value: `**${creatureDamage}** damage to boss!`, inline: true },
        { name: '👹 Boss HP', value: `${battleBoss.baseStats.hp}/${battleBoss.baseStats.maxHp}`, inline: true },
        { name: '🎯 Your Attacks Left', value: storage.formatAttackRemaining((await storage.canUserAttackBoss(userId)).remaining), inline: true }
      )
      .setColor(0xff6b35)
      .setTimestamp();
    
    // Add detailed creature status
    if (creatureDied) {
      embed.addFields({ 
        name: '💀 Creature Status', 
        value: `**${creature.name}** was defeated by the boss!\n💀 **HP**: 0/${creature.stats.maxHp}\n🗑️ **Removed from inventory**`, 
        inline: false 
      });
      embed.setColor(0xff0000); // Red for death
    } else if (bossDamage > 0) {
      embed.addFields({ 
        name: '💥 Boss Counterattack', 
        value: `Boss dealt **${bossDamage}** damage to **${creature.name}**!\n❤️ **HP**: ${battleCreature.stats.hp}/${creature.stats.maxHp}`, 
        inline: false 
      });
      embed.setColor(0xff6b35); // Orange for damage taken
    } else {
      embed.addFields({ 
        name: '✅ Creature Status', 
        value: `**${creature.name}** survived the battle!\n❤️ **HP**: ${creature.stats.hp}/${creature.stats.maxHp}`, 
        inline: false 
      });
      embed.setColor(0x00ff00); // Green for survival
    }
    
    // Check if boss was defeated
    if (battleBoss.baseStats.hp <= 0) {
      // Boss defeated! Give reward to the attacker
      const defeatedBoss = await storage.defeatBoss();
      
      if (defeatedBoss) {
        // Create Mythical guardian reward
        const mythicalGuardian = createMythicalGuardian(defeatedBoss.name);
        const caughtGuardian = storage.createCaughtCreature(mythicalGuardian.name, mythicalGuardian.rarity, mythicalGuardian.baseStats);
        
        // Try to add to inventory
        const addResult = await storage.addCreature(userId, caughtGuardian);
        
        if (addResult.success) {
          embed.setTitle('🏆 BOSS DEFEATED! 🏆')
            .setDescription(`**${interaction.user.username}** has defeated **${defeatedBoss.name}** and received a **Mythical** tier guardian!`)
            .setColor(0xffd700)
            .addFields({
              name: '🎁 Reward Received',
              value: `🔴 **${caughtGuardian.name}** (Mythical tier)`,
              inline: false
            });
        } else {
          // Inventory full - creature flees
          embed.setTitle('🏆 BOSS DEFEATED! 🏆')
            .setDescription(`**${interaction.user.username}** has defeated **${defeatedBoss.name}** but their inventory is full! The Mythical guardian has fled.`)
            .setColor(0xffd700);
        }
        
        // Announce boss defeat to everyone
        await interaction.followUp({
          content: `<@&1303873807253241946> **BOSS DEFEATED!**`,
          embeds: [embed]
        });
        
        // Update the original boss message to show defeat
        await interaction.editReply({
          content: '🏆 **BOSS DEFEATED!** 🏆',
          embeds: [embed],
          components: []
        });
        
        return;
      }
    }
    
    // Send battle result as a public message visible to everyone
    await interaction.followUp({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error executing boss battle:', error);
    await interaction.editReply('❌ An error occurred during the boss battle!');
  }
}

// Handle boss creature selection (for buttons created during boss attacks)
async function handleBossCreatureSelection(interaction: any, customId: string) {
  try {
    // Defer the interaction first (not ephemeral so followUp will be public)
    await interaction.deferReply();
    
    // Extract boss ID, creature ID, and timestamp from button custom ID
    // Format: boss_attack_creature_${bossId}_${creatureId}_${timestamp}
    const parts = customId.split('_');
    const bossId = parts.slice(3, -2).join('_'); // Handle boss IDs with underscores
    const creatureId = parts[parts.length - 2];
    const buttonTimestamp = parseInt(parts[parts.length - 1]);
    
    // Check if button is expired (older than 2 minutes)
    const currentTime = Date.now();
    if (currentTime - buttonTimestamp > 120000) { // 2 minutes
      await interaction.editReply('❌ This creature selection has expired! Please click "⚔️ Attack Boss" again to get fresh options.');
      return;
    }
    
    const userId = interaction.user.id;
    const activeBoss = await storage.getActiveBoss();
    
    if (!activeBoss || activeBoss.id !== bossId) {
      await interaction.editReply('❌ Boss no longer exists or has been defeated!');
      return;
    }
    
    // Get user's inventory
    const inventory = await storage.getUserInventory(userId);
    const aliveCreatures = inventory.creatures.filter(c => c.stats.hp > 0);
    
    // Find the selected creature
    const selectedCreature = aliveCreatures.find(c => c.id === creatureId);
    if (!selectedCreature) {
      // Check if creature exists but is dead
      const allCreatures = inventory.creatures;
      const deadCreature = allCreatures.find(c => c.id === creatureId);
      
      if (deadCreature) {
        await interaction.editReply('❌ This creature has died in a previous battle and was removed from your inventory! Please select a different creature or catch a new one.');
      } else {
        await interaction.editReply('❌ Creature not found! This creature may have been removed. Please select a different creature or catch a new one.');
      }
      return;
    }
    
    // Execute boss battle
    await executeBossBattle(interaction, activeBoss, selectedCreature, userId);
    
  } catch (error) {
    console.error('Error handling boss creature selection:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while selecting your creature.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending creature selection error reply:', replyError);
    }
  }
}

// Helper function to create mythical guardian (copied from commands.ts)
function createMythicalGuardian(bossName: string) {
  const guardianNames = ['Guardian', 'Protector', 'Defender', 'Champion', 'Knight', 'Paladin'];
  const randomName = guardianNames[Math.floor(Math.random() * guardianNames.length)];
  
  return {
    name: `${randomName} of ${bossName}`,
    rarity: 'mythical' as const,
    baseStats: {
      hp: 200 + Math.floor(Math.random() * 100),
      maxHp: 200 + Math.floor(Math.random() * 100),
      attack: 150 + Math.floor(Math.random() * 50),
      defense: 120 + Math.floor(Math.random() * 30)
    }
  };
}

// ===== GYM BATTLE HANDLERS =====

// Handle gym refresh
async function handleGymRefresh(interaction: any, gymId: string, roundNumber: number) {
  await interaction.deferUpdate();
  
  const activeGym = await storage.getActiveGym();
  
  if (!activeGym || activeGym.id !== gymId) {
    await interaction.editReply({
      content: '❌ Gym battle no longer exists or has been completed!',
      embeds: [],
      components: []
    });
    return;
  }
  
  // Check if gym has expired
  const expirationCheck = await storage.checkGymExpiration();
  if (expirationCheck.expired) {
    await interaction.editReply({
      content: `❌ ${expirationCheck.message}`,
      embeds: [],
      components: []
    });
    return;
  }
  
  // Get current round boss (always get the actual current round from activeGym, not from button)
  const currentBossData = await storage.getCurrentGymBoss();
  if (!currentBossData) {
    await interaction.editReply({
      content: '❌ Error: Could not find current gym boss.',
      embeds: [],
      components: []
    });
    return;
  }
  
  const { boss: currentBoss, round: currentRound } = currentBossData;
  
  // Get user's attack status for personalized display
  const userId = interaction.user.id;
  const attackStatus = await storage.canUserAttackGymBoss(userId);
  
  // Calculate time remaining
  const timeRemaining = activeGym.endTime - Date.now();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  // Recreate the gym embed with updated HP
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle('🏟️ CHAPTA SUMMON! 🏟️')
    .setDescription(`**Gym Battle** is still active! Keep attacking to defeat all 3 bosses!`)
    .addFields(
      { name: '🏟️ Round', value: `${currentRound}/3`, inline: true },
      { name: '👹 Current Boss', value: currentBoss.name, inline: true },
      { name: '❤️ HP', value: `${currentBoss.baseStats.hp}/${currentBoss.baseStats.maxHp}`, inline: true },
      { name: '⚔️ Attack', value: currentBoss.baseStats.attack.toString(), inline: true },
      { name: '🛡️ Defense', value: currentBoss.baseStats.defense.toString(), inline: true },
      { name: '🎯 Your Attacks Left', value: storage.formatAttackRemaining(attackStatus.remaining), inline: true },
      { name: '⏰ Attack Cooldown', value: '30 seconds between attacks', inline: true },
      { name: '🏆 Reward', value: 'All participants get Boss Badge if completed!', inline: true },
      { name: '⏳ Time Remaining', value: `${hoursRemaining}h ${minutesRemaining}m`, inline: true }
    )
    .setColor(0x9b59b6)
    .setTimestamp()
    .setImage(currentBoss.imageUrl);
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`attack_gym_${gymId}_${currentRound}`)
        .setLabel('⚔️ Attack Boss')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👹')
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`refresh_gym_${gymId}_${currentRound}`)
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
}

// Handle gym attack
async function handleGymAttack(interaction: any, gymId: string, roundNumber: number) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (error) {
    console.log(`[DEBUG] Failed to defer reply for gym attack: ${error instanceof Error ? error.message : String(error)}`);
    return; // Exit if we can't defer the reply
  }
  
  const userId = interaction.user.id;
  const activeGym = await storage.getActiveGym();
  
  if (!activeGym || activeGym.id !== gymId) {
    await interaction.editReply('❌ Gym battle no longer exists or has been completed!');
    return;
  }
  
  // Check if gym has expired
  const expirationCheck = await storage.checkGymExpiration();
  if (expirationCheck.expired) {
    await interaction.editReply(`❌ ${expirationCheck.message}`);
    return;
  }
  
  // Check if user can attack
  const attackStatus = await storage.canUserAttackGymBoss(userId);
  
  if (!attackStatus.canAttack) {
    if (attackStatus.remaining === 0) {
      // Check if user has no creatures
      const userInventory = await storage.getUserInventory(userId);
      const aliveCreatures = userInventory.creatures.filter(c => c.stats.hp > 0);
      if (aliveCreatures.length === 0) {
        await interaction.editReply('❌ You have no alive creatures in your inventory! Catch some creatures first.');
      } else {
        await interaction.editReply('❌ You have used all 3 daily attacks! Reset at midnight UTC.');
      }
      return;
    } else {
      const cooldownSeconds = Math.ceil(attackStatus.cooldownRemaining / 1000);
      await interaction.editReply(`❌ Please wait ${cooldownSeconds} seconds before attacking again.`);
      return;
    }
  }
  
  // Get user's inventory
  const inventory = await storage.getUserInventory(userId);
  
  if (inventory.creatures.length === 0) {
    await interaction.editReply('❌ You need at least one creature to attack the gym boss! Use `/catch` to get some.');
    return;
  }
  
  // Check for alive creatures
  const aliveCreatures = inventory.creatures.filter(c => c.stats.hp > 0);
  if (aliveCreatures.length === 0) {
    await interaction.editReply('❌ All your creatures are fainted! They need to rest.');
    return;
  }
  
  // Get current gym boss
  const currentBossData = await storage.getCurrentGymBoss();
  if (!currentBossData) {
    await interaction.editReply('❌ Error: Could not find current gym boss.');
    return;
  }
  
  const { boss: currentBoss } = currentBossData;
  
  // Show creature selection for gym attack
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = await import('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle('⚔️ Choose Your Attack Creature')
    .setDescription(`You are attacking **${currentBoss.name}** in Round ${currentBossData.round}!\n\n**Your Available Creatures:**`)
    .setColor(0x9b59b6)
    .setTimestamp();
  
  // Add detailed creature information to the embed
  aliveCreatures.forEach((creature, index) => {
    const status = creature.stats.hp <= 0 ? '💀' : '❤️';
    embed.addFields({
      name: `${index + 1}. ${getRarityEmoji(creature.rarity)} ${creature.name} (Lv.${creature.level})`,
      value: `${status} HP: ${creature.stats.hp}/${creature.stats.maxHp} | ⚔️ ATK: ${creature.stats.attack} | 🛡️ DEF: ${creature.stats.defense}`,
      inline: false
    });
  });
  
  embed.addFields({
    name: 'Selection',
    value: 'Click the button below to select your creature for the gym attack!',
    inline: false
  });
  
  // Create creature selection buttons
  const row = new ActionRowBuilder();
  
  // Add timestamp to button IDs to make them expire
  const buttonTimestamp = Date.now();
  
  aliveCreatures.forEach((creature, index) => {
    // Create shorter custom ID to stay under Discord's 100 character limit
    const shortGymId = gymId.substring(0, 8);
    const shortCreatureId = creature.id.substring(0, 8);
    const shortTimestamp = buttonTimestamp.toString().slice(-6); // Last 6 digits
    
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`gym_atk_${shortGymId}_${roundNumber}_${shortCreatureId}_${shortTimestamp}`)
        .setLabel(`${index + 1}. ${creature.name}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(getRarityEmoji(creature.rarity))
    );
  });
  
  const response = await interaction.editReply({ embeds: [embed], components: [row] });
  
  // Handle creature selection for gym attack
  try {
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 minute timeout
      filter: (i: any) => i.user.id === userId && (i.customId.startsWith('gym_attack_creature_') || i.customId.startsWith('gym_atk_'))
    });
    
    collector.on('collect', async (buttonInteraction: any) => {
      try {
        // Extract creature ID from button custom ID
        const customId = buttonInteraction.customId;
        let creatureId;
        
        // Get the current inventory first
        const currentInventory = await storage.getUserInventory(userId);
        
        if (customId.startsWith('gym_atk_')) {
          // New shorter format: gym_atk_${shortGymId}_${roundNumber}_${shortCreatureId}_${shortTimestamp}
          const parts = customId.split('_');
          const shortCreatureId = parts[4]; // The short creature ID (parts[3] is round number)
          
          // Find the full creature ID by matching the short version
          console.log(`[DEBUG] Looking for creature with short ID: "${shortCreatureId}"`);
          console.log(`[DEBUG] Available creatures:`, currentInventory.creatures.map(c => c.id));
          const matchingCreature = currentInventory.creatures.find(c => c.id.startsWith(shortCreatureId));
          console.log(`[DEBUG] Matching creature found:`, matchingCreature ? matchingCreature.id : 'NONE');
          if (!matchingCreature) {
            throw new Error('Creature not found');
          }
          creatureId = matchingCreature.id;
        } else {
          // Old format: gym_attack_creature_${gymId}_${roundNumber}_${creatureId}_${timestamp}
          creatureId = customId.substring(customId.lastIndexOf('_') + 1);
        }
        
        // Get the selected creature
        const selectedCreature = currentInventory.creatures.find(c => c.id === creatureId);
        if (!selectedCreature) {
          await buttonInteraction.update({
            content: '❌ Creature not found! This creature may have been removed or died. Please select a different creature or catch a new one.',
            embeds: [],
            components: []
          });
          return;
        }
        
        // Check if creature is still alive
        if (selectedCreature.stats.hp <= 0) {
          await buttonInteraction.update({
            content: '❌ This creature has died and cannot be used in battle! Please select a different creature or catch a new one.',
            embeds: [],
            components: []
          });
          return;
        }
        
        // Execute gym battle
        await executeGymBattle(buttonInteraction, currentBoss, selectedCreature, userId, gymId, roundNumber);
        
      } catch (buttonError) {
        console.error('Error handling gym creature selection:', buttonError);
        try {
          if (!buttonInteraction.replied && !buttonInteraction.deferred) {
            await buttonInteraction.reply({
              content: '❌ An error occurred while selecting your creature.',
              ephemeral: true
            });
          }
        } catch (replyError) {
          console.error('Error sending gym creature selection error reply:', replyError);
        }
      }
    });
    
    collector.on('end', () => {
      console.log('Gym creature selection collector ended');
    });
    
  } catch (error) {
    console.error('Error setting up gym creature selection collector:', error);
  }
}

// Handle gym creature selection (for buttons created during gym attacks)
async function handleGymCreatureSelection(interaction: any, customId: string) {
  try {
    // Defer the interaction first (not ephemeral so followUp will be public)
    await interaction.deferReply();
    
    // Extract gym ID, round number, creature ID, and timestamp from button custom ID
    const parts = customId.split('_');
    let gymId, roundNumber, creatureId, buttonTimestamp;
    
    if (customId.startsWith('gym_atk_')) {
      // New shorter format: gym_atk_${shortGymId}_${roundNumber}_${shortCreatureId}_${shortTimestamp}
      gymId = parts.slice(2, -3).join('_'); // Handle gym IDs with underscores
      roundNumber = parseInt(parts[parts.length - 3]);
      const shortCreatureId = parts[parts.length - 2];
      buttonTimestamp = parseInt(parts[parts.length - 1]);
      
      // Get the current inventory to find the full creature ID
      const currentInventory = await storage.getUserInventory(interaction.user.id);
      const matchingCreature = currentInventory.creatures.find(c => c.id.startsWith(shortCreatureId));
      if (!matchingCreature) {
        await interaction.editReply('❌ Creature not found! This creature may have been removed or died.');
        return;
      }
      creatureId = matchingCreature.id;
    } else {
      // Old format: gym_attack_creature_${gymId}_${roundNumber}_${creatureId}_${timestamp}
      gymId = parts.slice(3, -2).join('_'); // Handle gym IDs with underscores
      roundNumber = parseInt(parts[parts.length - 3]);
      creatureId = parts[parts.length - 2];
      buttonTimestamp = parseInt(parts[parts.length - 1]);
    }
    
    // Check if button is expired (older than 2 minutes)
    const currentTime = Date.now();
    if (currentTime - buttonTimestamp > 120000) { // 2 minutes
      await interaction.editReply('❌ This creature selection has expired! Please click "⚔️ Attack Boss" again to get fresh options.');
      return;
    }
    
    const userId = interaction.user.id;
    const activeGym = await storage.getActiveGym();
    
    if (!activeGym || activeGym.id !== gymId) {
      await interaction.editReply('❌ Gym battle no longer exists or has been completed!');
      return;
    }
    
    // Get user's inventory
    const inventory = await storage.getUserInventory(userId);
    const aliveCreatures = inventory.creatures.filter(c => c.stats.hp > 0);
    
    // Find the selected creature
    const selectedCreature = aliveCreatures.find(c => c.id === creatureId);
    if (!selectedCreature) {
      // Check if creature exists but is dead
      const allCreatures = inventory.creatures;
      const deadCreature = allCreatures.find(c => c.id === creatureId);
      
      if (deadCreature) {
        await interaction.editReply('❌ This creature has died in a previous battle and was removed from your inventory! Please select a different creature or catch a new one.');
      } else {
        await interaction.editReply('❌ Creature not found! This creature may have been removed. Please select a different creature or catch a new one.');
      }
      return;
    }
    
    // Get current gym boss
    const currentBossData = await storage.getCurrentGymBoss();
    if (!currentBossData) {
      await interaction.editReply('❌ Error: Could not find current gym boss.');
      return;
    }
    
    // Execute gym battle
    await executeGymBattle(interaction, currentBossData.boss, selectedCreature, userId, gymId, roundNumber);
    
  } catch (error) {
    console.error('Error handling gym creature selection:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while selecting your creature.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending gym creature selection error reply:', replyError);
    }
  }
}

// Execute gym battle function
async function executeGymBattle(interaction: any, boss: any, creature: any, userId: string, gymId: string, roundNumber: number) {
  try {
    // Create copies for battle (so we don't modify the originals)
    const battleCreature = { ...creature, stats: { ...creature.stats } };
    const battleBoss = { ...boss, baseStats: { ...boss.baseStats } };
    
    // Battle simulation - creature attacks first
    const creatureDamage = Math.max(1, battleCreature.stats.attack - Math.floor(battleBoss.baseStats.defense / 2) + Math.floor(Math.random() * 10) - 5);
    battleBoss.baseStats.hp = Math.max(0, battleBoss.baseStats.hp - creatureDamage);
    
    let creatureDied = false;
    let bossDamage = 0;
    
    // Boss attacks back if still alive
    if (battleBoss.baseStats.hp > 0) {
      bossDamage = Math.floor(Math.random() * 21) + 50; // Random damage between 50-70
      battleCreature.stats.hp = Math.max(0, battleCreature.stats.hp - bossDamage);
      creatureDied = battleCreature.stats.hp <= 0;
    }
    
    // Update gym boss HP in database
    await storage.updateGymBossHp(roundNumber, battleBoss.baseStats.hp);
    
    // Record the gym battle attack
    await storage.recordGymBattleAttack(userId, roundNumber, creature.id, creatureDamage, creatureDied);
    
    // Remove dead creature if it died
    if (creatureDied) {
      await storage.removeDeadCreatureFromBossBattle(userId, creature.id);
    }
    
    // Create detailed battle result embed
    const { EmbedBuilder } = await import('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Gym Battle Result')
      .setDescription(`**${creature.name}** attacked **${boss.name}** in Round ${roundNumber}!`)
      .addFields(
        { name: '💥 Damage Dealt', value: `**${creatureDamage}** damage to boss!`, inline: true },
        { name: '👹 Boss HP', value: `${battleBoss.baseStats.hp}/${battleBoss.baseStats.maxHp}`, inline: true },
        { name: '🎯 Your Attacks Left', value: storage.formatAttackRemaining((await storage.canUserAttackGymBoss(userId)).remaining), inline: true }
      )
      .setColor(0x9b59b6)
      .setTimestamp();
    
    // Add detailed creature status
    if (creatureDied) {
      embed.addFields({ 
        name: '💀 Creature Status', 
        value: `**${creature.name}** was defeated by the boss!\n💀 **HP**: 0/${creature.stats.maxHp}\n🗑️ **Removed from inventory**`, 
        inline: false 
      });
      embed.setColor(0xff0000); // Red for death
    } else if (bossDamage > 0) {
      embed.addFields({ 
        name: '💥 Boss Counterattack', 
        value: `Boss dealt **${bossDamage}** damage to **${creature.name}**!\n❤️ **HP**: ${battleCreature.stats.hp}/${creature.stats.maxHp}`, 
        inline: false 
      });
      embed.setColor(0x9b59b6); // Purple for damage taken
    } else {
      embed.addFields({ 
        name: '✅ Creature Status', 
        value: `**${creature.name}** survived the battle!\n❤️ **HP**: ${battleCreature.stats.hp}/${creature.stats.maxHp}`, 
        inline: false 
      });
      embed.setColor(0x00ff00); // Green for survival
    }
    
    // Check if boss was defeated
    if (battleBoss.baseStats.hp <= 0) {
      // Boss defeated! Complete the round
      const roundResult = await storage.completeGymRound();
      
      if (roundResult.success) {
        if (roundResult.nextRound) {
          // Next round started
          embed.setTitle('🏆 ROUND COMPLETED! 🏆')
            .setDescription(`**${interaction.user.username}** has defeated **${boss.name}** in Round ${roundNumber}! Starting Round ${roundNumber + 1}...`)
            .setColor(0xffd700)
            .addFields({
              name: '🎉 Round Progress',
              value: `Round ${roundNumber}/3 completed! Moving to Round ${roundNumber + 1}/3`,
              inline: false
            });
          
          // Announce round completion to everyone
          await interaction.followUp({
            content: `<@&1303873807253241946> **ROUND ${roundNumber} COMPLETED!**`,
            embeds: [embed]
          });
          
          // Update the original gym message to show next round
          await interaction.editReply({
            content: '🏆 **ROUND COMPLETED!** 🏆',
            embeds: [embed],
            components: []
          });
          
          return;
        } else {
          // Gym completed successfully
          embed.setTitle('🏆 GYM BATTLE COMPLETED! 🏆')
            .setDescription(`**${interaction.user.username}** has defeated the final boss! All participants received Boss Badges!`)
            .setColor(0xffd700)
            .addFields({
              name: '🎁 Rewards',
              value: 'All participants have received Boss Badges! Check your `/gyminventory` to see them.',
              inline: false
            });
          
          // Announce gym completion to everyone
          await interaction.followUp({
            content: `<@&1303873807253241946> **GYM BATTLE COMPLETED!**`,
            embeds: [embed]
          });
          
          // Update the original gym message to show completion
          await interaction.editReply({
            content: '🏆 **GYM BATTLE COMPLETED!** 🏆',
            embeds: [embed],
            components: []
          });
          
          return;
        }
      }
    }
    
    // Send battle result as a public message visible to everyone
    await interaction.followUp({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error executing gym battle:', error);
    await interaction.editReply('❌ An error occurred during the gym battle!');
  }
}

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set in environment variables!');
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error('❌ Failed to login to Discord:', error);
  process.exit(1);
});
