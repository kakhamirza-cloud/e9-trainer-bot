import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { UserInventory, CaughtCreature, AdventureItem, BossCreature, BossBattle, UserBossStats, GymBattle, GymBadge, GymBattleResult } from './types.js';
import { v4 as uuidv4 } from 'uuid';

interface Challenge {
  challengerId: string;
  opponentId: string;
  challengerCreatureId?: string;
  opponentCreatureId?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
}

interface Database {
  users: { [userId: string]: UserInventory };
  pendingCreatures: { [userId: string]: CaughtCreature };
  challenges: { [challengeId: string]: Challenge };
  activeBoss: BossCreature | null;
  bossBattles: { [battleId: string]: BossBattle };
  userBossStats: { [userId: string]: UserBossStats };
  activeGym: GymBattle | null;
  gymBattles: { [battleId: string]: GymBattle };
  gymBattleResults: { [battleId: string]: GymBattleResult };
  gymParticipants: { [gymId: string]: { gymId: string; round3Participants: string[] } };
  userGymStats: { [userId: string]: UserBossStats };
}

class StorageManager {
  private db: Low<Database>;

  constructor() {
    const file = './data/database.json';
    const adapter = new JSONFile<Database>(file);
    this.db = new Low(adapter, { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.db.read();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
    
    // Migrate existing data to enforce 3-creature limit
    console.log('🔄 Running inventory migration to enforce 3-creature limit...');
    await this.migrateInventoryLimits();
    console.log('✅ Inventory migration completed');
    
    // Migrate database to add gym-related fields
    console.log('🔄 Running gym fields migration...');
    await this.migrateGymFields();
    console.log('✅ Gym fields migration completed');
  }

  // Migration function to enforce 3-creature limit on existing data and add new fields
  private async migrateInventoryLimits(): Promise<void> {
    let needsUpdate = false;
    let migratedUsers = 0;
    
    console.log(`🔍 Checking ${Object.keys(this.db.data.users).length} users for inventory migration...`);
    
    for (const userId in this.db.data.users) {
      const user = this.db.data.users[userId];
      console.log(`  User ${userId}: ${user.creatures.length} creatures`);
      
      let userNeedsUpdate = false;
      
      // Enforce 3-creature limit
      if (user.creatures.length > 3) {
        const oldCount = user.creatures.length;
        // Keep only the first 3 creatures (oldest ones)
        user.creatures = user.creatures.slice(0, 3);
        userNeedsUpdate = true;
        console.log(`  ⚠️  Migrated user ${userId}: reduced from ${oldCount} to 3 creatures`);
      }
      
      // Add missing adventure fields
      if (user.adventureItems === undefined) {
        user.adventureItems = [];
        userNeedsUpdate = true;
        console.log(`  ➕ Added adventureItems field to user ${userId}`);
      }
      
      // Migrate existing items to include quantity field
      if (user.adventureItems && user.adventureItems.length > 0) {
        let migratedItems = 0;
        user.adventureItems.forEach(item => {
          if (item.quantity === undefined) {
            item.quantity = 1;
            migratedItems++;
            userNeedsUpdate = true;
          }
        });
        if (migratedItems > 0) {
          console.log(`  🔄 Migrated ${migratedItems} items to include quantity field for user ${userId}`);
        }
        
        // Consolidate any duplicate items after migration
        const originalCount = user.adventureItems.length;
        this.consolidateDuplicateItems(userId);
        if (user.adventureItems.length < originalCount) {
          userNeedsUpdate = true;
          console.log(`  🔄 Consolidated ${originalCount - user.adventureItems.length} duplicate items for user ${userId}`);
        }
      }
      
      if (user.lastAdventureTime === undefined) {
        user.lastAdventureTime = 0;
        userNeedsUpdate = true;
        console.log(`  ➕ Added lastAdventureTime field to user ${userId}`);
      }
      
      // Add missing daily usage fields
      if (user.dailyUsage === undefined) {
        user.dailyUsage = {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0] // Today's date
        };
        userNeedsUpdate = true;
        console.log(`  ➕ Added dailyUsage field to user ${userId}`);
      }
      
      // Add missing gym badges field
      if (user.gymBadges === undefined) {
        user.gymBadges = [];
        userNeedsUpdate = true;
        console.log(`  ➕ Added gymBadges field to user ${userId}`);
      }
      
      if (userNeedsUpdate) {
        needsUpdate = true;
        migratedUsers++;
      }
    }
    
    if (needsUpdate) {
      try {
        await this.db.write();
        console.log(`✅ Inventory migration completed - updated ${migratedUsers} users`);
      } catch (error) {
        console.error('❌ Failed to write migration changes:', error);
        throw error;
      }
    } else {
      console.log('✅ No users needed migration - all inventories are already up to date');
    }
  }

  // Migration function to add gym-related fields to existing database
  private async migrateGymFields(): Promise<void> {
    let needsUpdate = false;
    
    // Check if gym-related fields are missing
    if (this.db.data.activeGym === undefined) {
      this.db.data.activeGym = null;
      needsUpdate = true;
      console.log('  ➕ Added activeGym field');
    }
    
    if (this.db.data.gymBattles === undefined) {
      this.db.data.gymBattles = {};
      needsUpdate = true;
      console.log('  ➕ Added gymBattles field');
    }
    
    if (this.db.data.gymBattleResults === undefined) {
      this.db.data.gymBattleResults = {};
      needsUpdate = true;
      console.log('  ➕ Added gymBattleResults field');
    }
    
    if (this.db.data.gymParticipants === undefined) {
      this.db.data.gymParticipants = {};
      needsUpdate = true;
      console.log('  ➕ Added gymParticipants field');
    }
    
    if (this.db.data.userGymStats === undefined) {
      this.db.data.userGymStats = {};
      needsUpdate = true;
      console.log('  ➕ Added userGymStats field');
    }
    
    // Add gymBadges field to existing users if missing
    for (const userId in this.db.data.users) {
      const user = this.db.data.users[userId];
      if (user.gymBadges === undefined) {
        user.gymBadges = [];
        needsUpdate = true;
        console.log(`  ➕ Added gymBadges field to user ${userId}`);
      }
    }
    
    if (needsUpdate) {
      try {
        await this.db.write();
        console.log('✅ Gym fields migration completed');
      } catch (error) {
        console.error('❌ Failed to write gym fields migration:', error);
        throw error;
      }
    } else {
      console.log('✅ No gym fields migration needed - all fields are already present');
    }
  }

  async getUserInventory(userId: string): Promise<UserInventory> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      lockedCreatureId: undefined,
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        }
      };
      await this.db.write();
    }
    
    const user = this.db.data.users[userId];
    
    // Safety check: ensure user never has more than 3 creatures
    if (user.creatures.length > 3) {
      const oldCount = user.creatures.length;
      user.creatures = user.creatures.slice(0, 3);
      await this.db.write();
      console.log(`⚠️  Safety check: reduced user ${userId} from ${oldCount} to 3 creatures`);
    }
    
    return user;
  }

  async addCreature(userId: string, creature: CaughtCreature): Promise<{ success: boolean; message: string; replacedCreature?: CaughtCreature }> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        }
      };
    }
    
    const user = this.db.data.users[userId];
    
    // Check if user has space (max 3 creatures)
    if (user.creatures.length < 3) {
      user.creatures.push(creature);
      user.totalCaught++;
      await this.db.write();
      return { success: true, message: 'Creature added to your collection!' };
    } else {
      // User has 3 creatures, need to replace one
      return { success: false, message: 'inventory_full', replacedCreature: undefined };
    }
  }

  async replaceCreature(userId: string, newCreature: CaughtCreature, creatureToReplaceId: string): Promise<{ success: boolean; message: string; replacedCreature?: CaughtCreature }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return { success: false, message: 'User not found' };
    
    const creatureIndex = user.creatures.findIndex(c => c.id === creatureToReplaceId);
    if (creatureIndex === -1) return { success: false, message: 'Creature not found' };
    
    const replacedCreature = user.creatures[creatureIndex];
    user.creatures[creatureIndex] = newCreature;
    user.totalCaught++;
    await this.db.write();
    
    return { success: true, message: 'Creature replaced successfully!', replacedCreature };
  }

  async removeDeadCreature(userId: string, creatureId: string): Promise<CaughtCreature | null> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return null;
    
    const creatureIndex = user.creatures.findIndex(c => c.id === creatureId);
    if (creatureIndex === -1) return null;
    
    const deadCreature = user.creatures[creatureIndex];
    user.creatures.splice(creatureIndex, 1);
    
    // If the dead creature was locked, unlock it
    if (user.lockedCreatureId === creatureId) {
      user.lockedCreatureId = undefined;
    }
    
    await this.db.write();
    
    return deadCreature;
  }

  async setLockedCreature(userId: string, creatureId: string | null): Promise<void> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return;
    
    // If setting a specific creature, verify it exists
    if (creatureId) {
      const creature = user.creatures.find(c => c.id === creatureId);
      if (!creature) return;
    }
    
    user.lockedCreatureId = creatureId || undefined;
    await this.db.write();
  }

  async setPendingCreature(userId: string, creature: CaughtCreature): Promise<void> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Ensure pendingCreatures object exists
    if (!this.db.data.pendingCreatures) {
      this.db.data.pendingCreatures = {};
    }
    
    // Ensure challenges object exists
    if (!this.db.data.challenges) {
      this.db.data.challenges = {};
    }
    
    this.db.data.pendingCreatures[userId] = creature;
    await this.db.write();
  }

  async getPendingCreature(userId: string): Promise<CaughtCreature | null> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    return this.db.data.pendingCreatures?.[userId] || null;
  }

  async clearPendingCreature(userId: string): Promise<void> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Ensure pendingCreatures object exists before trying to delete
    if (this.db.data.pendingCreatures) {
      delete this.db.data.pendingCreatures[userId];
    }
    
    await this.db.write();
  }

  async updateCreature(userId: string, creatureId: string, updates: Partial<CaughtCreature>): Promise<void> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return;
    
    const creatureIndex = user.creatures.findIndex(c => c.id === creatureId);
    if (creatureIndex !== -1) {
      user.creatures[creatureIndex] = { ...user.creatures[creatureIndex], ...updates };
      await this.db.write();
    }
  }

  async incrementBattles(userId: string): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        }
      };
    }
    
    this.db.data.users[userId].totalBattles++;
    await this.db.write();
  }

  async incrementWins(userId: string): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        }
      };
    }
    
    this.db.data.users[userId].totalWins++;
    await this.db.write();
  }

  async getAllUsers(): Promise<UserInventory[]> {
    await this.db.read();
    return Object.values(this.db.data.users);
  }

  // Helper function to create a new caught creature
  createCaughtCreature(name: string, rarity: string, baseStats: { hp: number; attack: number; defense: number }): CaughtCreature {
    return {
      id: uuidv4(),
      name,
      level: 1,
      stats: {
        hp: baseStats.hp,
        maxHp: baseStats.hp,
        attack: baseStats.attack,
        defense: baseStats.defense
      },
      rarity: rarity as any,
      caughtAt: new Date(),
      experience: 0
    };
  }

  // Helper function to level up a creature (fair system - no stat increases)
  levelUpCreature(creature: CaughtCreature): CaughtCreature {
    const newLevel = creature.level + 1;
    
    // Fair leveling system: only increase level, no stat increases
    // Stats will be increased through evolution system in the future
    return {
      ...creature,
      level: newLevel,
      stats: {
        // Keep current stats completely unchanged - no increases at all
        hp: creature.stats.hp, // Keep current HP (don't heal)
        maxHp: creature.stats.maxHp, // Keep current max HP
        attack: creature.stats.attack, // Keep current attack
        defense: creature.stats.defense // Keep current defense
      },
      experience: 0 // Reset experience after level up
    };
  }

  // Helper function to get tier value for comparison
  getTierValue(rarity: string): number {
    switch (rarity) {
      case 'common': return 1;
      case 'uncommon': return 2;
      case 'rare': return 3;
      case 'epic': return 4;
      case 'legendary': return 5;
      case 'mythical': return 6;
      default: return 1;
    }
  }

  // Helper function to check if new creature is better tier than current creatures
  isBetterTier(newCreature: CaughtCreature, currentCreatures: CaughtCreature[]): boolean {
    const newTierValue = this.getTierValue(newCreature.rarity);
    
    // Check if any current creature has lower tier
    return currentCreatures.some(creature => this.getTierValue(creature.rarity) < newTierValue);
  }

  // Helper function to get lower tier creatures for replacement
  getLowerTierCreatures(newCreature: CaughtCreature, currentCreatures: CaughtCreature[]): CaughtCreature[] {
    const newTierValue = this.getTierValue(newCreature.rarity);
    return currentCreatures.filter(creature => this.getTierValue(creature.rarity) < newTierValue);
  }

  // Reset user's inventory completely
  async resetUserInventory(userId: string): Promise<{ success: boolean; message: string }> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      return { success: false, message: 'User not found' };
    }
    
    const user = this.db.data.users[userId];
    const creatureCount = user.creatures.length;
    
    // Reset inventory
    user.creatures = [];
    user.totalCaught = 0;
    user.totalBattles = 0;
    user.totalWins = 0;
    
    // Clear any pending creatures
    if (this.db.data.pendingCreatures && this.db.data.pendingCreatures[userId]) {
      delete this.db.data.pendingCreatures[userId];
    }
    
    await this.db.write();
    
    return { 
      success: true, 
      message: `Successfully reset your inventory! Removed ${creatureCount} creatures and cleared all stats.` 
    };
  }

  // Challenge management methods
  async createChallenge(challengerId: string, opponentId: string): Promise<{ success: boolean; challengeId?: string; message: string }> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Ensure challenges object exists
    if (!this.db.data.challenges) {
      this.db.data.challenges = {};
    }
    
    // Check if there's already a pending challenge between these users
    const existingChallenge = Object.values(this.db.data.challenges).find(
      challenge => 
        (challenge.challengerId === challengerId && challenge.opponentId === opponentId && challenge.status === 'pending') ||
        (challenge.challengerId === opponentId && challenge.opponentId === challengerId && challenge.status === 'pending')
    );
    
    if (existingChallenge) {
      return { success: false, message: 'There is already a pending challenge between you and this user!' };
    }
    
    const challengeId = uuidv4();
    const challenge: Challenge = {
      challengerId,
      opponentId,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.db.data.challenges[challengeId] = challenge;
    await this.db.write();
    
    return { success: true, challengeId, message: 'Challenge created successfully!' };
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    return this.db.data.challenges?.[challengeId] || null;
  }

  async updateChallenge(challengeId: string, updates: Partial<Challenge>): Promise<void> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Ensure challenges object exists
    if (!this.db.data.challenges) {
      this.db.data.challenges = {};
    }
    
    if (this.db.data.challenges[challengeId]) {
      this.db.data.challenges[challengeId] = { ...this.db.data.challenges[challengeId], ...updates };
      await this.db.write();
      
      // Clear timeout when challenge status changes to prevent false "CHALLENGE EXPIRED" messages
      if (updates.status && (updates.status === 'accepted' || updates.status === 'completed')) {
        if ((global as any).challengeTimeouts && (global as any).challengeTimeouts[challengeId]) {
          clearTimeout((global as any).challengeTimeouts[challengeId]);
          delete (global as any).challengeTimeouts[challengeId];
          console.log(`Cleared timeout for challenge status change to ${updates.status}: ${challengeId}`);
        }
      }
    }
  }

  async getPendingChallengeForUser(userId: string): Promise<Challenge | null> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    if (!this.db.data.challenges) {
      return null;
    }
    
    return Object.values(this.db.data.challenges).find(
      challenge => 
        (challenge.challengerId === userId || challenge.opponentId === userId) && 
        challenge.status === 'pending'
    ) || null;
  }

  async isUserInActiveBattle(userId: string): Promise<boolean> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    if (!this.db.data.challenges) {
      return false;
    }
    
    // First, clean up any expired challenges
    await this.cleanupExpiredChallenges();
    
    // Check if user is in any active challenge (pending or accepted)
    return Object.values(this.db.data.challenges).some(
      challenge => 
        (challenge.challengerId === userId || challenge.opponentId === userId) && 
        (challenge.status === 'pending' || challenge.status === 'accepted')
    );
  }

  async getActiveChallengeForUser(userId: string): Promise<Challenge | null> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    if (!this.db.data.challenges) {
      return null;
    }
    
    return Object.values(this.db.data.challenges).find(
      challenge => 
        (challenge.challengerId === userId || challenge.opponentId === userId) && 
        (challenge.status === 'pending' || challenge.status === 'accepted')
    ) || null;
  }

  async cleanupExpiredChallenges(): Promise<void> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    if (!this.db.data.challenges) {
      return;
    }
    
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5 minutes
    
    let needsUpdate = false;
    for (const [challengeId, challenge] of Object.entries(this.db.data.challenges)) {
      // Clean up expired pending challenges
      if (challenge.status === 'pending' && (now - challenge.timestamp) > expireTime) {
        delete this.db.data.challenges[challengeId];
        needsUpdate = true;
        console.log(`🧹 Cleaned up expired pending challenge: ${challengeId}`);
      }
      // Clean up stale accepted challenges (should not stay accepted for more than 10 minutes)
      else if (challenge.status === 'accepted' && (now - challenge.timestamp) > (10 * 60 * 1000)) {
        delete this.db.data.challenges[challengeId];
        needsUpdate = true;
        console.log(`🧹 Cleaned up stale accepted challenge: ${challengeId}`);
      }
      // Clean up completed challenges (should not stay in database for more than 1 hour)
      else if (challenge.status === 'completed' && (now - challenge.timestamp) > (60 * 60 * 1000)) {
        delete this.db.data.challenges[challengeId];
        needsUpdate = true;
        console.log(`🧹 Cleaned up old completed challenge: ${challengeId}`);
      }
      // Clean up challenges with invalid timestamps (future dates or very old dates)
      else if (challenge.timestamp > now + (24 * 60 * 60 * 1000) || challenge.timestamp < (now - (30 * 24 * 60 * 60 * 1000))) {
        delete this.db.data.challenges[challengeId];
        needsUpdate = true;
        console.log(`🧹 Cleaned up challenge with invalid timestamp: ${challengeId}`);
      }
    }
    
    if (needsUpdate) {
      await this.db.write();
      console.log('✅ Challenge cleanup completed');
    }
  }

  async getChallengeIdByUsers(challengerId: string, opponentId: string): Promise<string | null> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    if (!this.db.data.challenges) {
      return null;
    }
    
    const challengeEntry = Object.entries(this.db.data.challenges).find(
      ([_, challenge]) => challenge.challengerId === challengerId && challenge.opponentId === opponentId
    );
    
    return challengeEntry ? challengeEntry[0] : null;
  }

  async deleteChallenge(challengeId: string): Promise<void> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Ensure challenges object exists
    if (!this.db.data.challenges) {
      this.db.data.challenges = {};
    }
    
    // Delete the challenge from the database
    if (this.db.data.challenges[challengeId]) {
      delete this.db.data.challenges[challengeId];
      await this.db.write();
      console.log(`Challenge ${challengeId} deleted from database`);
      
      // Clear timeout when challenge is deleted to prevent false "CHALLENGE EXPIRED" messages
      if ((global as any).challengeTimeouts && (global as any).challengeTimeouts[challengeId]) {
        clearTimeout((global as any).challengeTimeouts[challengeId]);
        delete (global as any).challengeTimeouts[challengeId];
        console.log(`Cleared timeout for deleted challenge: ${challengeId}`);
      }
    }
  }

  // Clear all challenges - for debugging/admin use
  async clearAllChallenges(): Promise<{ success: boolean; message: string }> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    const challengeCount = Object.keys(this.db.data.challenges || {}).length;
    
    // Clear all challenges
    this.db.data.challenges = {};
    await this.db.write();
    
    return {
      success: true,
      message: `Successfully cleared ${challengeCount} challenges from the database.`
    };
  }

  // Force migration check - for debugging
  async forceMigrationCheck(): Promise<void> {
    console.log('🔄 Force running migration check...');
    await this.migrateInventoryLimits();
  }

  // Adventure-related methods
  async canGoAdventure(userId: string): Promise<{ canAdventure: boolean; timeRemaining: number }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user || !user.lastAdventureTime || user.lastAdventureTime === 0) {
      return { canAdventure: true, timeRemaining: 0 };
    }
    
    const now = Date.now();
    const timeSinceLastAdventure = now - user.lastAdventureTime;
    const cooldownTime = 60 * 1000; // 1 minute in milliseconds
    
    // Ensure timeSinceLastAdventure is a valid number
    if (isNaN(timeSinceLastAdventure) || timeSinceLastAdventure < 0) {
      return { canAdventure: true, timeRemaining: 0 };
    }
    
    if (timeSinceLastAdventure >= cooldownTime) {
      return { canAdventure: true, timeRemaining: 0 };
    } else {
      const remaining = cooldownTime - timeSinceLastAdventure;
      return { canAdventure: false, timeRemaining: Math.max(0, remaining) };
    }
  }

  private consolidateDuplicateItems(userId: string): void {
    const user = this.db.data.users[userId];
    if (!user || !user.adventureItems) return;
    
    const consolidatedItems: AdventureItem[] = [];
    const itemMap = new Map<string, AdventureItem>();
    
    // Group items by name and type, summing quantities
    user.adventureItems.forEach(item => {
      const key = `${item.name}|${item.type}`;
      if (itemMap.has(key)) {
        // Add to existing item's quantity
        const existingItem = itemMap.get(key)!;
        existingItem.quantity += item.quantity;
      } else {
        // Create new entry
        itemMap.set(key, { ...item });
      }
    });
    
    // Convert map back to array
    user.adventureItems = Array.from(itemMap.values());
    
    if (itemMap.size !== user.adventureItems.length) {
      console.log(`🔄 Consolidated duplicate items for user ${userId}: ${user.adventureItems.length} unique items`);
    }
  }

  async addAdventureItem(userId: string, item: AdventureItem): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        }
      };
    }
    
    // Check if user already has this item and stack it
    const existingItemIndex = this.db.data.users[userId].adventureItems.findIndex(
      existingItem => existingItem.name === item.name && existingItem.type === item.type
    );
    
    if (existingItemIndex !== -1) {
      // Stack the item by increasing quantity
      this.db.data.users[userId].adventureItems[existingItemIndex].quantity += item.quantity;
      console.log(`📦 Stacked ${item.name}: now have ${this.db.data.users[userId].adventureItems[existingItemIndex].quantity}`);
    } else {
      // Add as new item
      this.db.data.users[userId].adventureItems.push(item);
      console.log(`📦 Added new item: ${item.name} (quantity: ${item.quantity})`);
    }
    
    // Consolidate any duplicate items that might exist (cleanup for old data)
    this.consolidateDuplicateItems(userId);
    
    try {
      await this.db.write();
    } catch (error) {
      console.error(`❌ Failed to save adventure item to database:`, error);
      throw error;
    }
  }

  async removeRandomCreature(userId: string, lockedCreatureId?: string): Promise<CaughtCreature | null> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user || user.creatures.length === 0) {
      return null;
    }
    
    // Filter out locked creature if specified
    const availableCreatures = lockedCreatureId 
      ? user.creatures.filter(c => c.id !== lockedCreatureId)
      : user.creatures;
    
    if (availableCreatures.length === 0) {
      return null; // No available creatures to remove
    }
    
    // Randomly select a creature from available creatures
    const randomIndex = Math.floor(Math.random() * availableCreatures.length);
    const creatureToRemove = availableCreatures[randomIndex];
    
    // Find and remove the creature from the user's creatures array
    const creatureIndex = user.creatures.findIndex(c => c.id === creatureToRemove.id);
    if (creatureIndex !== -1) {
      const removedCreature = user.creatures.splice(creatureIndex, 1)[0];
      await this.db.write();
      return removedCreature;
    }
    
    return null;
  }

  async updateLastAdventureTime(userId: string): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        }
      };
    }
    
    this.db.data.users[userId].lastAdventureTime = Date.now();
    await this.db.write();
  }

  async applyAdventureItemToCreature(userId: string, creatureId: string, item: AdventureItem): Promise<boolean> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return false;
    
    const creatureIndex = user.creatures.findIndex(c => c.id === creatureId);
    if (creatureIndex === -1) return false;
    
    const creature = user.creatures[creatureIndex];
    
    // Apply stat bonus based on item type
    switch (item.type) {
      case 'weapon':
        creature.stats.attack += item.statBonus;
        break;
      case 'armor':
        creature.stats.defense += item.statBonus;
        break;
    }
    
    await this.db.write();
    return true;
  }

  async consumeAdventureItem(userId: string, itemIndex: number, creatureId: string): Promise<{ success: boolean; message: string; item?: AdventureItem; creature?: CaughtCreature; actualHealing?: number }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return { success: false, message: 'User not found' };
    
    // Check if item index is valid
    if (itemIndex < 0 || itemIndex >= user.adventureItems.length) {
      return { success: false, message: 'Invalid item index' };
    }
    
    // Check if creature exists
    const creatureIndex = user.creatures.findIndex(c => c.id === creatureId);
    if (creatureIndex === -1) {
      return { success: false, message: 'Creature not found' };
    }
    
    const item = user.adventureItems[itemIndex];
    const creature = user.creatures[creatureIndex];
    
    // Decrement quantity or remove item if quantity becomes 0
    if (item.quantity > 1) {
      item.quantity -= 1;
      console.log(`📦 Used 1 ${item.name}, ${item.quantity} remaining`);
    } else {
      // Remove the item from inventory if quantity becomes 0
      user.adventureItems.splice(itemIndex, 1);
      console.log(`📦 Used last ${item.name}, removed from inventory`);
    }
    
    let actualHealing = 0;
    
    // Apply stat bonus based on item type
    switch (item.type) {
      case 'weapon':
        creature.stats.attack += item.statBonus;
        console.log(`⚔️ Weapon item applied: ${item.name} (+${item.statBonus} Attack)`);
        break;
      case 'armor':
        creature.stats.defense += item.statBonus;
        console.log(`🛡️ Armor item applied: ${item.name} (+${item.statBonus} Defense)`);
        break;
      case 'food':
        // For food items, restore health but don't exceed max HP
        const oldHp = creature.stats.hp;
        creature.stats.hp = Math.min(creature.stats.maxHp, creature.stats.hp + item.statBonus);
        actualHealing = creature.stats.hp - oldHp;
        console.log(`🍯 Food item applied: ${item.name} (+${actualHealing} HP, was ${oldHp}, now ${creature.stats.hp})`);
        break;
    }
    
    console.log(`💾 Writing database changes for user ${userId}...`);
    try {
      await this.db.write();
      console.log(`✅ Database write completed`);
      
      // Verify the write by reading back the data
      await this.db.read();
      const updatedUser = this.db.data.users[userId];
      const updatedCreature = updatedUser?.creatures.find(c => c.id === creature.id);
      if (updatedCreature) {
        console.log(`🔍 Verification: Creature ${updatedCreature.name} now has HP: ${updatedCreature.stats.hp}/${updatedCreature.stats.maxHp}`);
      } else {
        console.log(`⚠️ Warning: Could not find creature ${creature.id} after database write`);
      }
    } catch (error) {
      console.error(`❌ Database write failed:`, error);
      return { 
        success: false, 
        message: `Failed to save changes to database. Please try again.`
      };
    }
    
    return { 
      success: true, 
      message: `Successfully used ${item.emoji} ${item.name} on ${creature.name}!`,
      item,
      creature,
      actualHealing
    };
  }

  // Daily usage tracking methods
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Helper function to format attack remaining display
  formatAttackRemaining(remaining: number): string {
    return remaining >= 999 ? 'Unlimited' : `${remaining}/3`;
  }

  private resetDailyUsageIfNeeded(user: UserInventory): void {
    const now = new Date();
    const lastReset = new Date(user.dailyUsage.lastResetDate);
    
    // Check if 12 hours have passed since last reset
    const twelveHoursInMs = 12 * 60 * 60 * 1000;
    const timeSinceLastReset = now.getTime() - lastReset.getTime();
    
    if (timeSinceLastReset >= twelveHoursInMs) {
      user.dailyUsage.catchCount = 0;
      user.dailyUsage.challengeCount = 0;
      user.dailyUsage.adventureCount = 0;
      user.dailyUsage.lastResetDate = now.toISOString();
    }
  }

  async canUseCatch(userId: string): Promise<{ canUse: boolean; remaining: number; timeUntilReset: number }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) {
      return { canUse: true, remaining: 10, timeUntilReset: 0 };
    }

    this.resetDailyUsageIfNeeded(user);
    
    const remaining = Math.max(0, 10 - user.dailyUsage.catchCount);
    const canUse = remaining > 0;
    
    // Calculate time until next reset (12 hours from last reset)
    const now = new Date();
    const lastReset = new Date(user.dailyUsage.lastResetDate);
    const nextReset = new Date(lastReset.getTime() + (12 * 60 * 60 * 1000));
    const timeUntilReset = Math.max(0, nextReset.getTime() - now.getTime());
    
    return { canUse, remaining, timeUntilReset };
  }


  async incrementCatchUsage(userId: string): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: this.getCurrentDate()
        }
      };
    }
    
    const user = this.db.data.users[userId];
    this.resetDailyUsageIfNeeded(user);
    user.dailyUsage.catchCount++;
    await this.db.write();
  }

  async canUseChallenge(userId: string): Promise<{ canUse: boolean; remaining: number; timeUntilReset: number }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) {
      return { canUse: true, remaining: 3, timeUntilReset: 0 };
    }

    this.resetDailyUsageIfNeeded(user);
    
    const remaining = Math.max(0, 3 - user.dailyUsage.challengeCount);
    const canUse = remaining > 0;
    
    // Calculate time until next reset (12 hours from last reset)
    const now = new Date();
    const lastReset = new Date(user.dailyUsage.lastResetDate);
    const nextReset = new Date(lastReset.getTime() + (12 * 60 * 60 * 1000));
    const timeUntilReset = Math.max(0, nextReset.getTime() - now.getTime());
    
    return { canUse, remaining, timeUntilReset };
  }

  async incrementChallengeUsage(userId: string): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: this.getCurrentDate()
        }
      };
    }
    
    const user = this.db.data.users[userId];
    this.resetDailyUsageIfNeeded(user);
    user.dailyUsage.challengeCount++;
    await this.db.write();
  }

  async decrementChallengeUsage(userId: string): Promise<void> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) return;
    
    this.resetDailyUsageIfNeeded(user);
    user.dailyUsage.challengeCount = Math.max(0, user.dailyUsage.challengeCount - 1);
    await this.db.write();
  }

  async canUseAdventure(userId: string): Promise<{ canUse: boolean; remaining: number; timeUntilReset: number }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) {
      return { canUse: true, remaining: 10, timeUntilReset: 0 };
    }

    this.resetDailyUsageIfNeeded(user);
    
    const remaining = Math.max(0, 10 - user.dailyUsage.adventureCount);
    const canUse = remaining > 0;
    
    // Calculate time until next reset (12 hours from last reset)
    const now = new Date();
    const lastReset = new Date(user.dailyUsage.lastResetDate);
    const nextReset = new Date(lastReset.getTime() + (12 * 60 * 60 * 1000));
    const timeUntilReset = Math.max(0, nextReset.getTime() - now.getTime());
    
    return { canUse, remaining, timeUntilReset };
  }

  async incrementAdventureUsage(userId: string): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.users[userId]) {
      this.db.data.users[userId] = {
        userId,
        creatures: [],
        totalCaught: 0,
        totalBattles: 0,
        totalWins: 0,
      adventureItems: [],
      lastAdventureTime: 0,
      gymBadges: [],
      dailyUsage: {
          catchCount: 0,
          challengeCount: 0,
          adventureCount: 0,
          lastResetDate: this.getCurrentDate()
        }
      };
    }
    
    const user = this.db.data.users[userId];
    this.resetDailyUsageIfNeeded(user);
    user.dailyUsage.adventureCount++;
    await this.db.write();
  }

  // Boss-related methods
  async spawnBoss(boss: BossCreature): Promise<{ success: boolean; message: string }> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Check if there's already an active boss
    if (this.db.data.activeBoss) {
      return { success: false, message: 'There is already an active boss! Defeat it first before spawning a new one.' };
    }
    
    this.db.data.activeBoss = boss;
    await this.db.write();
    
    return { success: true, message: `Boss ${boss.name} has been spawned!` };
  }

  async getActiveBoss(): Promise<BossCreature | null> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    return this.db.data.activeBoss || null;
  }

  async updateBossHp(bossId: string, newHp: number): Promise<boolean> {
    await this.db.read();
    
    if (!this.db.data || !this.db.data.activeBoss || this.db.data.activeBoss.id !== bossId) {
      return false;
    }
    
    this.db.data.activeBoss.baseStats.hp = Math.max(0, newHp);
    await this.db.write();
    return true;
  }

  async defeatBoss(): Promise<BossCreature | null> {
    await this.db.read();
    
    if (!this.db.data || !this.db.data.activeBoss) {
      return null;
    }
    
    const defeatedBoss = this.db.data.activeBoss;
    this.db.data.activeBoss = null;
    await this.db.write();
    
    return defeatedBoss;
  }

  async canUserAttackBoss(userId: string): Promise<{ canAttack: boolean; remaining: number; timeUntilReset: number; cooldownRemaining: number }> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Check if user has any alive creatures in their inventory
    const userInventory = this.db.data.users[userId];
    if (!userInventory || !userInventory.creatures || userInventory.creatures.length === 0) {
      return { 
        canAttack: false, 
        remaining: 0, 
        timeUntilReset: 0,
        cooldownRemaining: 0 
      };
    }
    
    // Check if user has any alive creatures
    const aliveCreatures = userInventory.creatures.filter(c => c.stats.hp > 0);
    if (aliveCreatures.length === 0) {
      return { 
        canAttack: false, 
        remaining: 0, 
        timeUntilReset: 0,
        cooldownRemaining: 0 
      };
    }
    
    // Ensure userBossStats object exists
    if (!this.db.data.userBossStats) {
      this.db.data.userBossStats = {};
    }
    
    const userStats = this.db.data.userBossStats[userId];
    const currentDate = this.getCurrentDate();
    
    // Reset daily stats if needed
    if (!userStats || userStats.lastResetDate !== currentDate) {
      this.db.data.userBossStats[userId] = {
        userId,
        dailyAttacks: 0,
        lastAttackTime: 0,
        lastResetDate: currentDate
      };
      await this.db.write();
    }
    
    const updatedUserStats = this.db.data.userBossStats[userId];
    
    // Check cooldown (30 seconds)
    const now = Date.now();
    const cooldownTime = 30 * 1000; // 30 seconds
    const timeSinceLastAttack = now - updatedUserStats.lastAttackTime;
    const cooldownRemaining = Math.max(0, cooldownTime - timeSinceLastAttack);
    
    // Calculate time until next reset (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const timeUntilReset = tomorrow.getTime() - now;
    
    // Unlimited attacks as long as user has alive creatures
    return { 
      canAttack: cooldownRemaining === 0, 
      remaining: 999, // Show as unlimited
      timeUntilReset,
      cooldownRemaining
    };
  }

  async recordBossAttack(userId: string, bossId: string, creatureId: string, damageDealt: number, creatureDied: boolean): Promise<void> {
    await this.db.read();
    
    // Ensure db.data exists and has the correct structure
    if (!this.db.data) {
    this.db.data = { 
      users: {}, 
      pendingCreatures: {}, 
      challenges: {}, 
      activeBoss: null, 
      bossBattles: {}, 
      userBossStats: {},
      activeGym: null,
      gymBattles: {},
      gymBattleResults: {},
      gymParticipants: {},
      userGymStats: {}
    };
    }
    
    // Ensure userBossStats and bossBattles objects exist
    if (!this.db.data.userBossStats) {
      this.db.data.userBossStats = {};
    }
    if (!this.db.data.bossBattles) {
      this.db.data.bossBattles = {};
    }
    
    // Update user boss stats
    if (!this.db.data.userBossStats[userId]) {
      this.db.data.userBossStats[userId] = {
        userId,
        dailyAttacks: 0,
        lastAttackTime: 0,
        lastResetDate: this.getCurrentDate()
      };
    }
    
    // Update attack tracking (no daily limit - unlimited attacks as long as user has creatures)
    this.db.data.userBossStats[userId].dailyAttacks++;
    this.db.data.userBossStats[userId].lastAttackTime = Date.now();
    
    // Record the battle
    const battleId = uuidv4();
    this.db.data.bossBattles[battleId] = {
      bossId,
      attackerId: userId,
      creatureId,
      timestamp: Date.now(),
      damageDealt,
      creatureDied
    };
    
    await this.db.write();
  }


  async removeDeadCreatureFromBossBattle(userId: string, creatureId: string): Promise<CaughtCreature | null> {
    return await this.removeDeadCreature(userId, creatureId);
  }

  // Admin method to reset daily catch count for a specific user
  async resetDailyCatchCount(userId: string): Promise<{ success: boolean; message: string }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Reset the daily catch count
    user.dailyUsage.catchCount = 0;
    user.dailyUsage.lastResetDate = this.getCurrentDate();
    
    await this.db.write();
    
    return { 
      success: true, 
      message: `Successfully reset daily catch count for user ${userId}. They now have 10/10 catch attempts available.` 
    };
  }

  // ===== GYM BATTLE METHODS =====

  // Check if there's an active gym battle
  async getActiveGym(): Promise<GymBattle | null> {
    await this.db.read();
    return this.db.data.activeGym;
  }

  // Get all gym battles (for manual badge system)
  async getGymBattles(): Promise<{ [battleId: string]: GymBattle }> {
    await this.db.read();
    return this.db.data.gymBattles;
  }

  // Get all gym participants (for manual badge system)
  async getGymParticipants(): Promise<{ [gymId: string]: { gymId: string; round3Participants: string[] } }> {
    await this.db.read();
    return this.db.data.gymParticipants;
  }

  // Get all gym battle results (for manual badge system)
  async getGymBattleResults(): Promise<{ [battleId: string]: GymBattleResult }> {
    await this.db.read();
    return this.db.data.gymBattleResults;
  }

  // Save user inventory (for manual badge system)
  async saveUserInventory(userId: string, inventory: UserInventory): Promise<void> {
    await this.db.read();
    this.db.data.users[userId] = inventory;
    await this.db.write();
  }

  // Start a new gym battle (admin only)
  async startGymBattle(createdBy: string): Promise<{ success: boolean; message: string; gym?: GymBattle }> {
    await this.db.read();
    
    // Check if there's already an active gym
    if (this.db.data.activeGym) {
      return { success: false, message: 'A gym battle is already active! Wait for it to complete or fail.' };
    }
    
    // Create new gym battle
    const gymId = uuidv4();
    const startTime = Date.now();
    const endTime = startTime + (48 * 60 * 60 * 1000); // 48 hours
    
    // Create first round boss
    const { createGymBoss } = await import('./creatures');
    const round1Boss = createGymBoss(1);
    
    const gym: GymBattle = {
      id: gymId,
      startTime,
      endTime,
      currentRound: 1,
      status: 'active',
      rounds: [{
        roundNumber: 1,
        boss: round1Boss,
        startTime,
        status: 'active',
        participants: []
      }],
      participants: {},
      createdBy
    };
    
    this.db.data.activeGym = gym;
    this.db.data.gymBattles[gymId] = gym;
    
    await this.db.write();
    
    return { success: true, message: 'Gym battle started successfully!', gym };
  }

  // Get current gym round boss
  async getCurrentGymBoss(): Promise<{ boss: any; round: number } | null> {
    await this.db.read();
    
    if (!this.db.data.activeGym) {
      return null;
    }
    
    const currentRound = this.db.data.activeGym.rounds.find(r => r.roundNumber === this.db.data.activeGym!.currentRound);
    if (!currentRound) {
      return null;
    }
    
    return { boss: currentRound.boss, round: currentRound.roundNumber };
  }

  // Check if user can attack gym boss (separate from regular boss)
  async canUserAttackGymBoss(userId: string): Promise<{ canAttack: boolean; remaining: number; cooldownRemaining: number }> {
    await this.db.read();
    
    // Check if there's an active gym
    if (!this.db.data.activeGym) {
      return { canAttack: false, remaining: 0, cooldownRemaining: 0 };
    }
    
    // Check if gym has expired
    if (Date.now() > this.db.data.activeGym.endTime) {
      return { canAttack: false, remaining: 0, cooldownRemaining: 0 };
    }
    
    // Check if user has any alive creatures in their inventory
    const userInventory = this.db.data.users[userId];
    if (!userInventory || !userInventory.creatures || userInventory.creatures.length === 0) {
      return { 
        canAttack: false, 
        remaining: 0, 
        cooldownRemaining: 0 
      };
    }
    
    // Check if user has any alive creatures
    const aliveCreatures = userInventory.creatures.filter(c => c.stats.hp > 0);
    if (aliveCreatures.length === 0) {
      return { 
        canAttack: false, 
        remaining: 0, 
        cooldownRemaining: 0 
      };
    }
    
    // Ensure userGymStats object exists
    if (!this.db.data.userGymStats) {
      this.db.data.userGymStats = {};
    }
    
    const userStats = this.db.data.userGymStats[userId];
    const currentDate = this.getCurrentDate();
    
    // Reset daily stats if needed
    if (!userStats || userStats.lastResetDate !== currentDate) {
      this.db.data.userGymStats[userId] = {
        userId,
        dailyAttacks: 0,
        lastAttackTime: 0,
        lastResetDate: currentDate
      };
      await this.db.write();
    }
    
    const updatedUserStats = this.db.data.userGymStats[userId];
    
    // Check cooldown (30 seconds)
    const now = Date.now();
    const cooldownTime = 30 * 1000; // 30 seconds
    const timeSinceLastAttack = now - updatedUserStats.lastAttackTime;
    const cooldownRemaining = Math.max(0, cooldownTime - timeSinceLastAttack);
    
    // Unlimited attacks as long as user has alive creatures
    return { 
      canAttack: cooldownRemaining === 0, 
      remaining: 999, // Show as unlimited
      cooldownRemaining
    };
  }

  // Update gym boss HP
  async updateGymBossHp(roundNumber: number, newHp: number): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.activeGym) {
      throw new Error('No active gym battle');
    }
    
    const round = this.db.data.activeGym.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) {
      throw new Error(`Round ${roundNumber} not found`);
    }
    
    round.boss.baseStats.hp = newHp;
    
    await this.db.write();
  }

  // Record gym battle attack - SIMPLE: Only track Round 3 participants
  async recordGymBattleAttack(userId: string, roundNumber: number, creatureId: string, damageDealt: number, creatureDied: boolean): Promise<void> {
    await this.db.read();
    
    if (!this.db.data.activeGym) {
      throw new Error('No active gym battle');
    }
    
    const gymId = this.db.data.activeGym.id;
    
    // SIMPLE APPROACH: Only track participants who attack Round 3 boss
    if (roundNumber === 3) {
      if (!this.db.data.gymParticipants) {
        this.db.data.gymParticipants = {};
      }
      
      if (!this.db.data.gymParticipants[gymId]) {
        this.db.data.gymParticipants[gymId] = {
          gymId: gymId,
          round3Participants: []
        };
      }
      
      // Add user to Round 3 participants if not already there
      if (!this.db.data.gymParticipants[gymId].round3Participants.includes(userId)) {
        this.db.data.gymParticipants[gymId].round3Participants.push(userId);
      }
    }
    
    // Record the battle result
    const battleId = uuidv4();
    this.db.data.gymBattleResults[battleId] = {
      gymId: gymId,
      attackerId: userId,
      creatureId,
      roundNumber,
      timestamp: Date.now(),
      damageDealt,
      creatureDied
    };
    
    // Record gym attack for daily limits (separate from boss attacks)
    await this.recordGymAttack(userId, `gym_${roundNumber}`, creatureId, damageDealt, creatureDied);
    
    // Save all changes to the database
    await this.db.write();
  }

  // Complete current gym round and start next round
  async completeGymRound(): Promise<{ success: boolean; message: string; nextRound?: any }> {
    await this.db.read();
    
    if (!this.db.data.activeGym) {
      return { success: false, message: 'No active gym battle' };
    }
    
    const currentRound = this.db.data.activeGym.currentRound;
    const round = this.db.data.activeGym.rounds.find(r => r.roundNumber === currentRound);
    
    if (!round) {
      return { success: false, message: `Round ${currentRound} not found` };
    }
    
    // Mark current round as completed
    round.status = 'completed';
    round.endTime = Date.now();
    
    // Check if this was the final round (round 3)
    if (currentRound === 3) {
      // Gym completed successfully - give badges to all participants BEFORE clearing the gym
      await this.giveGymBadges();
      
      // Store the completed gym battle in gymBattles collection before clearing activeGym
      const completedGym = { ...this.db.data.activeGym };
      completedGym.status = 'completed';
      completedGym.endTime = Date.now();
      
      
      // Ensure gymBattles collection exists
      if (!this.db.data.gymBattles) {
        this.db.data.gymBattles = {};
      }
      
      // Store the completed gym battle
      this.db.data.gymBattles[completedGym.id] = completedGym;
      
      // Clear the active gym
      this.db.data.activeGym = null;
      
      await this.db.write();
      return { success: true, message: 'Gym battle completed successfully! All participants received Boss Badges!' };
    }
    
    // Start next round
    const nextRoundNumber = currentRound + 1;
    const { createGymBoss } = await import('./creatures');
    const nextBoss = createGymBoss(nextRoundNumber);
    
    const nextRound = {
      roundNumber: nextRoundNumber,
      boss: nextBoss,
      startTime: Date.now(),
      status: 'active' as const,
      participants: []
    };
    
    this.db.data.activeGym.rounds.push(nextRound);
    this.db.data.activeGym.currentRound = nextRoundNumber;
    
    await this.db.write();
    
    return { success: true, message: `Round ${currentRound} completed! Starting round ${nextRoundNumber}...`, nextRound };
  }

  // Give gym badges to all participants (DISABLED - Using manual badge system)
  private async giveGymBadges(): Promise<void> {
    if (!this.db.data.activeGym) {
      return;
    }
    
    const gymId = this.db.data.activeGym.id;
    
    // AUTOMATIC BADGE AWARDING DISABLED - Using manual badge system instead
    // Use /checkgymparticipants to see who participated
    // Use /givebadge to manually award badges to deserving users
    
    console.log(`Gym ${gymId} completed - badges can be awarded manually using /checkgymparticipants and /givebadge`);
    
    // No automatic badge awarding - keeping system intact but disabled
  }

  // Check if gym has expired and handle failure
  async checkGymExpiration(): Promise<{ expired: boolean; message?: string }> {
    await this.db.read();
    
    if (!this.db.data.activeGym) {
      return { expired: false };
    }
    
    if (Date.now() > this.db.data.activeGym.endTime) {
      // Gym expired - mark as failed
      this.db.data.activeGym.status = 'failed';
      this.db.data.activeGym = null;
      
      await this.db.write();
      
      return { expired: true, message: 'NOOB! The gym battle has expired without completing all 3 rounds!' };
    }
    
    return { expired: false };
  }

  // Get user's gym inventory (badges)
  async getUserGymInventory(userId: string): Promise<GymBadge[]> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) {
      return [];
    }
    
    return user.gymBadges || [];
  }

  // Record gym attack for daily limits (separate from regular boss attacks)
  async recordGymAttack(userId: string, gymId: string, creatureId: string, damageDealt: number, creatureDied: boolean): Promise<void> {
    await this.db.read();
    
    if (!this.db.data) {
      this.db.data = { 
        users: {}, 
        pendingCreatures: {}, 
        challenges: {}, 
        activeBoss: null, 
        bossBattles: {}, 
        userBossStats: {},
        activeGym: null,
        gymBattles: {},
        gymBattleResults: {},
        gymParticipants: {},
        userGymStats: {}
      };
    }
    
    if (!this.db.data.userGymStats) {
      this.db.data.userGymStats = {};
    }
    
    if (!this.db.data.userGymStats[userId]) {
      this.db.data.userGymStats[userId] = {
        userId,
        dailyAttacks: 0,
        lastAttackTime: 0,
        lastResetDate: this.getCurrentDate()
      };
    }
    
    // Update attack tracking (no daily limit - unlimited attacks as long as user has creatures)
    this.db.data.userGymStats[userId].dailyAttacks++;
    this.db.data.userGymStats[userId].lastAttackTime = Date.now();
    
    await this.db.write();
  }

  // Admin method to reset gym badges for a specific user
  async resetGymBadges(userId: string): Promise<{ success: boolean; message: string; badgesRemoved: number }> {
    await this.db.read();
    
    const user = this.db.data.users[userId];
    if (!user) {
      return { success: false, message: 'User not found', badgesRemoved: 0 };
    }
    
    const badgesRemoved = user.gymBadges.length;
    
    // Reset the gym badges
    user.gymBadges = [];
    
    await this.db.write();
    
    return { 
      success: true, 
      message: `Successfully reset ${badgesRemoved} gym badges for user ${userId}.`,
      badgesRemoved
    };
  }


}

export const storage = new StorageManager();
