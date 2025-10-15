export interface E9Creature {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
  };
  catchRate: number; // Percentage chance to catch (0-100)
}

export interface CaughtCreature {
  id: string;
  name: string;
  level: number;
  stats: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';
  caughtAt: Date;
  experience: number;
}

export interface UserInventory {
  userId: string;
  creatures: CaughtCreature[];
  totalCaught: number;
  totalBattles: number;
  totalWins: number;
  adventureItems: AdventureItem[];
  lastAdventureTime: number;
  gymBadges: GymBadge[];
  lockedCreatureId?: string; // ID of locked creature (protected from adventure)
  dailyUsage: {
    catchCount: number;
    challengeCount: number;
    adventureCount: number;
    lastResetDate: string; // YYYY-MM-DD format
  };
}

export interface BattleResult {
  winner: string;
  loser: string;
  winnerCreature: CaughtCreature;
  loserCreature: CaughtCreature;
  rounds: number;
  experienceGained: number;
}

export interface ReplacementOption {
  newCreature: CaughtCreature;
  currentCreatures: CaughtCreature[];
  isBetterTier: boolean;
}

export interface AdventureItem {
  name: string;
  type: 'weapon' | 'armor' | 'food';
  statBonus: number;
  description: string;
  emoji: string;
  quantity: number;
}

export interface AdventureResult {
  success: boolean;
  item?: AdventureItem;
  creatureLost?: CaughtCreature;
  message: string;
  exhausted: boolean;
}

export interface BossCreature {
  id: string;
  name: string;
  rarity: 'boss';
  baseStats: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
  };
  spawnTime: number;
  spawnerId: string;
  imageUrl?: string;
}

export interface BossBattle {
  bossId: string;
  attackerId: string;
  creatureId: string;
  timestamp: number;
  damageDealt: number;
  creatureDied: boolean;
}

export interface UserBossStats {
  userId: string;
  dailyAttacks: number;
  lastAttackTime: number;
  lastResetDate: string;
}

export interface GymBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedAt: Date;
  gymId: string;
}

export interface GymBoss {
  id: string;
  name: string;
  rarity: 'gym';
  baseStats: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
  };
  round: number;
  imageUrl: string;
}

export interface GymBattle {
  id: string;
  startTime: number;
  endTime: number;
  currentRound: number;
  status: 'active' | 'completed' | 'failed';
  rounds: GymRound[];
  participants: { [userId: string]: string[] }; // userId -> array of round numbers they participated in
  createdBy: string;
}

export interface GymRound {
  roundNumber: number;
  boss: GymBoss;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed';
  participants: string[]; // userIds who participated in this round
}

export interface GymBattleResult {
  gymId: string;
  attackerId: string;
  creatureId: string;
  roundNumber: number;
  timestamp: number;
  damageDealt: number;
  creatureDied: boolean;
}