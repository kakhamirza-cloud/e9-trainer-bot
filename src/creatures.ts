import { E9Creature, AdventureItem, BossCreature, GymBoss } from './types';

// E9 Creatures with rarity tiers and stats
export const E9_CREATURES: E9Creature[] = [
  // Common (60% catch rate)
  { name: 'celeste', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'byte', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'snoop', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'oasys', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'dayze', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'ember', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'byron', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'melt', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'lizzy', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'molten', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'polar', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'blanco', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'sprout', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'gilly', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'eighteen', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'melo', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'armstrong', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'gizmo', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'yum yum', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'sam', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'dottie', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'skittles', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'rory', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'sonar', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'aero', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'skelly', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'zap', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'mushy', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'pane', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'tomb', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'torty', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'tatters', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'smoak', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'fin', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'bao', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'geo', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'mack', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'scabz', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'cosmo', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'fuse', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'flare', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'tanky', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'wasteland', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'voodoo', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'swamp', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'samurai', rarity: 'common', baseStats: { hp: 50, attack: 50, defense: 35 }, catchRate: 60 },
  { name: 'robot', rarity: 'common', baseStats: { hp: 55, attack: 40, defense: 45 }, catchRate: 60 },
  { name: 'pepe', rarity: 'common', baseStats: { hp: 50, attack: 45, defense: 40 }, catchRate: 60 },
  { name: 'medusa', rarity: 'common', baseStats: { hp: 45, attack: 50, defense: 35 }, catchRate: 60 },

  // Uncommon (40% catch rate) - Higher stats
  { name: 'celeste', rarity: 'uncommon', baseStats: { hp: 70, attack: 65, defense: 60 }, catchRate: 40 },
  { name: 'byte', rarity: 'uncommon', baseStats: { hp: 65, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'ember', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'molten', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'polar', rarity: 'uncommon', baseStats: { hp: 75, attack: 60, defense: 65 }, catchRate: 40 },
  { name: 'gilly', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'armstrong', rarity: 'uncommon', baseStats: { hp: 65, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'gizmo', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'skittles', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'aero', rarity: 'uncommon', baseStats: { hp: 65, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'zap', rarity: 'uncommon', baseStats: { hp: 75, attack: 60, defense: 65 }, catchRate: 40 },
  { name: 'tanky', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'samurai', rarity: 'uncommon', baseStats: { hp: 70, attack: 70, defense: 55 }, catchRate: 40 },
  { name: 'robot', rarity: 'uncommon', baseStats: { hp: 75, attack: 60, defense: 65 }, catchRate: 40 },

  // Rare (25% catch rate) - Even higher stats
  { name: 'ember', rarity: 'rare', baseStats: { hp: 90, attack: 90, defense: 75 }, catchRate: 25 },
  { name: 'molten', rarity: 'rare', baseStats: { hp: 90, attack: 90, defense: 75 }, catchRate: 25 },
  { name: 'polar', rarity: 'rare', baseStats: { hp: 95, attack: 80, defense: 85 }, catchRate: 25 },
  { name: 'gizmo', rarity: 'rare', baseStats: { hp: 90, attack: 90, defense: 75 }, catchRate: 25 },
  { name: 'zap', rarity: 'rare', baseStats: { hp: 95, attack: 80, defense: 85 }, catchRate: 25 },
  { name: 'tanky', rarity: 'rare', baseStats: { hp: 90, attack: 90, defense: 75 }, catchRate: 25 },
  { name: 'samurai', rarity: 'rare', baseStats: { hp: 90, attack: 90, defense: 75 }, catchRate: 25 },
  { name: 'robot', rarity: 'rare', baseStats: { hp: 95, attack: 80, defense: 85 }, catchRate: 25 },

  // Epic (15% catch rate) - Very high stats
  { name: 'polar', rarity: 'epic', baseStats: { hp: 120, attack: 100, defense: 110 }, catchRate: 15 },
  { name: 'zap', rarity: 'epic', baseStats: { hp: 120, attack: 100, defense: 110 }, catchRate: 15 },
  { name: 'robot', rarity: 'epic', baseStats: { hp: 120, attack: 100, defense: 110 }, catchRate: 15 },

  // Legendary (5% catch rate) - Maximum stats
  { name: 'polar', rarity: 'legendary', baseStats: { hp: 150, attack: 130, defense: 140 }, catchRate: 5 },
  { name: 'zap', rarity: 'legendary', baseStats: { hp: 150, attack: 130, defense: 140 }, catchRate: 5 },
  { name: 'robot', rarity: 'legendary', baseStats: { hp: 150, attack: 130, defense: 140 }, catchRate: 5 }
];

// Helper function to get a random creature based on rarity weights
export function getRandomCreature(): E9Creature {
  const random = Math.random() * 100;
  
  if (random < 5) {
    // 5% chance for legendary
    const legendary = E9_CREATURES.filter(c => c.rarity === 'legendary');
    return legendary[Math.floor(Math.random() * legendary.length)];
  } else if (random < 20) {
    // 15% chance for epic
    const epic = E9_CREATURES.filter(c => c.rarity === 'epic');
    return epic[Math.floor(Math.random() * epic.length)];
  } else if (random < 45) {
    // 25% chance for rare
    const rare = E9_CREATURES.filter(c => c.rarity === 'rare');
    return rare[Math.floor(Math.random() * rare.length)];
  } else if (random < 85) {
    // 40% chance for uncommon
    const uncommon = E9_CREATURES.filter(c => c.rarity === 'uncommon');
    return uncommon[Math.floor(Math.random() * uncommon.length)];
  } else {
    // 60% chance for common
    const common = E9_CREATURES.filter(c => c.rarity === 'common');
    return common[Math.floor(Math.random() * common.length)];
  }
}

// Helper function to get a random creature with equal probability for all tiers (for bot battles only)
export function getRandomBotCreature(): E9Creature {
  // Get all unique rarities
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  
  // Randomly select a rarity with equal probability (20% each)
  const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];
  
  // Get all creatures of the selected rarity
  const creaturesOfRarity = E9_CREATURES.filter(c => c.rarity === randomRarity);
  
  // Randomly select one creature from that rarity
  return creaturesOfRarity[Math.floor(Math.random() * creaturesOfRarity.length)];
}

// Helper function to get rarity emoji
export function getRarityEmoji(rarity: string): string {
  switch (rarity) {
    case 'common': return '⚪';
    case 'uncommon': return '🟢';
    case 'rare': return '🔵';
    case 'epic': return '🟣';
    case 'legendary': return '🟡';
    case 'mythical': return '🔴';
    case 'boss': return '👹';
    default: return '⚪';
  }
}

// Adventure Items with low drop rates
export const ADVENTURE_ITEMS: AdventureItem[] = [
  // Weapons (Attack boost)
  { name: 'Rusty Sword', type: 'weapon', statBonus: 1, description: 'An old sword that increases attack by 1', emoji: '⚔️', quantity: 1 },
  { name: 'Iron Dagger', type: 'weapon', statBonus: 2, description: 'A sharp dagger that increases attack by 2', emoji: '🗡️', quantity: 1 },
  { name: 'Steel Blade', type: 'weapon', statBonus: 3, description: 'A powerful blade that increases attack by 3', emoji: '⚔️', quantity: 1 },
  
  // Armor (Defense boost)
  { name: 'Leather Armor', type: 'armor', statBonus: 1, description: 'Basic armor that increases defense by 1', emoji: '🛡️', quantity: 1 },
  { name: 'Chain Mail', type: 'armor', statBonus: 2, description: 'Strong armor that increases defense by 2', emoji: '🛡️', quantity: 1 },
  { name: 'Plate Armor', type: 'armor', statBonus: 3, description: 'Heavy armor that increases defense by 3', emoji: '🛡️', quantity: 1 },
  
  // Food (Health restoration)
  { name: 'Health Potion', type: 'food', statBonus: 10, description: 'A basic healing potion that restores 10 HP', emoji: '🧪', quantity: 1 },
  { name: 'Greater Health Potion', type: 'food', statBonus: 15, description: 'A powerful healing potion that restores 15 HP', emoji: '🍯', quantity: 1 },
  { name: 'Elixir of Life', type: 'food', statBonus: 20, description: 'A rare elixir that restores 20 HP', emoji: '💎', quantity: 1 }
];

// Helper function to get a random adventure item with low drop rate
export function getRandomAdventureItem(): AdventureItem | null {
  const random = Math.random() * 100;
  
  // Only 15% chance to get any item at all
  if (random > 15) {
    return null;
  }
  
  // If we get an item, randomly select from all available items
  const randomItem = ADVENTURE_ITEMS[Math.floor(Math.random() * ADVENTURE_ITEMS.length)];
  return randomItem;
}

// Boss creature definitions
export const BOSS_CREATURES = {
  medusa: {
    name: 'Medusa',
    imageUrl: 'https://i.imgur.com/Ue8xiJt.png',
    description: 'A powerful Medusa boss with petrifying gaze!'
  },
  samurai: {
    name: 'Samurai',
    imageUrl: 'https://i.imgur.com/rif6b7Y.png',
    description: 'A legendary Samurai warrior with unmatched skill!'
  },
  pepe: {
    name: 'Pepe',
    imageUrl: 'https://i.imgur.com/EycFh07.png',
    description: 'The legendary Pepe boss with mysterious powers!'
  }
};

// Helper function to create a random boss creature
export function createRandomBoss(spawnerId: string): BossCreature {
  const bossTypes = Object.keys(BOSS_CREATURES);
  const randomBossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
  const bossData = BOSS_CREATURES[randomBossType as keyof typeof BOSS_CREATURES];
  
  // Randomize stats within the specified ranges
  const hp = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000; // 1000-1500
  const attack = Math.floor(Math.random() * (500 - 300 + 1)) + 300; // 300-500
  
  // All rare bosses have random defense between 5-10
  const defense = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // 5-10
  
  return {
    id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: bossData.name,
    rarity: 'boss',
    baseStats: {
      hp: hp,
      maxHp: hp,
      attack: attack,
      defense: defense
    },
    spawnTime: Date.now(),
    spawnerId: spawnerId,
    imageUrl: bossData.imageUrl
  };
}

// Helper function to create a Mythical tier guardian reward
export function createMythicalGuardian(bossName: string): E9Creature {
  // Mythical stats are slightly higher than Legendary
  const baseStats = {
    hp: Math.floor(Math.random() * (180 - 160 + 1)) + 160, // 160-180 (vs Legendary 150)
    attack: Math.floor(Math.random() * (150 - 130 + 1)) + 130, // 130-150 (vs Legendary 130)
    defense: Math.floor(Math.random() * (150 - 130 + 1)) + 130 // 130-150 (vs Legendary 140)
  };
  
  return {
    name: bossName,
    rarity: 'mythical',
    baseStats: baseStats,
    catchRate: 100 // Always catchable as reward
  };
}

// Gym boss data for rounds 1 and 2 (random selection)
const GYM_BOSSES_ROUNDS_1_2 = [
  { name: 'Pepe', imageUrl: 'https://i.imgur.com/OyE2Yve.jpeg' },
  { name: 'Samurai', imageUrl: 'https://i.imgur.com/4ckjFOU.png' },
  { name: 'Medusa', imageUrl: 'https://i.imgur.com/7hflnde.png' },
  { name: '4 Arms', imageUrl: 'https://i.imgur.com/PVEwWkb.png' }
];

// Gym boss data for round 3 (always Gym Boss)
const GYM_BOSS_ROUND_3 = {
  name: 'Gym Boss',
  imageUrl: 'https://i.imgur.com/WBHbY5Q.png'
};

// Create a gym boss for the specified round
export function createGymBoss(round: number): GymBoss {
  const { v4: uuidv4 } = require('uuid');
  
  let bossData;
  let baseStats;
  
  if (round === 3) {
    // Round 3: Always Gym Boss
    bossData = GYM_BOSS_ROUND_3;
    baseStats = {
      hp: 1200,
      maxHp: 1200,
      attack: 100,
      defense: 2
    };
  } else {
    // Rounds 1 and 2: Random selection
    const randomBoss = GYM_BOSSES_ROUNDS_1_2[Math.floor(Math.random() * GYM_BOSSES_ROUNDS_1_2.length)];
    bossData = randomBoss;
    
    if (round === 1) {
      baseStats = {
        hp: 1000,
        maxHp: 1000,
        attack: 100,
        defense: 1
      };
    } else if (round === 2) {
      baseStats = {
        hp: 1100,
        maxHp: 1100,
        attack: 100,
        defense: 1
      };
    } else {
      throw new Error(`Invalid gym round: ${round}`);
    }
  }
  
  return {
    id: `gym_boss_${round}_${uuidv4()}`,
    name: bossData.name,
    rarity: 'gym',
    baseStats: baseStats,
    round: round,
    imageUrl: bossData.imageUrl
  };
}
