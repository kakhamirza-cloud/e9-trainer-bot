import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { storage } from './storage.js';
import { getRandomCreature, getRandomBotCreature, getRarityEmoji, getRandomAdventureItem, createRandomBoss, createMythicalGuardian, E9_CREATURES } from './creatures.js';
import { CaughtCreature } from './types.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Function to generate a bot creature with equal probability for all tiers
function generateBotCreature(): CaughtCreature {
  // Get a random creature with equal probability for all tiers (for bot battles only)
  const randomCreature = getRandomBotCreature();
  
  // Create bot creature with the same stats as the random creature
  const botCreature: CaughtCreature = {
    id: `bot-creature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "Trainer Bot's Creature",
    level: 1,
    stats: {
      hp: randomCreature.baseStats.hp,
      maxHp: randomCreature.baseStats.hp,
      attack: randomCreature.baseStats.attack,
      defense: randomCreature.baseStats.defense
    },
    rarity: randomCreature.rarity,
    caughtAt: new Date(),
    experience: 0
  };
  
  return botCreature;
}

// Function to handle bot battles
async function handleBotBattle(interaction: ChatInputCommandInteraction, challengerId: string, challengerCreatures: CaughtCreature[]) {
  // Increment challenge usage for the player
  await storage.incrementChallengeUsage(challengerId);
  
  // Show creature selection for bot battle
  const embed = new EmbedBuilder()
    .setTitle('⚔️ Choose Your Battle Creature')
    .setDescription(`You are challenging **Trainer Bot** to battle!\n\n**Your Available Creatures:**`)
    .setColor(0xff6b35)
    .setTimestamp();
  
  // Add detailed creature information to the embed
  challengerCreatures.forEach((creature, index) => {
    const status = creature.stats.hp <= 0 ? '💀' : '❤️';
    embed.addFields({
      name: `${index + 1}. ${getRarityEmoji(creature.rarity)} ${creature.name} (Lv.${creature.level})`,
      value: `${status} HP: ${creature.stats.hp}/${creature.stats.maxHp} | ⚔️ ATK: ${creature.stats.attack} | 🛡️ DEF: ${creature.stats.defense}`,
      inline: false
    });
  });
  
  embed.addFields({
    name: 'Selection',
    value: 'Click the button below to select your creature for battle against Trainer Bot!',
    inline: false
  });
  
  // Create creature selection buttons
  const row = new ActionRowBuilder<ButtonBuilder>();
  
  challengerCreatures.forEach((creature, index) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`bot_battle_creature_${creature.id}`)
        .setLabel(`${index + 1}. ${creature.name}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(getRarityEmoji(creature.rarity))
    );
  });
  
  const response = await interaction.editReply({ embeds: [embed], components: [row] });
  
  // Handle button interactions for creature selection
  try {
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 minute timeout
      filter: (i) => i.user.id === challengerId
    });
    
    collector.on('collect', async (buttonInteraction) => {
      try {
        const creatureId = buttonInteraction.customId.split('_')[3];
        
        // Get the selected creature
        const currentInventory = await storage.getUserInventory(challengerId);
        const selectedCreature = currentInventory.creatures.find(c => c.id === creatureId);
        
        if (!selectedCreature) {
          await buttonInteraction.update({
            content: '❌ Creature not found! This creature may have been removed or died.',
            embeds: [],
            components: []
          });
          return;
        }
        
        // Check if creature is still alive
        if (selectedCreature.stats.hp <= 0) {
          await buttonInteraction.update({
            content: '❌ This creature has died and cannot be used in battle!',
            embeds: [],
            components: []
          });
          return;
        }
        
        // Generate bot creature and execute battle
        const botCreature = generateBotCreature();
        await executeBotBattle(buttonInteraction, challengerId, selectedCreature, botCreature);
        
      } catch (buttonError) {
        console.error('Error handling bot battle button interaction:', buttonError);
        try {
          if (!buttonInteraction.replied && !buttonInteraction.deferred) {
            await buttonInteraction.reply({
              content: '❌ An error occurred while processing your selection.',
              ephemeral: true
            });
          }
        } catch (replyError) {
          console.error('Error sending bot battle button error reply:', replyError);
        }
      }
    });
    
    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.followUp({
          content: '⏰ Bot battle selection timed out.',
          ephemeral: true
        });
      }
    });
    
  } catch (error) {
    console.error('Error handling bot battle buttons:', error);
  }
}

// Function to execute bot battle
async function executeBotBattle(interaction: any, challengerId: string, playerCreature: CaughtCreature, botCreature: CaughtCreature) {
  try {
    // Create copies for battle (so we don't modify the originals)
    const battlePlayer = { ...playerCreature, stats: { ...playerCreature.stats } };
    const battleBot = { ...botCreature, stats: { ...botCreature.stats } };
    
    // Battle simulation
    const battleLog: string[] = [];
    let round = 1;
    const maxRounds = 20; // Prevent infinite battles
    
    battleLog.push(`🎯 **Battle Start!**`);
    battleLog.push(`**${playerCreature.name}** (Lv.${battlePlayer.level}) vs **${botCreature.name}** (Lv.${battleBot.level})`);
    
    while (battlePlayer.stats.hp > 0 && battleBot.stats.hp > 0 && round <= maxRounds) {
      // Player attacks first
      const playerDamage = Math.max(1, battlePlayer.stats.attack - Math.floor(battleBot.stats.defense / 2) + Math.floor(Math.random() * 10) - 5);
      battleBot.stats.hp = Math.max(0, battleBot.stats.hp - playerDamage);
      
      battleLog.push(`Round ${round}: **${battlePlayer.name}** attacks for ${playerDamage} damage! **${battleBot.name}** has ${battleBot.stats.hp} HP left.`);
      
      if (battleBot.stats.hp <= 0) break;
      
      // Bot attacks
      const botDamage = Math.max(1, battleBot.stats.attack - Math.floor(battlePlayer.stats.defense / 2) + Math.floor(Math.random() * 10) - 5);
      battlePlayer.stats.hp = Math.max(0, battlePlayer.stats.hp - botDamage);
      
      battleLog.push(`Round ${round}: **${battleBot.name}** attacks for ${botDamage} damage! **${battlePlayer.name}** has ${battlePlayer.stats.hp} HP left.`);
      
      round++;
    }
    
    // Determine winner
    const playerWon = battlePlayer.stats.hp > 0;
    const winnerCreature = playerWon ? battlePlayer : battleBot;
    const loserCreature = playerWon ? battleBot : battlePlayer;
    
    // Update battle stats
    await storage.incrementBattles(challengerId);
    
    if (playerWon) {
      await storage.incrementWins(challengerId);
    }
    
    // Handle creature death - remove dead creature from inventory if player lost
    if (!playerWon && loserCreature.stats.hp <= 0) {
      await storage.removeDeadCreature(challengerId, playerCreature.id);
    }
    
    // Handle creature level up if player won (same as regular battles)
    if (playerWon) {
      // Level up winner's creature (same as regular battles)
      const leveledUpCreature = storage.levelUpCreature(battlePlayer);
      await storage.updateCreature(challengerId, playerCreature.id, leveledUpCreature);
      battleLog.push(`🎉 **${playerCreature.name}** leveled up to Level ${leveledUpCreature.level}!`);
    }
    
    // Create battle result embed
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Bot Battle Result')
      .setDescription(`**${playerCreature.name}** vs **${botCreature.name}**`)
      .setColor(playerWon ? 0x00ff00 : 0xff0000)
      .setTimestamp();
    
    // Add battle log (limit to last 10 rounds to avoid embed limits)
    const recentLogs = battleLog.slice(-10);
    embed.addFields({
      name: '📜 Battle Log',
      value: recentLogs.join('\n'),
      inline: false
    });
    
    // Add winner information
    if (playerWon) {
      embed.addFields({
        name: '🏆 Winner',
        value: `**${interaction.user.username}**'s **${winnerCreature.name}** won the battle!`,
        inline: false
      });
      embed.addFields({
        name: '📈 Level Up!',
        value: `**${playerCreature.name}** is now level ${battlePlayer.level + 1}! (Stats unchanged - evolution system coming soon!)`,
        inline: true
      });
    } else {
      embed.addFields({
        name: '💀 Defeat',
        value: `**Trainer Bot**'s **${winnerCreature.name}** won the battle!\n**${playerCreature.name}** has been removed from your inventory.`,
        inline: false
      });
    }
    
    // Add creature stats
    embed.addFields(
      { name: '👤 Your Creature', value: `**${playerCreature.name}**\nHP: ${battlePlayer.stats.hp}/${playerCreature.stats.maxHp} | ATK: ${battlePlayer.stats.attack} | DEF: ${battlePlayer.stats.defense}`, inline: true },
      { name: '🤖 Bot Creature', value: `**${botCreature.name}**\nHP: ${battleBot.stats.hp}/${botCreature.stats.maxHp} | ATK: ${battleBot.stats.attack} | DEF: ${battleBot.stats.defense}`, inline: true }
    );
    
    // Get updated challenge status for remaining attempts display
    const updatedChallengeStatus = await storage.canUseChallenge(challengerId);
    embed.addFields({
      name: '⚔️ Daily Battles',
      value: `${3 - updatedChallengeStatus.remaining}/3 used`,
      inline: true
    });
    
    await interaction.update({
      content: '',
      embeds: [embed],
      components: []
    });
    
  } catch (error) {
    console.error('Error executing bot battle:', error);
    await interaction.editReply('❌ An error occurred during the bot battle!');
  }
}

// Catch command - 50% chance to catch a random E9 creature
export const catchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('catch')
    .setDescription('Attempt to catch a random E9 creature!'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check daily catch limit
    const catchStatus = await storage.canUseCatch(userId);
    if (!catchStatus.canUse) {
      const hours = Math.floor(catchStatus.timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((catchStatus.timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((catchStatus.timeUntilReset % (1000 * 60)) / 1000);
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Catch Limit Reached')
        .setDescription(`You've used all **10 catch attempts** for this 12-hour period!`)
        .addFields(
          { name: '⏳ Time Until Reset', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: '🔄 Reset Time', value: 'Every 12 hours', inline: true }
        )
        .setColor(0xff6b35)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    const creature = getRandomCreature();
    
    // Increment catch usage (regardless of success/failure)
    await storage.incrementCatchUsage(userId);
    
    // 50% base catch rate, modified by creature's individual catch rate
    const catchChance = Math.min(50, creature.catchRate);
    const success = Math.random() * 100 < catchChance;
    
    if (success) {
      const caughtCreature = storage.createCaughtCreature(creature.name, creature.rarity, creature.baseStats);
      const result = await storage.addCreature(userId, caughtCreature);
      
      if (result.success) {
        // Get updated catch status for remaining attempts display
        const updatedCatchStatus = await storage.canUseCatch(userId);
        
        const embed = new EmbedBuilder()
          .setTitle('🎉 Creature Caught!')
          .setDescription(`You successfully caught **${creature.name}**!`)
          .addFields(
            { name: 'Rarity', value: `${getRarityEmoji(creature.rarity)} ${creature.rarity.toUpperCase()}`, inline: true },
            { name: 'Level', value: '1', inline: true },
            { name: 'HP', value: creature.baseStats.hp.toString(), inline: true },
            { name: 'Attack', value: creature.baseStats.attack.toString(), inline: true },
            { name: 'Defense', value: creature.baseStats.defense.toString(), inline: true },
            { name: '🎣 12h Catches', value: `${10 - updatedCatchStatus.remaining}/10 used`, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        // User has 3 creatures, check if new creature is better tier
        const inventory = await storage.getUserInventory(userId);
        const isBetterTier = storage.isBetterTier(caughtCreature, inventory.creatures);
        
        console.log(`User ${userId} caught ${caughtCreature.name} (${caughtCreature.rarity}) - isBetterTier: ${isBetterTier}`);
        console.log(`Current creatures:`, inventory.creatures.map(c => `${c.name} (${c.rarity})`));
        
        if (isBetterTier) {
          // Store as pending and show replacement options with buttons
          await storage.setPendingCreature(userId, caughtCreature);
          const lowerTierCreatures = storage.getLowerTierCreatures(caughtCreature, inventory.creatures);
          
          console.log(`Lower tier creatures for replacement:`, lowerTierCreatures.map(c => `${c.name} (${c.rarity})`));
          
          const embed = new EmbedBuilder()
            .setTitle('🎉 Better Tier Creature Caught!')
            .setDescription(`You caught a **${creature.rarity.toUpperCase()}** tier creature but your inventory is full!`)
            .addFields(
              { name: 'New Creature', value: `${getRarityEmoji(creature.rarity)} **${creature.name}** (${creature.rarity.toUpperCase()})\nHP: ${creature.baseStats.hp} | ATK: ${creature.baseStats.attack} | DEF: ${creature.baseStats.defense}`, inline: false }
            )
            .setColor(0xffa500)
            .setTimestamp();
          
          // Show only lower tier creatures for replacement
          let creatureList = 'Lower tier creatures you can replace:\n';
          lowerTierCreatures.forEach((c, index) => {
            const originalIndex = inventory.creatures.findIndex(orig => orig.id === c.id) + 1;
            creatureList += `${originalIndex}. ${getRarityEmoji(c.rarity)} **${c.name}** (Lv.${c.level}) - HP: ${c.stats.hp}/${c.stats.maxHp} | ATK: ${c.stats.attack} | DEF: ${c.stats.defense}\n`;
          });
          
          embed.addFields({ name: 'Replaceable Creatures', value: creatureList, inline: false });
          embed.setFooter({ text: 'Choose to replace a lower tier creature or cancel' });
          
          // Create buttons for replacement options
          const row = new ActionRowBuilder<ButtonBuilder>();
          
          console.log(`Creating buttons for ${lowerTierCreatures.length} lower tier creatures`);
          
          // Add buttons for each lower tier creature (max 4 to leave room for cancel button)
          lowerTierCreatures.slice(0, 4).forEach((c, index) => {
            const originalIndex = inventory.creatures.findIndex(orig => orig.id === c.id) + 1;
            console.log(`Creating button for creature ${c.name} at index ${originalIndex}`);
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`replace_${originalIndex}`)
                .setLabel(`Replace #${originalIndex}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(getRarityEmoji(c.rarity))
            );
          });
          
          // Add cancel button
          row.addComponents(
            new ButtonBuilder()
              .setCustomId('cancel_replace')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
          );
          
          const response = await interaction.editReply({ embeds: [embed], components: [row] });
          
          // Handle button interactions
          try {
            const collector = response.createMessageComponentCollector({
              componentType: ComponentType.Button,
              time: 300000, // 5 minute timeout
              filter: (i) => i.user.id === userId
            });
            
            collector.on('collect', async (buttonInteraction) => {
              try {
                if (buttonInteraction.customId === 'cancel_replace') {
                  await storage.clearPendingCreature(userId);
                  await buttonInteraction.update({
                    content: '❌ Replacement cancelled. The creature was released.',
                    embeds: [],
                    components: []
                  });
                  return;
                }
              
              if (buttonInteraction.customId.startsWith('replace_')) {
                const creatureNumber = parseInt(buttonInteraction.customId.split('_')[1]);
                const creatureToReplace = inventory.creatures[creatureNumber - 1];
                
                if (creatureToReplace) {
                  const result = await storage.replaceCreature(userId, caughtCreature, creatureToReplace.id);
                  
                  if (result.success) {
                    await storage.clearPendingCreature(userId);
                    
                    const successEmbed = new EmbedBuilder()
                      .setTitle('🔄 Creature Replaced!')
                      .setDescription(`Successfully replaced **${creatureToReplace.name}** with **${caughtCreature.name}**!`)
                      .addFields(
                        { name: 'Removed', value: `${getRarityEmoji(creatureToReplace.rarity)} **${creatureToReplace.name}** (Lv.${creatureToReplace.level})`, inline: true },
                        { name: 'Added', value: `${getRarityEmoji(caughtCreature.rarity)} **${caughtCreature.name}** (Lv.${caughtCreature.level})`, inline: true }
                      )
                      .setColor(0x00ff00)
                      .setTimestamp();
                    
                    await buttonInteraction.update({
                      embeds: [successEmbed],
                      components: []
                    });
                  } else {
                    await buttonInteraction.update({
                      content: `❌ Failed to replace creature: ${result.message}`,
                      embeds: [],
                      components: []
                    });
                  }
                }
              }
              } catch (buttonError) {
                console.error('Error handling button interaction:', buttonError);
                try {
                  if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                    await buttonInteraction.reply({
                      content: '❌ An error occurred while processing your selection.',
                      ephemeral: true
                    });
                  }
                } catch (replyError) {
                  console.error('Error sending button error reply:', replyError);
                }
              }
            });
            
            collector.on('end', async (collected) => {
              if (collected.size === 0) {
                await storage.clearPendingCreature(userId);
                await interaction.followUp({
                  content: '⏰ Replacement timed out. The creature was released.',
                  ephemeral: true
                });
              }
            });
            
          } catch (error) {
            console.error('Error handling replacement buttons:', error);
          }
          
        } else {
          // New creature is not better tier, just show normal message
          const embed = new EmbedBuilder()
            .setTitle('🎉 Creature Caught!')
            .setDescription(`You caught **${creature.name}** but your inventory is full (3/3)!`)
            .addFields(
              { name: 'New Creature', value: `${getRarityEmoji(creature.rarity)} **${creature.name}** (${creature.rarity.toUpperCase()})\nHP: ${creature.baseStats.hp} | ATK: ${creature.baseStats.attack} | DEF: ${creature.baseStats.defense}`, inline: false },
              { name: 'Note', value: 'This creature is not better than your current ones, so it was released.', inline: false }
            )
            .setColor(0xffa500)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        }
      }
    } else {
      // Get updated catch status for remaining attempts display
      const updatedCatchStatus = await storage.canUseCatch(userId);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Catch Failed!')
        .setDescription(`The **${creature.name}** escaped! Try again!`)
        .addFields(
          { name: '🎣 Daily Catches', value: `${10 - updatedCatchStatus.remaining}/10 used`, inline: true }
        )
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }
};

// Inventory command - Show user's collection
export const inventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your E9 creature collection'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const inventory = await storage.getUserInventory(userId);
    
    if (inventory.creatures.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('📦 Your Inventory')
        .setDescription('You haven\'t caught any creatures yet! Use `/catch` to start your collection.')
        .setColor(0x0099ff)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Get current challenge, catch, and adventure status for usage display
    const challengeStatus = await storage.canUseChallenge(userId);
    const catchStatus = await storage.canUseCatch(userId);
    const adventureStatus = await storage.canUseAdventure(userId);
    
    const embed = new EmbedBuilder()
      .setTitle('📦 Your Inventory')
      .setDescription(`You have **${inventory.creatures.length}/3** creatures and **${inventory.adventureItems.length}** adventure items!`)
      .addFields(
        { name: '🎣 Daily Catches', value: `${10 - catchStatus.remaining}/10 used`, inline: true },
        { name: '⚔️ Daily Battles', value: `${3 - challengeStatus.remaining}/3 used`, inline: true },
        { name: '🗺️ Daily Adventures', value: `${10 - adventureStatus.remaining}/10 used`, inline: true }
      )
      .setColor(0x0099ff)
      .setTimestamp();
    
    // Show all creatures (max 3) with numbers
    if (inventory.creatures.length > 0) {
      let creaturesText = '';
      inventory.creatures.forEach((creature, index) => {
        const status = creature.stats.hp <= 0 ? '💀' : '❤️';
        const lockStatus = inventory.lockedCreatureId === creature.id ? ' 🔒' : '';
        creaturesText += `${index + 1}. ${getRarityEmoji(creature.rarity)} **${creature.name}**${lockStatus} (Lv.${creature.level})\n`;
        creaturesText += `   ${status} HP: ${creature.stats.hp}/${creature.stats.maxHp} | ⚔️ ATK: ${creature.stats.attack} | 🛡️ DEF: ${creature.stats.defense}\n\n`;
      });
      
      embed.addFields({
        name: '🐾 Your Creatures',
        value: creaturesText.trim(),
        inline: false
      });
    }
    
    // Show adventure items with numbers
    if (inventory.adventureItems.length > 0) {
      let itemsText = '';
      inventory.adventureItems.forEach((item, index) => {
        const quantityText = item.quantity > 1 ? ` (x${item.quantity})` : '';
        itemsText += `${index + 1}. ${item.emoji} **${item.name}**${quantityText} - ${item.description}\n`;
      });
      
      embed.addFields({
        name: '🎒 Adventure Items',
        value: itemsText.trim(),
        inline: false
      });
      
      embed.addFields({
        name: '💡 How to Use Items',
        value: `Use \`/use item_number creature_number\` to consume items on your creatures!\nExample: \`/use 1 2\` to use your first item on your second creature.\n💡 **Stacking:** Multiple items of the same type will stack together!`,
        inline: false
      });
    } else {
      embed.addFields({
        name: '🎒 Adventure Items',
        value: 'No adventure items yet. Use `/adventure` to find some!',
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  }
};

// Replace command - Replace a creature in your inventory
export const replaceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('replace')
    .setDescription('Legacy command - use buttons for replacement')
        .addIntegerOption(option =>
          option.setName('creature_number')
            .setDescription('The number of the creature to replace (1-3)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const creatureNumber = interaction.options.getInteger('creature_number', true);
    
    // Check if there's a pending creature
    const pendingCreature = await storage.getPendingCreature(userId);
    if (!pendingCreature) {
      await interaction.editReply('❌ No creature is waiting to be added. Use `/catch` first! When you catch a better tier creature, replacement options will appear automatically with buttons.');
      return;
    }
    
    const inventory = await storage.getUserInventory(userId);
    
    if (inventory.creatures.length === 0) {
      await interaction.editReply('❌ You don\'t have any creatures to replace!');
      return;
    }
    
    if (creatureNumber > inventory.creatures.length) {
      await interaction.editReply(`❌ You only have ${inventory.creatures.length} creatures!`);
      return;
    }
    
    const creatureToReplace = inventory.creatures[creatureNumber - 1];
    
    // Replace the creature
    const result = await storage.replaceCreature(userId, pendingCreature, creatureToReplace.id);
    
    if (result.success) {
      await storage.clearPendingCreature(userId);
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Creature Replaced!')
        .setDescription(`Successfully replaced **${creatureToReplace.name}** with **${pendingCreature.name}**!`)
        .addFields(
          { name: 'Removed', value: `${getRarityEmoji(creatureToReplace.rarity)} **${creatureToReplace.name}** (Lv.${creatureToReplace.level})`, inline: true },
          { name: 'Added', value: `${getRarityEmoji(pendingCreature.rarity)} **${pendingCreature.name}** (Lv.${pendingCreature.level})`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply(`❌ Failed to replace creature: ${result.message}`);
    }
  }
};

// Battle command - Challenge another user to battle
export const battleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Challenge another user to battle with your E9 creatures!')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('The user you want to challenge')
        .setRequired(true)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const challengerId = interaction.user.id;
    const opponent = interaction.options.getUser('opponent', true) as User;
    const opponentId = opponent.id;
    
    if (challengerId === opponentId) {
      await interaction.editReply('❌ You can\'t challenge yourself!');
      return;
    }
    
    // Check if the opponent is the bot itself
    const isBotBattle = opponentId === interaction.client.user?.id;
    
    // Check daily challenge limit for challenger
    const challengeStatus = await storage.canUseChallenge(challengerId);
    if (!challengeStatus.canUse) {
      // Clean up any existing challenges for this user since they can't battle
      await storage.cleanupExpiredChallenges();
      const challengerInBattle = await storage.isUserInActiveBattle(challengerId);
      if (challengerInBattle) {
        // Remove any active challenges for this user
        const activeChallenge = await storage.getActiveChallengeForUser(challengerId);
        if (activeChallenge) {
          const challengeId = await storage.getChallengeIdByUsers(activeChallenge.challengerId, activeChallenge.opponentId);
          if (challengeId) {
            await storage.deleteChallenge(challengeId);
          }
        }
      }
      
      const hours = Math.floor(challengeStatus.timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((challengeStatus.timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((challengeStatus.timeUntilReset % (1000 * 60)) / 1000);
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Daily Challenge Limit Reached')
        .setDescription(`You've used all **3 challenge attempts** for today!`)
        .addFields(
          { name: '⏳ Time Until Reset', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: '🔄 Reset Time', value: 'Every 12 hours', inline: true }
        )
        .setColor(0xff6b35)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check if challenger is already in an active battle
    const challengerInBattle = await storage.isUserInActiveBattle(challengerId);
    if (challengerInBattle) {
      await interaction.editReply('❌ You are already in an active battle! You can only have one battle at a time.');
      return;
    }
    
    // Check if opponent is already in an active battle (skip for bot battles)
    if (!isBotBattle) {
      const opponentInBattle = await storage.isUserInActiveBattle(opponentId);
      if (opponentInBattle) {
        await interaction.editReply(`❌ **${opponent.username}** is already in an active battle! They can only have one battle at a time. Please wait for their current battle to finish.`);
        return;
      }
    }
    
    // Get challenger's inventory
    const challengerInventory = await storage.getUserInventory(challengerId);
    
    // Check if challenger has creatures
    if (challengerInventory.creatures.length === 0) {
      await interaction.editReply('❌ You need at least one creature to battle! Use `/catch` to get some.');
      return;
    }
    
    // Check for alive creatures
    const challengerCreatures = challengerInventory.creatures.filter(c => c.stats.hp > 0);
    if (challengerCreatures.length === 0) {
      await interaction.editReply('❌ All your creatures are fainted! They need to rest.');
      return;
    }
    
    // Handle bot battle vs regular challenge
    if (isBotBattle) {
      // For bot battles, start immediately without creating a challenge
      await handleBotBattle(interaction, challengerId, challengerCreatures);
      return;
    }
    
    // Create challenge for regular battles
    const challengeResult = await storage.createChallenge(challengerId, opponentId);
    if (!challengeResult.success) {
      await interaction.editReply(`❌ ${challengeResult.message}`);
      return;
    }
    
    // Show creature selection for challenger with detailed creature info
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Choose Your Battle Creature')
      .setDescription(`You are challenging **${opponent.username}** to battle!\n\n**Your Available Creatures:**`)
      .setColor(0xff6b35)
      .setTimestamp();
    
    // Add detailed creature information to the embed
    challengerCreatures.forEach((creature, index) => {
      const status = creature.stats.hp <= 0 ? '💀' : '❤️';
      embed.addFields({
        name: `${index + 1}. ${getRarityEmoji(creature.rarity)} ${creature.name} (Lv.${creature.level})`,
        value: `${status} HP: ${creature.stats.hp}/${creature.stats.maxHp} | ⚔️ ATK: ${creature.stats.attack} | 🛡️ DEF: ${creature.stats.defense}`,
        inline: false
      });
    });
    
    embed.addFields({
      name: 'Selection',
      value: 'Click the button below to select your creature for battle!',
      inline: false
    });
    
    // Create creature selection buttons - show all creatures (max 3)
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    challengerCreatures.forEach((creature, index) => {
      const status = creature.stats.hp <= 0 ? '💀' : '❤️';
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`select_creature_${challengeResult.challengeId}_${creature.id}`)
          .setLabel(`${index + 1}. ${creature.name}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(getRarityEmoji(creature.rarity))
      );
    });
    
    // Add cancel button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`cancel_challenge_${challengeResult.challengeId}`)
        .setLabel('Cancel Challenge')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );
    
    const response = await interaction.editReply({ embeds: [embed], components: [row] });
    
    // Handle button interactions for creature selection
    try {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minute timeout
        filter: (i) => i.user.id === challengerId
      });
      
      collector.on('collect', async (buttonInteraction) => {
        try {
          if (buttonInteraction.customId.startsWith('cancel_challenge_')) {
            const challengeId = challengeResult.challengeId!;
            await storage.deleteChallenge(challengeId);
            
            // Clear the timeout to prevent false "CHALLENGE EXPIRED" messages
            if ((global as any).challengeTimeouts && (global as any).challengeTimeouts[challengeId]) {
              clearTimeout((global as any).challengeTimeouts[challengeId]);
              delete (global as any).challengeTimeouts[challengeId];
              console.log(`Cleared timeout for cancelled challenge: ${challengeId}`);
            }
            
            await buttonInteraction.update({
              content: '❌ Challenge cancelled.',
              embeds: [],
              components: []
            });
            return;
          }
          
          if (buttonInteraction.customId.startsWith('select_creature_')) {
            const parts = buttonInteraction.customId.split('_');
            const challengeId = parts[2];
            const creatureId = parts[3];
            
            // Update challenge with selected creature
            await storage.updateChallenge(challengeId, { 
              challengerCreatureId: creatureId,
              status: 'pending'
            });
            
            // Get the selected creature - refresh from database to avoid stale data
            const currentInventory = await storage.getUserInventory(challengerId);
            const selectedCreature = currentInventory.creatures.find(c => c.id === creatureId);
            if (!selectedCreature) {
              await buttonInteraction.update({
                content: '❌ Creature not found! This creature may have been removed or died. Please try again.',
                embeds: [],
                components: []
              });
              return;
            }
            
            // Check if creature is still alive
            if (selectedCreature.stats.hp <= 0) {
              await buttonInteraction.update({
                content: '❌ This creature has died and cannot be used in battle! Please select a different creature.',
                embeds: [],
                components: []
              });
              return;
            }
            
            // Get updated challenge status for remaining attempts display
            const updatedChallengeStatus = await storage.canUseChallenge(challengerId);
            
            // Create challenge notification embed with dark theme matching the image
            const challengeEmbed = new EmbedBuilder()
              .setTitle('⚔️ CHALLENGE ISSUED! ⚔️')
              .setDescription(`**${interaction.user.username}** has challenged <@${opponent.id}> to a battle!`)
              .addFields(
                { name: 'Challenger\'s Creature', value: `🟢 **${selectedCreature.name}** (Lv.${selectedCreature.level})\nHP: ${selectedCreature.stats.hp}/${selectedCreature.stats.maxHp} | ATK: ${selectedCreature.stats.attack} | DEF: ${selectedCreature.stats.defense}`, inline: false },
                { name: 'How to respond:', value: `<@${opponent.id}>, type \`/accept\` to accept or \`/decline\` to decline!`, inline: false },
                { name: 'Expires in:', value: '5 minutes', inline: false },
                { name: '⚔️ Daily Battles', value: `${3 - updatedChallengeStatus.remaining}/3 used`, inline: true }
              )
              .setColor(0x2c2c2c) // Dark grey color to match the image
              .setTimestamp()
              .setFooter({ text: 'Today at ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) });
            
            await buttonInteraction.update({
              content: '✅ Challenge sent!',
              embeds: [],
              components: []
            });
            
            // Send the challenge message as a new message to ensure proper tagging
            await interaction.followUp({
              content: `<@${opponent.id}>`,
              embeds: [challengeEmbed]
            });
            
            // Set up 1-minute timeout to auto-decline the challenge
            const timeoutId = setTimeout(async () => {
              try {
                // Check if challenge is still pending
                const currentChallenge = await storage.getChallenge(challengeId);
                if (currentChallenge && currentChallenge.status === 'pending') {
                  // Double-check the challenge status before deleting
                  const finalCheck = await storage.getChallenge(challengeId);
                  if (finalCheck && finalCheck.status === 'pending') {
                    // Delete the expired challenge completely from database
                    await storage.deleteChallenge(challengeId);
                    
                    // Notify in the channel that the challenge timed out
                    try {
                      await interaction.followUp({
                        content: `⏰ **CHALLENGE EXPIRED**\nThe challenge to <@${opponent.id}> has been automatically cancelled because they didn't respond within 5 minutes.`,
                        ephemeral: false
                      });
                    } catch (error) {
                      console.error('Failed to send timeout notification:', error);
                    }
                    
                    console.log(`Challenge ${challengeId} timed out - deleted from database`);
                  }
                }
              } catch (error) {
                console.error('Error handling challenge timeout:', error);
              }
            }, 300000); // 5 minutes = 300,000 milliseconds
            
            // Store the timeout ID so it can be cleared when challenge is completed
            (global as any).challengeTimeouts = (global as any).challengeTimeouts || {};
            (global as any).challengeTimeouts[challengeId] = timeoutId;
          }
        } catch (buttonError) {
          console.error('Error handling button interaction:', buttonError);
          try {
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
              await buttonInteraction.reply({
                content: '❌ An error occurred while processing your selection.',
                ephemeral: true
              });
            }
          } catch (replyError) {
            console.error('Error sending button error reply:', replyError);
          }
        }
      });
      
      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          // Delete the challenge completely instead of just marking as declined
          await storage.deleteChallenge(challengeResult.challengeId!);
          await interaction.followUp({
            content: '⏰ Challenge timed out.',
            ephemeral: true
          });
        }
      });
      
    } catch (error) {
      console.error('Error handling challenge buttons:', error);
    }
  }
};

// Reset inventory command - Admin only
export const resetInventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resetinventory')
    .setDescription('Reset your inventory (removes all creatures and stats)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    
    // Check if user is admin or has the specific role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const allowedRoleId = '1258533241158373457';
    const hasAdminRole = interaction.member && 'cache' in interaction.member.roles 
                        ? interaction.member.roles.cache.has(allowedRoleId) 
                        : false;
    const isAdmin = adminUserIds.includes(userId) || 
                   interaction.memberPermissions?.has('Administrator') || 
                   hasAdminRole;
    
    if (!isAdmin) {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    const result = await storage.resetUserInventory(userId);
    
    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle('🔄 Inventory Reset')
        .setDescription(result.message)
        .setColor(0x00ff00)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply(`❌ Failed to reset inventory: ${result.message}`);
    }
  }
};

// Accept command - Accept a battle challenge
export const acceptCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Accept a pending battle challenge'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check if user has a pending challenge
    const challenge = await storage.getPendingChallengeForUser(userId);
    if (!challenge) {
      await interaction.editReply('❌ You don\'t have any pending battle challenges!');
      return;
    }
    
    // Clear the original challenge creation timeout to prevent false "CHALLENGE EXPIRED" messages
    const challengeId = await storage.getChallengeIdByUsers(challenge.challengerId, challenge.opponentId);
    if (challengeId && (global as any).challengeTimeouts && (global as any).challengeTimeouts[challengeId]) {
      clearTimeout((global as any).challengeTimeouts[challengeId]);
      delete (global as any).challengeTimeouts[challengeId];
      console.log(`Cleared original challenge timeout when user accepted: ${challengeId}`);
    }
    
    // Check daily challenge limit for accepter
    const challengeStatus = await storage.canUseChallenge(userId);
    if (!challengeStatus.canUse) {
      // Clean up any existing challenges for this user since they can't battle
      await storage.cleanupExpiredChallenges();
      const userInBattle = await storage.isUserInActiveBattle(userId);
      if (userInBattle) {
        // Remove any active challenges for this user
        const activeChallenge = await storage.getActiveChallengeForUser(userId);
        if (activeChallenge) {
          const challengeId = await storage.getChallengeIdByUsers(activeChallenge.challengerId, activeChallenge.opponentId);
          if (challengeId) {
            await storage.deleteChallenge(challengeId);
          }
        }
      }
      
      const hours = Math.floor(challengeStatus.timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((challengeStatus.timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((challengeStatus.timeUntilReset % (1000 * 60)) / 1000);
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Daily Challenge Limit Reached')
        .setDescription(`You've used all **3 challenge attempts** for today!`)
        .addFields(
          { name: '⏳ Time Until Reset', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: '🔄 Reset Time', value: 'Every 12 hours', inline: true }
        )
        .setColor(0xff6b35)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check if user is the opponent (not the challenger)
    if (challenge.challengerId === userId) {
      await interaction.editReply('❌ You cannot accept your own challenge!');
      return;
    }
    
    // Get opponent's inventory
    const opponentInventory = await storage.getUserInventory(userId);
    
    // Check if opponent has creatures
    if (opponentInventory.creatures.length === 0) {
      await interaction.editReply('❌ You need at least one creature to battle! Use `/catch` to get some.');
      return;
    }
    
    // Check for alive creatures
    const opponentCreatures = opponentInventory.creatures.filter(c => c.stats.hp > 0);
    if (opponentCreatures.length === 0) {
      await interaction.editReply('❌ All your creatures are fainted! They need to rest.');
      return;
    }
    
    // Get updated challenge status for remaining attempts display
    const updatedChallengeStatus = await storage.canUseChallenge(userId);
    
    // Show creature selection for opponent with detailed creature info
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Choose Your Battle Creature')
      .setDescription(`You are accepting a battle challenge!\n⏰ **You have 5 minutes to respond or the challenge will be automatically declined.**\n\n**Your Available Creatures:**`)
      .addFields(
        { name: '⚔️ Daily Battles', value: `${3 - updatedChallengeStatus.remaining}/3 used`, inline: true }
      )
      .setColor(0x00ff00)
      .setTimestamp();
    
    // Add detailed creature information to the embed
    opponentCreatures.forEach((creature, index) => {
      const status = creature.stats.hp <= 0 ? '💀' : '❤️';
      embed.addFields({
        name: `${index + 1}. ${getRarityEmoji(creature.rarity)} ${creature.name} (Lv.${creature.level})`,
        value: `${status} HP: ${creature.stats.hp}/${creature.stats.maxHp} | ⚔️ ATK: ${creature.stats.attack} | 🛡️ DEF: ${creature.stats.defense}`,
        inline: false
      });
    });
    
    embed.addFields({
      name: 'Selection',
      value: 'Click the button below to select your creature for battle!',
      inline: false
    });
    
    // Create creature selection buttons - show all creatures (max 3)
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    opponentCreatures.forEach((creature, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_creature_${challenge.challengerId}_${challenge.opponentId}_${creature.id}`)
          .setLabel(`${index + 1}. ${creature.name}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(getRarityEmoji(creature.rarity))
      );
    });
    
    // Add decline button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`decline_creature_${challenge.challengerId}_${challenge.opponentId}`)
        .setLabel('Decline Challenge')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );
    
    const response = await interaction.editReply({ embeds: [embed], components: [row] });
    
    // Set up 1-minute timeout to auto-decline the challenge
    const timeoutId = setTimeout(async () => {
      try {
        // Check if challenge is still pending (user hasn't selected a creature yet)
        const currentChallenge = await storage.getPendingChallengeForUser(userId);
        if (currentChallenge && currentChallenge.status === 'pending') {
          // Find the challenge ID and delete it
          const challengeId = await storage.getChallengeIdByUsers(currentChallenge.challengerId, currentChallenge.opponentId);
          
          if (challengeId) {
            // Double-check the challenge status before deleting
            const finalCheck = await storage.getChallenge(challengeId);
            if (finalCheck && finalCheck.status === 'pending') {
              await storage.deleteChallenge(challengeId);
              
              // Notify the user that the challenge timed out
              try {
                await interaction.followUp({
                  content: `⏰ **Time's up!** The challenge has been automatically declined because you didn't respond within 5 minutes.`,
                  ephemeral: true
                });
              } catch (error) {
                console.error('Failed to send timeout notification:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling creature selection timeout:', error);
      }
    }, 300000); // 5 minutes = 300,000 milliseconds
    
    // Handle button interactions for creature selection
    try {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minute timeout
        filter: (i) => i.user.id === userId
      });
      
      collector.on('collect', async (buttonInteraction) => {
        try {
          if (buttonInteraction.customId.startsWith('decline_creature_')) {
            // Clear the timeout since user is declining
            clearTimeout(timeoutId);
            
            // Find the challenge ID for this user
            const activeChallenge = await storage.getActiveChallengeForUser(userId);
            if (activeChallenge) {
              const challengeId = await storage.getChallengeIdByUsers(activeChallenge.challengerId, activeChallenge.opponentId);
              
              if (challengeId) {
                await storage.deleteChallenge(challengeId);
              }
            }
            
            await buttonInteraction.update({
              content: '❌ Challenge declined.',
              embeds: [],
              components: []
            });
            return;
          }
          
          if (buttonInteraction.customId.startsWith('accept_creature_')) {
            // Clear the timeout since user is accepting
            clearTimeout(timeoutId);
            
            const parts = buttonInteraction.customId.split('_');
            const challengerId = parts[2];
            const opponentId = parts[3];
            const creatureId = parts[4];
            
            // Get the selected creature - refresh from database to avoid stale data
            const currentInventory = await storage.getUserInventory(userId);
            const selectedCreature = currentInventory.creatures.find(c => c.id === creatureId);
            if (!selectedCreature) {
              // Clear the timeout since user responded (even if creature not found)
              clearTimeout(timeoutId);
              await buttonInteraction.update({
                content: '❌ Creature not found! This creature may have been removed or died. Please try again.',
                embeds: [],
                components: []
              });
              return;
            }
            
            // Check if creature is still alive
            if (selectedCreature.stats.hp <= 0) {
              clearTimeout(timeoutId);
              await buttonInteraction.update({
                content: '❌ This creature has died and cannot be used in battle! Please select a different creature.',
                embeds: [],
                components: []
              });
              return;
            }
            
            // Find the challenge ID
            const challengeId = await storage.getChallengeIdByUsers(challengerId, opponentId);
            
            if (challengeId) {
              // Validate that the challenger's creature still exists before accepting
              const challengerInventory = await storage.getUserInventory(challengerId);
              const challenge = await storage.getChallenge(challengeId);
              
              if (!challenge || !challenge.challengerCreatureId) {
                clearTimeout(timeoutId);
                await storage.deleteChallenge(challengeId);
                await buttonInteraction.update({
                  content: '❌ Challenge data is invalid! The challenge has been cancelled.',
                  embeds: [],
                  components: []
                });
                return;
              }
              
              const challengerCreature = challengerInventory.creatures.find(c => c.id === challenge.challengerCreatureId);
              if (!challengerCreature) {
                clearTimeout(timeoutId);
                await storage.deleteChallenge(challengeId);
                await buttonInteraction.update({
                  content: '❌ The challenger\'s creature is no longer available! The challenge has been cancelled.',
                  embeds: [],
                  components: []
                });
                return;
              }
              
              if (challengerCreature.stats.hp <= 0) {
                clearTimeout(timeoutId);
                await storage.deleteChallenge(challengeId);
                await buttonInteraction.update({
                  content: '❌ The challenger\'s creature has died! The challenge has been cancelled.',
                  embeds: [],
                  components: []
                });
                return;
              }
              
              await storage.updateChallenge(challengeId, { 
                opponentCreatureId: creatureId,
                status: 'accepted'
              });
              
              // Increment both challenger's and accepter's challenge usage
              await storage.incrementChallengeUsage(challengerId);
              await storage.incrementChallengeUsage(opponentId);
              
              // Start the battle automatically
              await executeBattle(interaction, challengeId, challengerId, opponentId, selectedCreature);
            }
          }
        } catch (buttonError) {
          console.error('Error handling button interaction:', buttonError);
          try {
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
              await buttonInteraction.reply({
                content: '❌ An error occurred while processing your selection.',
                ephemeral: true
              });
            }
          } catch (replyError) {
            console.error('Error sending button error reply:', replyError);
          }
        }
      });
      
      collector.on('end', async (collected) => {
        // Clear the timeout since collector ended
        clearTimeout(timeoutId);
        
        if (collected.size === 0) {
          // The timeout handler will handle the automatic decline
          // No need to do anything here since timeout will auto-decline
        }
      });
      
    } catch (error) {
      console.error('Error handling accept buttons:', error);
    }
  }
};

// Decline command - Decline a battle challenge
export const declineCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('decline')
    .setDescription('Decline a pending battle challenge'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check if user has a pending challenge
    const challenge = await storage.getPendingChallengeForUser(userId);
    if (!challenge) {
      await interaction.editReply('❌ You don\'t have any pending battle challenges!');
      return;
    }
    
    // Check if user is the opponent (not the challenger)
    if (challenge.challengerId === userId) {
      await interaction.editReply('❌ You cannot decline your own challenge!');
      return;
    }
    
    // Find the challenge ID and delete it
    const challengeId = await storage.getChallengeIdByUsers(challenge.challengerId, challenge.opponentId);
    
    if (challengeId) {
      await storage.deleteChallenge(challengeId);
      
      // Clear the timeout to prevent false "CHALLENGE EXPIRED" messages
      if ((global as any).challengeTimeouts && (global as any).challengeTimeouts[challengeId]) {
        clearTimeout((global as any).challengeTimeouts[challengeId]);
        delete (global as any).challengeTimeouts[challengeId];
        console.log(`Cleared timeout for declined challenge: ${challengeId}`);
      }
      
      await interaction.editReply('❌ Challenge declined. The challenger has been notified.');
    } else {
      await interaction.editReply('❌ Challenge not found!');
    }
  }
};

// Battle execution function
async function executeBattle(interaction: ChatInputCommandInteraction, challengeId: string, challengerId: string, opponentId: string, opponentCreature: CaughtCreature) {
  try {
    // Get Discord user objects for usernames
    const challengerUser = await interaction.client.users.fetch(challengerId);
    const opponentUser = await interaction.client.users.fetch(opponentId);
    
    // Get both users' inventories
    const challengerInventory = await storage.getUserInventory(challengerId);
    const opponentInventory = await storage.getUserInventory(opponentId);
    
    // Get the challenger's selected creature
    const challenge = await storage.getChallenge(challengeId);
    if (!challenge || !challenge.challengerCreatureId) {
      await interaction.editReply('❌ Challenge data not found!');
      return;
    }
    
    // Check if challenger still has alive creatures
    const challengerAliveCreatures = challengerInventory.creatures.filter(c => c.stats.hp > 0);
    if (challengerAliveCreatures.length === 0) {
      // Challenger has no alive creatures
      await storage.deleteChallenge(challengeId);
      await interaction.editReply('❌ The challenger has no alive creatures! The challenge has been cancelled.');
      return;
    }
    
    const challengerCreature = challengerInventory.creatures.find(c => c.id === challenge.challengerCreatureId);
    if (!challengerCreature) {
      // Challenger's creature no longer exists (died, removed, etc.)
      // Delete the challenge and notify the opponent
      await storage.deleteChallenge(challengeId);
      await interaction.editReply('❌ The challenger\'s creature is no longer available! The challenge has been cancelled.');
      return;
    }
    
    // Check if the selected creature is still alive
    if (challengerCreature.stats.hp <= 0) {
      // The selected creature is dead
      await storage.deleteChallenge(challengeId);
      await interaction.editReply('❌ The challenger\'s selected creature has died! The challenge has been cancelled.');
      return;
    }
    
    // Create copies for battle (so we don't modify the originals)
    const battleChallenger = { ...challengerCreature, stats: { ...challengerCreature.stats } };
    const battleOpponent = { ...opponentCreature, stats: { ...opponentCreature.stats } };
    
    // Battle simulation
    const battleLog: string[] = [];
    let round = 1;
    const maxRounds = 20; // Prevent infinite battles
    
    battleLog.push(`🎯 **Battle Start!**`);
    battleLog.push(`**${challengerCreature.name}** (Lv.${battleChallenger.level}) vs **${opponentCreature.name}** (Lv.${battleOpponent.level})`);
    
    while (battleChallenger.stats.hp > 0 && battleOpponent.stats.hp > 0 && round <= maxRounds) {
      // Challenger attacks first
      const challengerDamage = Math.max(1, battleChallenger.stats.attack - Math.floor(battleOpponent.stats.defense / 2) + Math.floor(Math.random() * 10) - 5);
      battleOpponent.stats.hp = Math.max(0, battleOpponent.stats.hp - challengerDamage);
      
      battleLog.push(`Round ${round}: **${battleChallenger.name}** attacks for ${challengerDamage} damage! **${battleOpponent.name}** has ${battleOpponent.stats.hp} HP left.`);
      
      if (battleOpponent.stats.hp <= 0) break;
      
      // Opponent attacks
      const opponentDamage = Math.max(1, battleOpponent.stats.attack - Math.floor(battleChallenger.stats.defense / 2) + Math.floor(Math.random() * 10) - 5);
      battleChallenger.stats.hp = Math.max(0, battleChallenger.stats.hp - opponentDamage);
      
      battleLog.push(`Round ${round}: **${battleOpponent.name}** attacks for ${opponentDamage} damage! **${battleChallenger.name}** has ${battleChallenger.stats.hp} HP left.`);
      
      round++;
    }
    
    // Determine winner
    const challengerWon = battleChallenger.stats.hp > 0;
    const winnerCreature = challengerWon ? battleChallenger : battleOpponent;
    const loserCreature = challengerWon ? battleOpponent : battleChallenger;
    
    // Update battle stats
    await storage.incrementBattles(challengerId);
    await storage.incrementBattles(opponentId);
    
    if (challengerWon) {
      await storage.incrementWins(challengerId);
    } else {
      await storage.incrementWins(opponentId);
    }
    
    // Handle creature death - remove dead creature from inventory
    let deadCreature = null;
    if (loserCreature.stats.hp <= 0) {
      const loserId = challengerWon ? opponentId : challengerId;
      deadCreature = await storage.removeDeadCreature(loserId, loserCreature.id);
    }
    
    // Level up winner's creature
    const leveledUpCreature = storage.levelUpCreature(winnerCreature);
    const winnerId = challengerWon ? challengerId : opponentId;
    await storage.updateCreature(winnerId, winnerCreature.id, leveledUpCreature);
    
    // Mark challenge as completed
    await storage.updateChallenge(challengeId, { status: 'completed' });
    
    // Clear the timeout to prevent false "CHALLENGE EXPIRED" messages
    if ((global as any).challengeTimeouts && (global as any).challengeTimeouts[challengeId]) {
      clearTimeout((global as any).challengeTimeouts[challengeId]);
      delete (global as any).challengeTimeouts[challengeId];
      console.log(`Cleared timeout for completed challenge: ${challengeId}`);
    }
    
    // Get updated challenge status for both users
    const challengerChallengeStatus = await storage.canUseChallenge(challengerId);
    const opponentChallengeStatus = await storage.canUseChallenge(opponentId);
    
    // Create battle result embed
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Battle Result')
      .setDescription(battleLog.join('\n'))
      .addFields(
        { name: '🏆 Winner', value: `**${winnerCreature.name}**`, inline: true },
        { name: '📈 Level Up!', value: `**${winnerCreature.name}** is now level ${leveledUpCreature.level}! (Stats unchanged - evolution system coming soon!)`, inline: true },
        { name: '💀 Defeated', value: `**${loserCreature.name}** fainted`, inline: true },
        { name: '⚔️ Daily Battles', value: `${3 - challengerChallengeStatus.remaining}/3 used`, inline: true }
      )
      .setColor(challengerWon ? 0x00ff00 : 0xff0000)
      .setTimestamp();
    
    // Add death message if creature died
    if (deadCreature) {
      const loserUsername = challengerWon ? opponentUser.username : challengerUser.username;
      embed.addFields({ 
        name: '💀 Creature Has Died', 
        value: `**${deadCreature.name}** has been removed from **${loserUsername}'s** inventory!`, 
        inline: false 
      });
    }
    
    await interaction.editReply({ embeds: [embed], components: [] });
    
  } catch (error) {
    console.error('Error executing battle:', error);
    await interaction.editReply('❌ An error occurred during the battle!');
  }
}

// Reset all command - Admin only, can reset any user's inventory
export const resetAllCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resetall')
    .setDescription('Reset a specific user\'s inventory (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose inventory you want to reset')
        .setRequired(true)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const adminUserId = interaction.user.id;
    const targetUser = interaction.options.getUser('user', true);
    const targetUserId = targetUser.id;
    
    // Check if user is admin or has the specific role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const allowedRoleId = '1258533241158373457';
    const hasAdminRole = interaction.member && 'cache' in interaction.member.roles 
                        ? interaction.member.roles.cache.has(allowedRoleId) 
                        : false;
    const isAdmin = adminUserIds.includes(adminUserId) || 
                   interaction.memberPermissions?.has('Administrator') || 
                   hasAdminRole;
    
    if (!isAdmin) {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    // Get target user's current inventory to show what was reset
    const targetInventory = await storage.getUserInventory(targetUserId);
    const creatureCount = targetInventory.creatures.length;
    
    const result = await storage.resetUserInventory(targetUserId);
    
    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle('🔄 Inventory Reset (Admin)')
        .setDescription(`Successfully reset **${targetUser.username}'s** inventory!`)
        .addFields(
          { name: 'Target User', value: `${targetUser.username} (${targetUser.id})`, inline: true },
          { name: 'Creatures Removed', value: creatureCount.toString(), inline: true },
          { name: 'Reset By', value: `${interaction.user.username}`, inline: true }
        )
        .setColor(0xff6b35)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      // Notify the target user that their inventory was reset
      try {
        await targetUser.send({
          content: `🔄 **Your inventory has been reset by an administrator.**\nAll creatures and stats have been cleared.`,
          embeds: [embed]
        });
      } catch (error) {
        console.error('Failed to notify target user of inventory reset:', error);
      }
    } else {
      await interaction.editReply(`❌ Failed to reset inventory: ${result.message}`);
    }
  }
};

// Clear challenges command - Admin only, clears all pending challenges
export const clearChallengesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('clearchallenges')
    .setDescription('Clear all pending challenges (Admin only)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    
    // Check if user is admin or has the specific role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const allowedRoleId = '1258533241158373457';
    const hasAdminRole = interaction.member && 'cache' in interaction.member.roles 
                        ? interaction.member.roles.cache.has(allowedRoleId) 
                        : false;
    const isAdmin = adminUserIds.includes(userId) || 
                   interaction.memberPermissions?.has('Administrator') || 
                   hasAdminRole;
    
    if (!isAdmin) {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    // Clear all challenges
    const result = await storage.clearAllChallenges();
    
    const embed = new EmbedBuilder()
      .setTitle('🧹 Challenges Cleared')
      .setDescription(result.message)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
};

// Help command - Show game mechanics and available commands
export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn about the E9 Trainer game mechanics and available commands'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const embed = new EmbedBuilder()
      .setTitle('🎮 E9 Trainer Bot - Help Guide')
      .setDescription('Catch, battle, and collect E9 creatures! Build your collection and challenge other trainers.')
      .setColor(0x00ff00)
      .setTimestamp()
      .addFields(
        {
          name: '🎮 Core Commands',
          value: '• `/catch` - Catch random E9 creatures (50% success rate)\n• `/inventory` - View your creatures and items\n• `/battle @user` - Challenge another trainer\n• `/accept` - Accept a battle challenge\n• `/decline` - Decline a battle challenge\n• `/adventure` - Find items (risky!)\n• `/use` - Use adventure items on creatures\n• `/lock` - Lock a creature to protect it from adventure\n• `/gyminventory` - View your gym badges',
          inline: false
        },
        {
          name: '📊 Creature Rarities',
          value: '⚪ **Common** (60% catch) - Basic stats\n🟢 **Uncommon** (40% catch) - Better stats\n🔵 **Rare** (25% catch) - High stats\n🟣 **Epic** (15% catch) - Very high stats\n🟡 **Legendary** (5% catch) - Max stats\n🔴 **Mythical** - Superior stats',
          inline: false
        },
        {
          name: '⚔️ Battle System',
          value: '• **Turn-based combat** with strategic creature selection\n• **Permanent death** - Creatures at 0 HP are removed forever\n• **Level up rewards** - Winners gain experience\n• **Interactive selection** - Choose creatures with buttons\n• **Challenge errors** - If you see "creature no longer available", use `/accept` again',
          inline: false
        },
        {
          name: '🎣 Catching System',
          value: '• **Inventory limit**: Maximum 3 creatures\n• **Smart replacement**: Better tier creatures trigger replacement options\n• **5-minute timeout** for replacement choices\n• **Rarity affects catch rate** - rarer = harder to catch',
          inline: false
        },
        {
          name: '🗺️ Adventure System',
          value: '• **Risk vs Reward** - Find powerful items\n• **Item Types**: Weapons (attack), Armor (defense), Food (health)\n• **15% drop rate** for items\n• **20% risk** of losing a creature\n• **1-minute cooldown** between adventures\n• **Lock Protection** - Locked creatures never flee during adventure',
          inline: false
        },
        {
          name: '🔒 Lock System',
          value: '• **Protect Creatures** - Lock 1 creature to prevent it from fleeing during adventure\n• **Visual Indicator** - Locked creatures show 🔒 in inventory\n• **Flexible** - Change which creature is locked anytime with `/lock`\n• **Adventure Requirements** - Need 2+ creatures if you have a locked one\n• **Battle Safe** - Locked creatures can still participate in battles',
          inline: false
        },
        {
          name: '👹 Boss & Gym Battles',
          value: '• **Boss battles** - Attack powerful bosses for rewards\n• **Gym battles** - 3-round battles with special bosses\n• **Mythical rewards** for defeating bosses\n• **Creature risk** - Your creatures can die in battle',
          inline: false
        },
        {
          name: '💡 Pro Tips',
          value: '• Keep your strongest creatures in inventory\n• Only battle when creatures are healthy\n• Adventure only when you can afford to lose a creature\n• Higher rarity = stronger but harder to catch',
          inline: false
        }
      )
      .setFooter({ 
        text: 'E9 Trainer Bot • Use /help anytime for this guide' 
      });
    
    await interaction.editReply({ embeds: [embed] });
  }
};

// Shutdown command - Admin only, gracefully shuts down the bot
export const shutdownCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('Gracefully shutdown the bot (Admin only)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    
    // Check if user is admin or has the specific role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const allowedRoleId = '1258533241158373457';
    const hasAdminRole = interaction.member && 'cache' in interaction.member.roles 
                        ? interaction.member.roles.cache.has(allowedRoleId) 
                        : false;
    const isAdmin = adminUserIds.includes(userId) || 
                   interaction.memberPermissions?.has('Administrator') || 
                   hasAdminRole;
    
    if (!isAdmin) {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🛑 Bot Shutdown Initiated')
      .setDescription('The E9 Trainer Bot is shutting down gracefully...')
      .addFields(
        { name: 'Shutdown By', value: `${interaction.user.username}`, inline: true },
        { name: 'Time', value: new Date().toLocaleString(), inline: true },
        { name: 'Status', value: 'Shutting down...', inline: true }
      )
      .setColor(0xff6b35)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Log the shutdown
    console.log(`🛑 Bot shutdown initiated by ${interaction.user.username} (${userId})`);
    
    // Give a moment for the reply to be sent, then shutdown
    setTimeout(() => {
      console.log('🛑 Gracefully shutting down E9 Trainer Bot...');
      process.exit(0);
    }, 2000);
  }
};

// Adventure command - Go on an adventure to find items with risks
export const adventureCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('adventure')
    .setDescription('Go on an adventure to find items! Risk losing a creature but gain powerful items.'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // Check daily adventure limit
    const adventureLimitStatus = await storage.canUseAdventure(userId);
    if (!adventureLimitStatus.canUse) {
      const hours = Math.floor(adventureLimitStatus.timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((adventureLimitStatus.timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((adventureLimitStatus.timeUntilReset % (1000 * 60)) / 1000);
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Adventure Limit Reached')
        .setDescription(`You've used all **10 adventure attempts** for this 12-hour period!`)
        .addFields(
          { name: '⏳ Time Until Reset', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: '🔄 Reset Time', value: 'Every 12 hours', inline: true }
        )
        .setColor(0xff6b35)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check if user can go on adventure (cooldown check)
    const adventureStatus = await storage.canGoAdventure(userId);
    if (!adventureStatus.canAdventure) {
      // Ensure timeRemaining is a valid number
      const timeRemaining = Math.ceil((adventureStatus.timeRemaining || 0) / 1000);
      const validTimeRemaining = isNaN(timeRemaining) ? 0 : Math.max(0, timeRemaining);
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Adventure Cooldown')
        .setDescription(`You're exhausted from your last adventure! Please wait **${validTimeRemaining} seconds** before going on another adventure.`)
        .setColor(0xff6b35)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check if user has creatures
    const inventory = await storage.getUserInventory(userId);
    if (inventory.creatures.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Creatures')
        .setDescription('You need at least one creature to go on an adventure! Use `/catch` to get some creatures first.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check minimum creature requirement based on lock status
    const hasLockedCreature = inventory.lockedCreatureId !== undefined;
    const availableCreatures = inventory.creatures.filter(c => c.id !== inventory.lockedCreatureId);
    
    if (hasLockedCreature && availableCreatures.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Need More Creatures')
        .setDescription('You have a locked creature but need at least one other creature to go on adventure! Use `/catch` to get more creatures.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Update last adventure time (set cooldown) and increment daily usage
    await storage.updateLastAdventureTime(userId);
    await storage.incrementAdventureUsage(userId);
    
    // Try to get a random adventure item (15% chance)
    const adventureItem = getRandomAdventureItem();
    
    // 20% chance to lose a creature (regardless of item success)
    const loseCreature = Math.random() * 100 < 20;
    let lostCreature: CaughtCreature | null = null;
    
    if (loseCreature) {
      // Only remove from available creatures (not locked ones)
      if (availableCreatures.length > 0) {
        lostCreature = await storage.removeRandomCreature(userId, inventory.lockedCreatureId);
      }
    }
    
    // Create result embed
    const embed = new EmbedBuilder()
      .setTitle('🗺️ Adventure Complete!')
      .setColor(0x9B59B6)
      .setTimestamp();
    
    let description = `**${username}** has returned from their adventure!\n\n`;
    
    if (adventureItem) {
      // User found an item
      description += `🎉 **Lucky Find!** You discovered a **${adventureItem.emoji} ${adventureItem.name}**!\n`;
      description += `📝 *${adventureItem.description}*\n\n`;
      
      // Add item to inventory
      await storage.addAdventureItem(userId, adventureItem);
      
      // Show which creature can use the item
      const aliveCreatures = inventory.creatures.filter(c => c.stats.hp > 0);
      if (aliveCreatures.length > 0) {
        description += `💡 **Tip:** Use this item on one of your creatures to boost their stats!\n`;
        description += `Available creatures: ${aliveCreatures.map(c => `**${c.name}**`).join(', ')}\n\n`;
      }
    } else {
      // No item found
      description += `😔 **No items found** this time. The adventure was uneventful.\n\n`;
    }
    
    if (lostCreature) {
      // Creature was lost
      description += `💔 **Bad News:** Your **${getRarityEmoji(lostCreature.rarity)} ${lostCreature.name}** ran away during the adventure!\n`;
      description += `They were scared by the dangers and decided to leave your team.\n\n`;
    } else {
      // No creature lost
      description += `✅ **Good News:** All your creatures made it back safely!\n\n`;
    }
    
    description += `⏰ **Cooldown:** You're now exhausted and must wait **1 minute** before your next adventure.`;
    
    // Get updated adventure status for remaining attempts display
    const updatedAdventureStatus = await storage.canUseAdventure(userId);
    
    embed.setDescription(description);
    embed.addFields(
        { name: '🗺️ 12h Adventures', value: `${10 - updatedAdventureStatus.remaining}/10 used`, inline: true }
    );
    
    // Add fields for current inventory status
    const currentInventory = await storage.getUserInventory(userId);
    embed.addFields(
      {
        name: '📦 Current Creatures',
        value: currentInventory.creatures.length > 0 
          ? currentInventory.creatures.map(c => `${getRarityEmoji(c.rarity)} **${c.name}** (Lv.${c.level})`).join('\n')
          : 'No creatures remaining',
        inline: true
      },
      {
        name: '🎒 Adventure Items',
        value: currentInventory.adventureItems.length > 0
          ? currentInventory.adventureItems.map(item => {
              const quantityText = item.quantity > 1 ? ` (x${item.quantity})` : '';
              return `${item.emoji} **${item.name}**${quantityText}`;
            }).join('\n')
          : 'No items yet',
        inline: true
      }
    );
    
    await interaction.editReply({ embeds: [embed] });
  }
};

// Use command - Consume adventure items on creatures
export const useCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an adventure item on one of your creatures to boost their stats!')
    .addIntegerOption(option =>
      option.setName('item_number')
        .setDescription('The number of the item to use (from your inventory)')
        .setRequired(true)
        .setMinValue(1))
    .addIntegerOption(option =>
      option.setName('creature_number')
        .setDescription('The number of the creature to use the item on (1-3)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(3)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const itemNumber = interaction.options.getInteger('item_number', true);
    const creatureNumber = interaction.options.getInteger('creature_number', true);
    
    // Get user inventory
    const inventory = await storage.getUserInventory(userId);
    
    // Check if user has any adventure items
    if (inventory.adventureItems.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Items Available')
        .setDescription('You don\'t have any adventure items to use! Go on an adventure with `/adventure` to find some items.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check if user has any creatures
    if (inventory.creatures.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Creatures')
        .setDescription('You don\'t have any creatures to use items on! Use `/catch` to get some creatures first.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Validate item number
    if (itemNumber > inventory.adventureItems.length) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Item Number')
        .setDescription(`You only have ${inventory.adventureItems.length} adventure item(s). Please choose a number between 1 and ${inventory.adventureItems.length}.`)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Validate creature number
    if (creatureNumber > inventory.creatures.length) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Creature Number')
        .setDescription(`You only have ${inventory.creatures.length} creature(s). Please choose a number between 1 and ${inventory.creatures.length}.`)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Get the item and creature
    const item = inventory.adventureItems[itemNumber - 1];
    const creature = inventory.creatures[creatureNumber - 1];
    
    // Consume the item
    const result = await storage.consumeAdventureItem(userId, itemNumber - 1, creature.id);
    
    if (result.success && result.item && result.creature) {
      const embed = new EmbedBuilder()
        .setTitle('✅ Item Used Successfully!')
        .setDescription(`**${username}** used ${result.item.emoji} **${result.item.name}** on ${getRarityEmoji(result.creature.rarity)} **${result.creature.name}**!`)
        .setColor(0x00ff00)
        .setTimestamp();
      
      // Show stat changes
      let statChange = '';
      switch (result.item.type) {
        case 'weapon':
          statChange = `⚔️ **Attack increased by ${result.item.statBonus}** (now ${result.creature.stats.attack})`;
          break;
        case 'armor':
          statChange = `🛡️ **Defense increased by ${result.item.statBonus}** (now ${result.creature.stats.defense})`;
          break;
        case 'food':
          if (result.actualHealing && result.actualHealing > 0) {
            const oldHp = result.creature.stats.hp - result.actualHealing;
            statChange = `🍯 **Health restored by ${result.actualHealing}** (was ${oldHp}, now ${result.creature.stats.hp})`;
          } else {
            statChange = `🍯 **No healing needed** - creature already at full health (${result.creature.stats.hp}/${result.creature.stats.maxHp})`;
          }
          break;
      }
      
      embed.addFields(
        {
          name: '📈 Stat Boost',
          value: statChange,
          inline: false
        },
        {
          name: '📝 Item Description',
          value: result.item.description,
          inline: false
        }
      );
      
      // Show updated creature stats
      embed.addFields({
        name: '📊 Updated Creature Stats',
        value: `**${result.creature.name}** (Lv.${result.creature.level})\n❤️ HP: ${result.creature.stats.hp}/${result.creature.stats.maxHp} | ⚔️ ATK: ${result.creature.stats.attack} | 🛡️ DEF: ${result.creature.stats.defense}`,
        inline: false
      });
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('❌ Failed to Use Item')
        .setDescription(result.message)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }
};

// Spawn command - Admin only, spawns a rare boss creature
export const spawnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('spawn')
    .setDescription('Spawn a rare boss creature for everyone to battle! (Admin only)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check if user is one of the specific admins
    const allowedAdminIds = ['410662767981232128', '906769656184987668'];
    if (!allowedAdminIds.includes(userId)) {
      await interaction.editReply('❌ This command is only available to specific administrators.');
      return;
    }
    
    // Create a random boss
    const boss = createRandomBoss(userId);
    
    // Try to spawn the boss
    const result = await storage.spawnBoss(boss);
    
    if (!result.success) {
      await interaction.editReply(`❌ ${result.message}`);
      return;
    }
    
    // Get spawner's attack status for personalized display
    const spawnerAttackStatus = await storage.canUserAttackBoss(userId);
    
    // Create boss spawn announcement embed
    const embed = new EmbedBuilder()
      .setTitle('👹 RARE BOSS SPAWNED! 👹')
      .setDescription(`**${boss.name}** has appeared! Everyone can attack it to defeat the boss!`)
      .addFields(
        { name: '👹 Boss Name', value: boss.name, inline: true },
        { name: '❤️ HP', value: `${boss.baseStats.hp}/${boss.baseStats.maxHp}`, inline: true },
        { name: '⚔️ Attack', value: boss.baseStats.attack.toString(), inline: true },
        { name: '🛡️ Defense', value: boss.baseStats.defense.toString(), inline: true },
        { name: '🎯 Your Attacks Left', value: storage.formatAttackRemaining(spawnerAttackStatus.remaining), inline: true },
        { name: '⏰ Attack Cooldown', value: '30 seconds between attacks', inline: true },
        { name: '🏆 Reward', value: 'First to defeat gets Mythical tier guardian!', inline: true }
      )
      .setColor(0xff0000)
      .setTimestamp()
      .setImage(boss.imageUrl || null);
    
    // Create attack button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`attack_boss_${boss.id}`)
          .setLabel('⚔️ Attack Boss')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👹')
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`refresh_boss_${boss.id}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );
    
    const response = await interaction.editReply({ 
      content: `<@&1303873807253241946> A rare boss has appeared!`, 
      embeds: [embed], 
      components: [row] 
    });
    
    // Set up button interaction collector for boss attacks
    setupBossButtonCollector(response, boss.id);
  }
};

// Boss status command - Check current boss status
export const bossStatusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('bossstatus')
    .setDescription('Check the current boss status and your attack availability (Admin only)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check if user is admin
    if (userId !== '410662767981232128') {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    const activeBoss = await storage.getActiveBoss();
    
    if (!activeBoss) {
      const embed = new EmbedBuilder()
        .setTitle('👹 Boss Status')
        .setDescription('No boss is currently active. Wait for an admin to spawn one!')
        .setColor(0x666666)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check user's attack availability
    const attackStatus = await storage.canUserAttackBoss(userId);
    
    const embed = new EmbedBuilder()
      .setTitle('👹 Boss Status')
      .setDescription(`**${activeBoss.name}** is currently active!`)
      .addFields(
        { name: '👹 Boss Name', value: activeBoss.name, inline: true },
        { name: '❤️ HP', value: `${activeBoss.baseStats.hp}/${activeBoss.baseStats.maxHp}`, inline: true },
        { name: '⚔️ Attack', value: activeBoss.baseStats.attack.toString(), inline: true },
        { name: '🛡️ Defense', value: activeBoss.baseStats.defense.toString(), inline: true },
        { name: '🎯 Your Attacks Left', value: storage.formatAttackRemaining(attackStatus.remaining), inline: true },
        { name: '⏰ Cooldown', value: attackStatus.cooldownRemaining > 0 ? `${Math.ceil(attackStatus.cooldownRemaining / 1000)}s` : 'Ready!', inline: true }
      )
      .setColor(0xff0000)
      .setTimestamp()
      .setImage(activeBoss.imageUrl || null);
    
    if (attackStatus.canAttack) {
      embed.addFields({
        name: '⚔️ Attack Boss',
        value: 'Use the attack button in the boss spawn message to attack!',
        inline: false
      });
    } else if (attackStatus.remaining === 0) {
      // Check if user has no creatures
      const userInventory = await storage.getUserInventory(userId);
      const aliveCreatures = userInventory.creatures.filter(c => c.stats.hp > 0);
      if (aliveCreatures.length === 0) {
        embed.addFields({
          name: '❌ No Creatures Available',
          value: 'You have no alive creatures in your inventory! Catch some creatures first.',
          inline: false
        });
      } else {
        embed.addFields({
          name: '⏰ Daily Limit Reached',
          value: 'You have used all 3 daily attacks. Reset at midnight UTC.',
          inline: false
        });
      }
    } else {
      embed.addFields({
        name: '⏰ Cooldown Active',
        value: `Wait ${Math.ceil(attackStatus.cooldownRemaining / 1000)} seconds before attacking again.`,
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  }
};

// Helper function to set up boss button collector
function setupBossButtonCollector(response: any, bossId: string) {
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 0, // No timeout - keep collecting until boss is defeated
    filter: (i: any) => i.customId.startsWith('attack_boss_') || i.customId.startsWith('refresh_boss_')
  });
  
  collector.on('collect', async (buttonInteraction: any) => {
    try {
      if (buttonInteraction.customId.startsWith('refresh_boss_')) {
        // Refresh the boss status
        await handleBossRefresh(buttonInteraction, bossId);
      } else if (buttonInteraction.customId.startsWith('attack_boss_')) {
        // Handle boss attack
        await handleBossAttack(buttonInteraction, bossId);
      }
    } catch (error) {
      console.error('Error handling boss button interaction:', error);
      try {
        if (!buttonInteraction.replied && !buttonInteraction.deferred) {
          await buttonInteraction.reply({
            content: '❌ An error occurred while processing your action.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending button error reply:', replyError);
      }
    }
  });
}

// Helper function to handle boss refresh
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
  
  const row = new ActionRowBuilder<ButtonBuilder>()
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

// Helper function to handle boss attack
async function handleBossAttack(interaction: any, bossId: string) {
  await interaction.deferReply({ ephemeral: true });
  
  const userId = interaction.user.id;
  const activeBoss = await storage.getActiveBoss();
  
  if (!activeBoss || activeBoss.id !== bossId) {
    await interaction.editReply('❌ Boss no longer exists or has been defeated!');
    return;
  }
  
  // Check if user can attack
  const attackStatus = await storage.canUserAttackBoss(userId);
  
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
    await interaction.editReply('❌ You need at least one creature to attack the boss! Use `/catch` to get some.');
    return;
  }
  
  // Check for alive creatures
  const aliveCreatures = inventory.creatures.filter(c => c.stats.hp > 0);
  if (aliveCreatures.length === 0) {
    await interaction.editReply('❌ All your creatures are fainted! They need to rest.');
    return;
  }
  
  // Show creature selection for boss attack
  const embed = new EmbedBuilder()
    .setTitle('⚔️ Choose Your Attack Creature')
    .setDescription(`You are attacking **${activeBoss.name}**!\n\n**Your Available Creatures:**`)
    .setColor(0xff6b35)
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
    value: 'Click the button below to select your creature for the boss attack!',
    inline: false
  });
  
  // Create creature selection buttons
  const row = new ActionRowBuilder<ButtonBuilder>();
  
  // Add timestamp to button IDs to make them expire
  const buttonTimestamp = Date.now();
  
  aliveCreatures.forEach((creature, index) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`boss_attack_creature_${bossId}_${creature.id}_${buttonTimestamp}`)
        .setLabel(`${index + 1}. ${creature.name}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(getRarityEmoji(creature.rarity))
    );
  });
  
  const response = await interaction.editReply({ embeds: [embed], components: [row] });
  
  // Handle creature selection for boss attack
  try {
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 minute timeout
      filter: (i: any) => i.user.id === userId && i.customId.startsWith('boss_attack_creature_')
    });
    
    collector.on('collect', async (buttonInteraction: any) => {
      try {
        // Extract creature ID and timestamp from button custom ID
        // Format: boss_attack_creature_${bossId}_${creatureId}_${timestamp}
        const customId = buttonInteraction.customId;
        const parts = customId.split('_');
        const creatureId = parts[parts.length - 2];
        const buttonTimestamp = parseInt(parts[parts.length - 1]);
        
        // Check if button is expired (older than 2 minutes)
        const currentTime = Date.now();
        if (currentTime - buttonTimestamp > 120000) { // 2 minutes
          await buttonInteraction.update({
            content: '❌ This creature selection has expired! Please click "⚔️ Attack Boss" again to get fresh options.',
            embeds: [],
            components: []
          });
          return;
        }
        
        // Get the selected creature - refresh from database to avoid stale data
        const currentInventory = await storage.getUserInventory(userId);
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
        
        // Execute boss battle
        await executeBossBattle(buttonInteraction, activeBoss, selectedCreature, userId);
        
      } catch (buttonError) {
        console.error('Error handling boss creature selection:', buttonError);
        try {
          if (!buttonInteraction.replied && !buttonInteraction.deferred) {
            await buttonInteraction.reply({
              content: '❌ An error occurred while processing your selection.',
              ephemeral: true
            });
          }
        } catch (replyError) {
          console.error('Error sending button error reply:', replyError);
        }
      }
    });
    
    collector.on('end', async (collected: any) => {
      if (collected.size === 0) {
        await interaction.followUp({
          content: '⏰ Boss attack selection timed out.',
          ephemeral: true
        });
      }
    });
    
  } catch (error) {
    console.error('Error handling boss attack buttons:', error);
  }
}

// Helper function to execute boss battle
async function executeBossBattle(interaction: any, boss: any, creature: CaughtCreature, userId: string) {
  try {
    // Defer the interaction first since we're in a collector
    await interaction.deferUpdate();
    
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

// Reset daily catch command - Admin only, resets daily catch count for a specific user
export const resetDailyCatchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resetdailycatch')
    .setDescription('Reset daily catch count for a specific user (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose daily catch count you want to reset')
        .setRequired(true)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const adminUserId = interaction.user.id;
    const targetUser = interaction.options.getUser('user', true);
    const targetUserId = targetUser.id;
    
    // Check if user is admin or has the specific role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const allowedRoleId = '1258533241158373457';
    const hasAdminRole = interaction.member && 'cache' in interaction.member.roles 
                        ? interaction.member.roles.cache.has(allowedRoleId) 
                        : false;
    const isAdmin = adminUserIds.includes(adminUserId) || 
                   interaction.memberPermissions?.has('Administrator') || 
                   hasAdminRole;
    
    if (!isAdmin) {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    // Reset the daily catch count using the storage method
    const result = await storage.resetDailyCatchCount(targetUserId);
    
    if (!result.success) {
      await interaction.editReply(`❌ Failed to reset daily catch count: ${result.message}`);
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🔄 Daily Catch Reset (Admin)')
      .setDescription(`Successfully reset daily catch count for **${targetUser.username}**!`)
      .addFields(
        { name: 'Target User', value: `${targetUser.username} (${targetUser.id})`, inline: true },
        { name: 'Reset By', value: `${interaction.user.username}`, inline: true },
        { name: 'New Catch Count', value: '0/10', inline: true }
      )
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Notify the target user that their daily catch was reset
    try {
      await targetUser.send({
        content: `🔄 **Your daily catch count has been reset by an administrator.**\nYou now have 10/10 catch attempts available for today.`,
        embeds: [embed]
      });
    } catch (error) {
      console.error('Failed to notify target user of daily catch reset:', error);
    }
  }
};

// Refresh boss command - Display current boss UI
export const refreshBossCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('refreshboss')
    .setDescription('Display the current boss UI to bring it back to the top of chat'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const activeBoss = await storage.getActiveBoss();
    
    if (!activeBoss) {
      const embed = new EmbedBuilder()
        .setTitle('👹 Boss Status')
        .setDescription('No boss is currently active. Wait for an admin to spawn one!')
        .setColor(0x666666)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check user's attack availability
    const attackStatus = await storage.canUserAttackBoss(userId);
    
    // Create the boss embed with updated HP (same as the spawn command)
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
    
    // Create attack and refresh buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`attack_boss_${activeBoss.id}`)
          .setLabel('⚔️ Attack Boss')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👹')
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`refresh_boss_${activeBoss.id}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );
    
    const response = await interaction.editReply({ 
      content: `Boss status refreshed!`, 
      embeds: [embed], 
      components: [row] 
    });
    
    // Set up button interaction collector for boss attacks (same as spawn command)
    setupBossButtonCollector(response, activeBoss.id);
  }
};

// Gym command - Admin only, starts a gym battle
export const gymCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('gym')
    .setDescription('Start a gym battle with 3 rounds of bosses! (Admin only)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check if user is one of the specific admins
    const allowedAdminIds = ['410662767981232128', '906769656184987668'];
    if (!allowedAdminIds.includes(userId)) {
      await interaction.editReply('❌ This command is only available to specific administrators.');
      return;
    }
    
    // Start gym battle
    const result = await storage.startGymBattle(userId);
    
    if (!result.success) {
      await interaction.editReply(`❌ ${result.message}`);
      return;
    }
    
    const gym = result.gym!;
    const currentBoss = gym.rounds[0].boss;
    
    // Get admin's attack status for personalized display
    const adminAttackStatus = await storage.canUserAttackGymBoss(userId);
    
    // Create gym battle announcement embed
    const embed = new EmbedBuilder()
      .setTitle('🏟️ CHAPTA SUMMON! 🏟️')
      .setDescription(`**Gym Battle** has begun! Defeat all 3 bosses within 48 hours to earn Boss Badges!`)
      .addFields(
        { name: '🏟️ Round', value: `${gym.currentRound}/3`, inline: true },
        { name: '👹 Current Boss', value: currentBoss.name, inline: true },
        { name: '❤️ HP', value: `${currentBoss.baseStats.hp}/${currentBoss.baseStats.maxHp}`, inline: true },
        { name: '⚔️ Attack', value: currentBoss.baseStats.attack.toString(), inline: true },
        { name: '🛡️ Defense', value: currentBoss.baseStats.defense.toString(), inline: true },
        { name: '🎯 Your Attacks Left', value: `${adminAttackStatus.remaining}/3`, inline: true },
        { name: '⏰ Attack Cooldown', value: '30 seconds between attacks', inline: true },
        { name: '🏆 Reward', value: 'All participants get Boss Badge if completed!', inline: true },
        { name: '⏳ Time Limit', value: '48 hours to complete all 3 rounds', inline: true }
      )
      .setColor(0x9b59b6)
      .setTimestamp()
      .setImage(currentBoss.imageUrl);
    
    // Create attack and refresh buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`attack_gym_${gym.id}_${gym.currentRound}`)
          .setLabel('⚔️ Attack Boss')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👹')
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`refresh_gym_${gym.id}_${gym.currentRound}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );
    
    const response = await interaction.editReply({ 
      content: `<@&1303873807253241946> A gym battle has started!`, 
      embeds: [embed], 
      components: [row] 
    });
    
    // Set up button interaction collector for gym attacks
    setupGymButtonCollector(response, gym.id, gym.currentRound);
  }
};

// Gym inventory command - Check user's gym badges
export const gymInventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('gyminventory')
    .setDescription('Check your gym badges and gym-related items'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // Get user's gym inventory
    const gymBadges = await storage.getUserGymInventory(userId);
    
    if (gymBadges.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🏟️ Gym Inventory')
        .setDescription(`**${username}**'s gym inventory is empty.`)
        .addFields({
          name: '💡 How to get badges',
          value: 'Participate in gym battles and help defeat all 3 bosses within 48 hours to earn Boss Badges!',
          inline: false
        })
        .setColor(0x9b59b6)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Create gym inventory embed
    const embed = new EmbedBuilder()
      .setTitle('🏟️ Gym Inventory')
      .setDescription(`**${username}**'s gym badges and items:`)
      .setColor(0x9b59b6)
      .setTimestamp();
    
    // Group badges by type
    const badgeGroups: { [key: string]: any[] } = {};
    gymBadges.forEach(badge => {
      if (!badgeGroups[badge.name]) {
        badgeGroups[badge.name] = [];
      }
      badgeGroups[badge.name].push(badge);
    });
    
    // Add badge information
    Object.entries(badgeGroups).forEach(([badgeName, badges]) => {
      const badge = badges[0]; // Use first badge for info
      const count = badges.length;
      
      embed.addFields({
        name: `${badge.emoji} ${badgeName}${count > 1 ? ` (x${count})` : ''}`,
        value: `${badge.description}\n*Earned: ${badge.earnedAt instanceof Date ? badge.earnedAt.toLocaleDateString() : new Date(badge.earnedAt).toLocaleDateString()}*`,
        inline: true
      });
    });
    
    embed.addFields({
      name: '📊 Total Badges',
      value: gymBadges.length.toString(),
      inline: true
    });
    
    await interaction.editReply({ embeds: [embed] });
  }
};

// Gym refresh command - Refresh gym UI
export const gymRefreshCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('gymrefresh')
    .setDescription('Display the current gym UI to bring it back to the top of chat (Admin only)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    // Check if user is admin
    if (userId !== '410662767981232128') {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    const activeGym = await storage.getActiveGym();
    
    if (!activeGym) {
      const embed = new EmbedBuilder()
        .setTitle('🏟️ Gym Status')
        .setDescription('No gym battle is currently active. Wait for an admin to start one!')
        .setColor(0x666666)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Check if gym has expired
    const expirationCheck = await storage.checkGymExpiration();
    if (expirationCheck.expired) {
      const embed = new EmbedBuilder()
        .setTitle('🏟️ Gym Battle Expired')
        .setDescription(expirationCheck.message!)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Get current round boss
    const currentBossData = await storage.getCurrentGymBoss();
    if (!currentBossData) {
      await interaction.editReply('❌ Error: Could not find current gym boss.');
      return;
    }
    
    const { boss: currentBoss, round: currentRound } = currentBossData;
    
    // Check user's attack availability
    const attackStatus = await storage.canUserAttackGymBoss(userId);
    
    // Calculate time remaining
    const timeRemaining = activeGym.endTime - Date.now();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    // Create the gym embed with updated HP
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
    
    // Create attack and refresh buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`attack_gym_${activeGym.id}_${currentRound}`)
          .setLabel('⚔️ Attack Boss')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👹')
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`refresh_gym_${activeGym.id}_${currentRound}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );
    
    const response = await interaction.editReply({ 
      content: `Gym status refreshed!`, 
      embeds: [embed], 
      components: [row] 
    });
    
    // Set up button interaction collector for gym attacks
    setupGymButtonCollector(response, activeGym.id, currentRound);
  }
};

// Helper function to set up gym button collector
function setupGymButtonCollector(response: any, gymId: string, roundNumber: number) {
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 0, // No timeout - keep collecting until gym is completed
    filter: (i: any) => i.customId.startsWith('attack_gym_') || i.customId.startsWith('refresh_gym_')
  });
  
  collector.on('collect', async (buttonInteraction: any) => {
    try {
      if (buttonInteraction.customId.startsWith('refresh_gym_')) {
        // Refresh the gym status
        await handleGymRefresh(buttonInteraction, gymId, roundNumber);
      } else if (buttonInteraction.customId.startsWith('attack_gym_')) {
        // Handle gym attack
        await handleGymAttack(buttonInteraction, gymId, roundNumber);
      }
    } catch (error) {
      console.error('Error handling gym button interaction:', error);
      try {
        if (!buttonInteraction.replied && !buttonInteraction.deferred) {
          await buttonInteraction.reply({
            content: '❌ An error occurred while processing your action.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending gym button error reply:', replyError);
      }
    }
  });
}

// Helper function to handle gym refresh
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
  
  // Get current round boss
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
  
  const row = new ActionRowBuilder<ButtonBuilder>()
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

// Helper function to handle gym attack
async function handleGymAttack(interaction: any, gymId: string, roundNumber: number) {
  await interaction.deferReply({ ephemeral: true });
  
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
  const row = new ActionRowBuilder<ButtonBuilder>();
  
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
          const matchingCreature = currentInventory.creatures.find(c => c.id.startsWith(shortCreatureId));
          if (!matchingCreature) {
            await buttonInteraction.update({
              content: '❌ Creature not found! This creature may have been removed or died.',
              embeds: [],
              components: []
            });
            return;
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

// Helper function to execute gym battle
async function executeGymBattle(interaction: any, boss: any, creature: CaughtCreature, userId: string, gymId: string, roundNumber: number) {
  try {
    // Note: Interaction is already handled by the collector, no need to defer
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
    
    // Get the actual current round from the database (not from button)
    const activeGym = await storage.getActiveGym();
    const actualCurrentRound = activeGym ? activeGym.currentRound : roundNumber;
    
    // Update gym boss HP in database using the actual current round
    await storage.updateGymBossHp(actualCurrentRound, battleBoss.baseStats.hp);
    
    // Record the gym battle attack using the actual current round
    await storage.recordGymBattleAttack(userId, actualCurrentRound, creature.id, creatureDamage, creatureDied);
    
    // Remove dead creature if it died
    if (creatureDied) {
      await storage.removeDeadCreatureFromBossBattle(userId, creature.id);
    }
    
    // Create detailed battle result embed
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
    
    // First, show the battle result
    await interaction.update({ embeds: [embed], components: [] });
    
    // Then check if boss was defeated and handle round progression
    if (battleBoss.baseStats.hp <= 0) {
      // Boss defeated! Complete the round
      const roundResult = await storage.completeGymRound();
      
      if (roundResult.success) {
        if (roundResult.nextRound) {
          // Get the actual current round from the database (the round that was just completed)
          const activeGym = await storage.getActiveGym();
          const completedRound = activeGym ? activeGym.currentRound - 1 : roundNumber;
          const nextRound = activeGym ? activeGym.currentRound : roundNumber + 1;
          
          // Next round started - send as a follow-up message
          const roundCompleteEmbed = new EmbedBuilder()
            .setTitle('🏆 ROUND COMPLETED! 🏆')
            .setDescription(`**${interaction.user.username}** has defeated **${boss.name}** in Round ${completedRound}! Starting Round ${nextRound}...`)
            .setColor(0xffd700)
            .addFields({
              name: '🎉 Round Progress',
              value: `Round ${completedRound}/3 completed! Moving to Round ${nextRound}/3`,
              inline: false
            });
          
          // Announce round completion to everyone (send as a new message)
          await interaction.followUp({
            content: `<@&1303873807253241946> **ROUND ${completedRound} COMPLETED!**`,
            embeds: [roundCompleteEmbed]
          });
          
          return;
        } else {
          // Gym completed successfully - send as a follow-up message
          const gymCompleteEmbed = new EmbedBuilder()
            .setTitle('🏆 GYM BATTLE COMPLETED! 🏆')
            .setDescription(`**${interaction.user.username}** has defeated the final boss! All participants received Boss Badges!`)
            .setColor(0xffd700)
            .addFields({
              name: '🎁 Rewards',
              value: 'All participants have received Boss Badges! Check your `/gyminventory` to see them.',
              inline: false
            });
          
          // Announce gym completion to everyone (send as a new message)
          await interaction.followUp({
            content: `<@&1303873807253241946> **GYM BATTLE COMPLETED!**`,
            embeds: [gymCompleteEmbed]
          });
          
          return;
        }
      }
    }
    
  } catch (error) {
    console.error('Error executing gym battle:', error);
    await interaction.update({ content: '❌ An error occurred during the gym battle!', embeds: [], components: [] });
  }
}

// Reset badge command - Admin only, resets gym badges for a specific user
export const resetBadgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resetbadge')
    .setDescription('Reset gym badges for a specific user (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose gym badges you want to reset')
        .setRequired(true)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const adminUserId = interaction.user.id;
    const targetUser = interaction.options.getUser('user', true);
    const targetUserId = targetUser.id;
    
    // Check if user is admin or has the specific role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const allowedRoleId = '1258533241158373457';
    const hasAdminRole = interaction.member && 'cache' in interaction.member.roles 
                        ? interaction.member.roles.cache.has(allowedRoleId) 
                        : false;
    const isAdmin = adminUserIds.includes(adminUserId) || 
                   interaction.memberPermissions?.has('Administrator') || 
                   hasAdminRole;
    
    if (!isAdmin) {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    // Reset the gym badges using the storage method
    const result = await storage.resetGymBadges(targetUserId);
    
    if (!result.success) {
      await interaction.editReply(`❌ Failed to reset gym badges: ${result.message}`);
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🏆 Gym Badges Reset (Admin)')
      .setDescription(`Successfully reset gym badges for **${targetUser.username}**!`)
      .addFields(
        { name: 'Target User', value: `${targetUser.username} (${targetUser.id})`, inline: true },
        { name: 'Reset By', value: `${interaction.user.username}`, inline: true },
        { name: 'Badges Removed', value: result.badgesRemoved.toString(), inline: true }
      )
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Notify the target user that their gym badges were reset
    try {
      await targetUser.send({
        content: `🏆 **Your gym badges have been reset by an administrator.**\nYou now have 0 gym badges.`,
        embeds: [embed]
      });
    } catch (error) {
      console.error('Failed to notify target user of gym badge reset:', error);
    }
  }
};


// Give badge command - Admin only, gives badges to users with specified role
export const giveBadgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('givebadge')
    .setDescription('Give badges to all users with the specified role (Admin only)')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to give badges to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('badge_name')
        .setDescription('The name of the badge to give')
        .setRequired(true)
        .addChoices(
          { name: 'Boss Badge', value: 'Boss Badge' },
          { name: 'Gym Champion', value: 'Gym Champion' },
          { name: 'Elite Trainer', value: 'Elite Trainer' }
        )) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    const role = interaction.options.getRole('role', true);
    const badgeName = interaction.options.getString('badge_name', true);
    
    // Check if user is admin
    if (userId !== '410662767981232128') {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    try {
      const guild = interaction.guild;
      
      if (!guild) {
        await interaction.editReply('❌ This command can only be used in a server.');
        return;
      }
      
      // Get all members with the role
      const membersWithRole = guild.members.cache.filter(member => member.roles.cache.has(role.id)).map(member => member.user);
      
      if (membersWithRole.length === 0) {
        await interaction.editReply('❌ No users found with this role.');
        return;
      }
      
      const totalUsers = membersWithRole.length;
      const batchSize = 15; // Process 15 users at a time
      const delayBetweenBatches = 2000; // 2 seconds delay between batches
      
      let successCount = 0;
      let errorCount = 0;
      let processedCount = 0;
      
      // Show initial progress
      const initialEmbed = new EmbedBuilder()
        .setTitle('🏆 Badge Distribution Started!')
        .setDescription(`Starting to give **${badgeName}** to **${totalUsers}** users with role **${role.name}**...`)
        .addFields(
          { name: '👥 Total Users', value: `${totalUsers}`, inline: true },
          { name: '🏆 Badge', value: badgeName, inline: true },
          { name: '📊 Progress', value: `0/${totalUsers} (0%)`, inline: true }
        )
        .setColor(0xffd700)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [initialEmbed] });
      
      // Process users in batches
      for (let i = 0; i < membersWithRole.length; i += batchSize) {
        const batch = membersWithRole.slice(i, i + batchSize);
        
        // Process current batch
        for (const user of batch) {
          try {
            // Get user's inventory
            const userInventory = await storage.getUserInventory(user.id);
            
            // Ensure gymBadges array exists
            if (!userInventory.gymBadges) {
              userInventory.gymBadges = [];
            }
            
            // Create badge (allow stacking - no duplicate check)
            const badge = {
              id: `role_${Date.now()}_${user.id}_${Math.random().toString(36).substr(2, 9)}`,
              name: badgeName,
              emoji: '🏆',
              description: `Awarded to role members`,
              earnedAt: new Date(),
              gymId: 'role_award'
            };
            
            // Add badge to user's inventory (always add, no duplicate check)
            userInventory.gymBadges.push(badge);
            
            // Save to database
            await storage.saveUserInventory(user.id, userInventory);
            successCount++;
          } catch (error) {
            console.error(`Error giving badge to user ${user.id}:`, error);
            errorCount++;
          }
          
          processedCount++;
        }
        
        // Update progress after each batch
        const progressEmbed = new EmbedBuilder()
          .setTitle('🏆 Badge Distribution in Progress...')
          .setDescription(`Giving **${badgeName}** to users with role **${role.name}**...`)
          .addFields(
            { name: '👥 Total Users', value: `${totalUsers}`, inline: true },
            { name: '🏆 Badge', value: badgeName, inline: true },
            { name: '📊 Progress', value: `${processedCount}/${totalUsers} (${Math.round((processedCount / totalUsers) * 100)}%)`, inline: true },
            { name: '✅ Success', value: `${successCount}`, inline: true },
            { name: '❌ Errors', value: `${errorCount}`, inline: true }
          )
          .setColor(0xffd700)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [progressEmbed] });
        
        // Add delay between batches (except for the last batch)
        if (i + batchSize < membersWithRole.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🏆 Badges Awarded!')
        .setDescription(`Successfully awarded **${badgeName}** to users with role **${role.name}**!`)
        .addFields(
          { name: '👥 Role', value: `${role.name} (${role.id})`, inline: true },
          { name: '🏆 Badge', value: badgeName, inline: true },
          { name: '✅ Badges Given', value: `${successCount} users`, inline: true },
          { name: '❌ Errors', value: `${errorCount} users`, inline: true },
          { name: '📅 Awarded', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0xffd700)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error giving badges:', error);
      await interaction.editReply('❌ An error occurred while giving badges.');
    }
  }
};

// Reset gym inventory command - Admin only, resets gym badges but keeps highest stat creatures
export const resetGymInventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resetgyminventory')
    .setDescription('Reset gym inventory (badges) while keeping highest stat creatures (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to reset gym inventory for')
        .setRequired(true)) as SlashCommandBuilder,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('user', true);
    
    // Check if user is admin
    if (userId !== '410662767981232128') {
      await interaction.editReply('❌ This command is only available to administrators.');
      return;
    }
    
    try {
      // Get user's current inventory
      const userInventory = await storage.getUserInventory(targetUser.id);
      
      // Find the highest stat creature
      let highestStatCreature = null;
      let highestTotalStats = 0;
      
      if (userInventory.creatures && userInventory.creatures.length > 0) {
        for (const creature of userInventory.creatures) {
          const totalStats = creature.stats.hp + creature.stats.attack + creature.stats.defense;
          if (totalStats > highestTotalStats) {
            highestTotalStats = totalStats;
            highestStatCreature = creature;
          }
        }
      }
      
      // Reset gym badges
      const oldBadgeCount = userInventory.gymBadges ? userInventory.gymBadges.length : 0;
      userInventory.gymBadges = [];
      
      // Keep only the highest stat creature
      if (highestStatCreature) {
        userInventory.creatures = [highestStatCreature];
      } else {
        userInventory.creatures = [];
      }
      
      // Save to database
      await storage.saveUserInventory(targetUser.id, userInventory);
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Gym Inventory Reset!')
        .setDescription(`Successfully reset **${targetUser.username}**'s gym inventory!`)
        .addFields(
          { name: '👤 User', value: `${targetUser.username} (${targetUser.id})`, inline: true },
          { name: '🏆 Badges Removed', value: `${oldBadgeCount} badges`, inline: true },
          { name: '🐉 Creatures Kept', value: highestStatCreature ? `1 (${highestStatCreature.name})` : '0', inline: true }
        );
      
      if (highestStatCreature) {
        embed.addFields({
          name: '🏆 Highest Stat Creature',
          value: `**${highestStatCreature.name}**\nHP: ${highestStatCreature.stats.hp} | ATK: ${highestStatCreature.stats.attack} | DEF: ${highestStatCreature.stats.defense}\nTotal: ${highestTotalStats}`,
          inline: false
        });
      }
      
      embed.setColor(0xff6b6b)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error resetting gym inventory:', error);
      await interaction.editReply('❌ An error occurred while resetting gym inventory.');
    }
  }
};

// Lock command - Lock a creature to protect it from adventure
export const lockCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a creature to protect it from adventure (only 1 creature can be locked)'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const inventory = await storage.getUserInventory(userId);
    
    if (!inventory || inventory.creatures.length === 0) {
      await interaction.editReply('❌ You don\'t have any creatures to lock!');
      return;
    }
    
    // Create creature selection buttons
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    inventory.creatures.forEach((creature, index) => {
      const isLocked = inventory.lockedCreatureId === creature.id;
      const status = creature.stats.hp <= 0 ? '💀' : '❤️';
      const lockStatus = isLocked ? '🔒' : '';
      
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`lock_creature_${creature.id}`)
          .setLabel(`${index + 1}. ${creature.name} ${lockStatus}`)
          .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Primary)
          .setEmoji(isLocked ? '🔒' : getRarityEmoji(creature.rarity))
      );
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔒 Lock Creature')
      .setDescription('Select a creature to lock. Locked creatures are protected from adventure but can still participate in battles.')
      .addFields(
        { name: '🔒 Locked Creature', value: inventory.lockedCreatureId ? 
          inventory.creatures.find(c => c.id === inventory.lockedCreatureId)?.name || 'None' : 'None', inline: true },
        { name: '💡 Tip', value: 'Locked creatures never flee during adventure!', inline: true }
      )
      .setColor(0x00ff00)
      .setTimestamp();
    
    const response = await interaction.editReply({ embeds: [embed], components: [row] });
    
    // Set up button interaction collector
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute
    });
    
    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== userId) {
        await buttonInteraction.reply({ content: '❌ This is not your lock selection!', ephemeral: true });
        return;
      }
      
      const creatureId = buttonInteraction.customId.split('_')[2];
      const selectedCreature = inventory.creatures.find(c => c.id === creatureId);
      
      if (!selectedCreature) {
        await buttonInteraction.update({ content: '❌ Creature not found!', embeds: [], components: [] });
        return;
      }
      
      // Check if creature is already locked
      if (inventory.lockedCreatureId === creatureId) {
        // Unlock the creature
        await storage.setLockedCreature(userId, null);
        await buttonInteraction.update({
          content: `🔓 **${selectedCreature.name}** has been unlocked and is no longer protected from adventure.`,
          embeds: [],
          components: []
        });
      } else {
        // Lock the creature
        await storage.setLockedCreature(userId, creatureId);
        await buttonInteraction.update({
          content: `🔒 **${selectedCreature.name}** has been locked and is now protected from adventure!`,
          embeds: [],
          components: []
        });
      }
      
      collector.stop();
    });
    
    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (error) {
        // Ignore errors if message was already updated
      }
    });
  }
};

// Export all commands
export const commands = [helpCommand, catchCommand, inventoryCommand, replaceCommand, battleCommand, acceptCommand, declineCommand, resetInventoryCommand, resetAllCommand, clearChallengesCommand, shutdownCommand, adventureCommand, useCommand, spawnCommand, bossStatusCommand, refreshBossCommand, resetDailyCatchCommand, gymCommand, gymInventoryCommand, gymRefreshCommand, resetBadgeCommand, giveBadgeCommand, resetGymInventoryCommand, lockCommand];
