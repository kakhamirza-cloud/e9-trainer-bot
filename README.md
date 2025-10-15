# E9 Trainer Bot

A Discord bot for catching and battling E9 creatures, inspired by Pokémon mechanics. Features turn-based combat, creature collection, and strategic gameplay with permanent death mechanics.

[![PM2 Ready](https://img.shields.io/badge/PM2-Ready-green.svg)](https://pm2.keymetrics.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-7289da.svg)](https://discord.js.org/)

## ✨ Features

### 🎮 Core Gameplay
- **Catch System**: Randomly encounter and catch E9 creatures with different rarity tiers (10 attempts per 12 hours)
- **Inventory Management**: View your collection of caught creatures with stats (max 3 creatures)
- **Battle System**: Turn-based battles between users' creatures with proper challenge system (3 daily battles)
- **Leveling System**: Creatures gain experience and level up after winning battles
- **Creature Death**: Creatures that reach 0 HP are permanently removed from inventory
- **Smart Replacement System**: Automatic popup with buttons when catching better tier creatures
- **Challenge System**: Proper user tagging and 1-minute expiration timers
- **Automatic Cleanup**: Smart challenge management prevents stale battle states
- **Adventure System**: Risk losing creatures to find powerful items (5 attempts per 12 hours)
- **Item Usage**: Consume adventure items to permanently boost creature stats
- **Boss Battles**: Community events with rare bosses and Mythical rewards
- **Gym Battles**: 3-round challenges with special badges and achievements
- **Badge System**: Collect gym badges and special achievements

### 🎯 Strategic Elements
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, and Legendary creatures
- **Manual Battle Selection**: Choose which creature to battle with
- **Permanent Consequences**: Death is final - no revival system
- **Resource Management**: Limited inventory space creates strategic decisions
- **Risk vs Reward**: Higher rarity creatures are harder to catch but stronger
- **Smart Upgrades**: Automatic replacement suggestions for better tier creatures

### 🏆 Advanced Features
- **Time Limits**: 10 catches and 10 adventures per 12 hours, 3 battles per day
- **Boss Battles**: Community events with powerful bosses and Mythical rewards
- **Gym Challenges**: 3-round battles with 48-hour time limits
- **Adventure Items**: Find and use items to boost creature stats permanently
- **Badge System**: Collect special badges for participating in gym battles
- **Interactive Buttons**: Click-to-select creatures and manage inventory
- **Smart Notifications**: Proper user tagging and automatic cleanup
- **Admin Tools**: Comprehensive moderation and management commands

## 🐾 E9 Creatures

The bot features all 50 E9 creations with different rarity tiers:

| Rarity | Catch Rate | Count | Description |
|--------|------------|-------|-------------|
| ⚪ **Common** | 60% | 49 | Basic stats, easy to catch |
| 🟢 **Uncommon** | 40% | 14 | Better stats than common |
| 🔵 **Rare** | 25% | 8 | High stats, harder to catch |
| 🟣 **Epic** | 15% | 3 | Very high stats, very rare |
| 🟡 **Legendary** | 5% | 3 | Maximum stats, extremely rare |

### Featured Creatures
- **celeste, byte, snoop, oasys, dayze, ember, byron, melt, lizzy, molten**
- **polar, blanco, sprout, gilly, eighteen, melo, armstrong, gizmo, yum yum, sam**
- **dottie, skittles, rory, sonar, aero, skelly, zap, mushy, pane, tomb**
- **torty, tatters, smoak, fin, bao, geo, mack, scabz, cosmo, fuse**
- **flare, tanky, wasteland, voodoo, swamp, samurai, robot, pepe, medusa**

## 🎮 Commands

### 🎯 Basic Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/catch` | Attempt to catch a random E9 creature (10 attempts per 12 hours) | `/catch` |
| `/inventory` | View your collection of creatures and adventure items | `/inventory` |
| `/help` | Display comprehensive help guide and game information | `/help` |

### ⚔️ Battle Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/battle @user` | Challenge another user to battle with creature selection | `/battle @username` |
| `/accept` | Accept a pending battle challenge | `/accept` |
| `/decline` | Decline a pending battle challenge | `/decline` |
| `/replace <number>` | Legacy command - replacement now automatic with buttons | `/replace 3` |

### 🗺️ Adventure Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/adventure` | Go on an adventure to find items (5 attempts per 12 hours) | `/adventure` |
| `/use <item> <creature>` | Use adventure items to boost creature stats | `/use 1 2` |

### 👹 Boss & Gym Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/spawn` | Spawn a rare boss for the community to fight (Admin only) | `/spawn` |
| `/bossstatus` | Check current boss status and your attack availability (Admin only) | `/bossstatus` |
| `/refreshboss` | Refresh boss status display (Admin only) | `/refreshboss` |
| `/gym` | Start a 3-round gym battle (Admin only) | `/gym` |
| `/gyminventory` | Check your gym badges and achievements | `/gyminventory` |
| `/gymrefresh` | Refresh gym battle status (Admin only) | `/gymrefresh` |

### 🏆 Badge Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/givebadge <role> <badge>` | Give badges to all users with specified role (Admin only) | `/givebadge @role Boss Badge` |
| `/resetbadge @user` | Reset a user's gym badges (Admin only) | `/resetbadge @username` |
| `/resetgyminventory @user` | Reset user's gym inventory keeping best creature (Admin only) | `/resetgyminventory @username` |

### 🔧 Admin Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/resetinventory` | Reset your own inventory | `/resetinventory` |
| `/resetall @user` | Reset any user's inventory (Admin only) | `/resetall @username` |
| `/clearchallenges` | Clear all pending challenges (Admin only) | `/clearchallenges` |
| `/resetdailycatch` | Reset daily catch limits for all users (Admin only) | `/resetdailycatch` |
| `/shutdown` | Gracefully shutdown the bot (Admin only) | `/shutdown` |

### Command Details
- **Catch**: Shows creature stats and rarity on successful catch, 10 attempts per 12 hours
- **Inventory**: Displays all creatures with HP, Attack, Defense, Level, and adventure items
- **Battle**: Interactive creature selection with proper user tagging and 3 daily battles
- **Accept/Decline**: Respond to battle challenges with automatic cleanup and 1-minute timeout
- **Replace**: Legacy command - replacement now handled automatically with buttons
- **Adventure**: Risk losing a creature to find powerful items, 5 attempts per 12 hours
- **Use**: Consume adventure items to permanently boost creature stats
- **Boss/Gym**: Community events with special rewards and Mythical creatures
- **Admin Commands**: Reset inventories, clear challenges, and manage the bot

### 🎯 Smart Replacement System
When you catch a creature with a full inventory (3/3):
- **Better Tier**: Automatic popup with replacement buttons
- **Same/Lower Tier**: Creature automatically released
- **Interactive Buttons**: Click to replace or cancel
- **1-minute timeout**: Auto-cancels if no choice made

### 🔄 Replacement Examples

**Example 1 - Better Tier Caught:**
```
User has: [Common, Uncommon, Rare]
Catches: Epic creature
Result: Buttons appear to replace Common/Uncommon creatures
```

**Example 2 - Same/Lower Tier:**
```
User has: [Rare, Epic, Legendary]  
Catches: Uncommon creature
Result: Creature automatically released (not better)
```

**Example 3 - User Choice:**
```
User catches better creature → Buttons appear
Options: [Replace #1] [Replace #2] [Cancel]
User clicks "Cancel" → New creature released
```

### ⚔️ Battle System Features

**Challenge Process:**
1. **`/battle @user`** - Challenge another user
2. **Creature Selection** - Choose your battle creature with interactive buttons
3. **Challenge Notification** - Proper user tagging with @mentions
4. **Response Options** - Opponent can `/accept` or `/decline`
5. **Automatic Cleanup** - Challenges expire after 1 minute

**Battle Features:**
- **Interactive Selection**: Click buttons to choose creatures
- **Proper Tagging**: @mentions notify the challenged user
- **Expiration Timer**: 1-minute timeout prevents stale challenges
- **Automatic Cleanup**: Smart challenge management
- **Death Messages**: Clear notifications showing whose creature died
- **Level Up System**: Winners gain experience and level up

**Admin Tools:**
- **`/clearchallenges`** - Clear all pending challenges
- **`/resetall @user`** - Reset any user's inventory
- **Automatic Cleanup** - Removes expired and completed challenges

## 🚀 Setup

### Prerequisites
- Node.js 18+ 
- Discord Bot Token
- PM2 (for production)

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GUILD_ID=your_discord_guild_id_here
   ```

3. **Register Commands**
   ```bash
   npm run register
   ```

4. **Start the Bot**

   **Development Mode:**
   ```bash
   npm run dev
   ```

   **Production Mode (Recommended):**
   ```bash
   npm run build
   npm run pm2:start
   ```

   **Windows (Easy Start):**
   ```bash
   start.bat
   ```

### 🔧 PM2 Management

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start the bot |
| `npm run pm2:stop` | Stop the bot |
| `npm run pm2:restart` | Restart the bot |
| `npm run pm2:delete` | Remove from PM2 |
| `npm run pm2:logs` | View logs |
| `npm run pm2:status` | Check status |
| `npm run pm2:monit` | Open dashboard |

## 🔐 Bot Permissions

Make sure your bot has the following permissions in your Discord server:
- ✅ Send Messages
- ✅ Use Slash Commands
- ✅ Embed Links
- ✅ Read Message History
- ✅ Add Reactions (optional)

### Discord Developer Portal Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token to your `.env` file
5. Go to "OAuth2" > "URL Generator"
6. Select "bot" and "applications.commands" scopes
7. Select the permissions listed above
8. Use the generated URL to invite your bot

## 🎯 Game Mechanics

### 🎣 Catching System
- **Base catch rate**: 50%, modified by creature rarity
- **Individual rates**: Each creature has unique catch difficulty
- **Rarity scaling**: Rarer creatures are harder to catch but stronger
- **Inventory limit**: Maximum 3 creatures per user
- **Smart replacement**: Automatic popup with buttons for better tier creatures

### ⚔️ Battle System
- **Turn-based combat** with interactive creature selection
- **Challenge system**: Proper user tagging and expiration timers
- **Damage formula**: `attack - defense/2 + random(-5 to +5)`
- **Winner rewards**: Creature levels up with stat increases
- **💀 Permanent Death**: Creatures reaching 0 HP are removed forever
- **Strategy**: Use `/battle @user` to challenge with creature selection buttons

### 📈 Leveling & Progression
- **Experience gain**: Win battles to gain XP
- **Stat increases**: HP, Attack, and Defense improve on level up
- **Power scaling**: Higher level creatures dominate battles
- **Risk management**: Protect your strongest creatures

### 📦 Inventory Management
- **3-creature limit** creates strategic decisions
- **Smart replacement**: Automatic buttons when catching better tier creatures
- **Death cleanup**: Dead creatures automatically removed
- **Collection display**: View all creatures with `/inventory`
- **Tier comparison**: Only better tier creatures trigger replacement options

## 💾 Data Storage

User data is stored in `data/database.json` using LowDB:
- **User inventories**: All caught creatures and stats
- **Creature progression**: Levels, experience, and battle history
- **Battle statistics**: Wins, losses, and total battles
- **Pending creatures**: Temporary storage for replacement system

## 🛠️ Development

### Tech Stack
- **TypeScript 5.3+**: Full type safety and modern JavaScript features
- **Discord.js v14**: Latest Discord API with slash commands
- **LowDB**: Lightweight JSON database for persistence
- **PM2**: Production-ready process management
- **Node.js 18+**: Modern runtime environment

### Architecture
- **Modular Design**: Easy to extend with new features
- **Command System**: Clean separation of commands and logic
- **Storage Layer**: Abstracted data management
- **Type Safety**: Full TypeScript coverage

## 🚀 PM2 Benefits

### Production Features
- **🔄 Auto-restart**: Automatically restarts if the bot crashes
- **📝 Logging**: Centralized log management with rotation
- **📊 Monitoring**: Real-time monitoring and performance metrics
- **⚡ Zero-downtime**: Restart without losing connections
- **🧠 Memory management**: Automatic memory limit handling (1GB)
- **🔧 Startup scripts**: Auto-start on system boot

### Management Tools
- **Dashboard**: `npm run pm2:monit` for visual monitoring
- **Logs**: `npm run pm2:logs` for real-time log viewing
- **Status**: `npm run pm2:status` for process health
- **Control**: Easy start/stop/restart commands

## 🔮 Future Features

### Recently Added ✨
- **🎯 Smart Replacement System**: Automatic popup with buttons for better tier creatures
- **🔄 Interactive Buttons**: Click-to-replace or cancel options
- **⚡ Tier Comparison**: Only better creatures trigger replacement
- **⏰ Auto-timeout**: 1-minute timeout for replacement decisions
- **⚔️ Enhanced Battle System**: Proper user tagging and challenge management
- **🏷️ User Mentions**: @mentions in challenge notifications
- **🧹 Automatic Cleanup**: Smart challenge expiration and cleanup
- **👑 Admin Commands**: Reset inventories and clear challenges
- **💀 Death Notifications**: Clear messages showing whose creature died

### Planned Updates
- **🔄 Evolution System**: `/evolve` command for high-level creatures
- **🤝 Trading System**: `/trade` command for creature trading between users
- **⚡ Battle Abilities**: Special moves and creature abilities
- **🏆 Leaderboards**: Global rankings and achievements
- **🎁 Daily Rewards**: Login bonuses and special events
- **🎨 Creature Variants**: Shiny/alternate forms
- **🏰 Guild Battles**: Team-based combat system
- **📊 Statistics**: Detailed battle and collection analytics

### Community Features
- **Tournaments**: Automated tournament system
- **Seasonal Events**: Limited-time creatures and rewards
- **Achievement System**: Unlock rewards for milestones
- **Social Features**: Friend lists and creature sharing

---

## 📄 License

MIT License - Feel free to use, modify, and distribute!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

**Made with ❤️ for the E9 community**
