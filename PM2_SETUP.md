# PM2 Setup Guide for E9 Trainer Bot

## ✅ PM2 is Ready!

Your E9 Trainer Bot is fully configured to run with PM2. Here's everything you need to know:

## Quick Start

1. **Set up your environment variables** (create `.env` file):
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GUILD_ID=your_discord_guild_id_here
   ```

2. **Register slash commands**:
   ```bash
   npm run register
   ```

3. **Start the bot with PM2**:
   ```bash
   npm run pm2:start
   ```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start the bot with PM2 |
| `npm run pm2:stop` | Stop the bot |
| `npm run pm2:restart` | Restart the bot |
| `npm run pm2:delete` | Remove bot from PM2 |
| `npm run pm2:logs` | View real-time logs |
| `npm run pm2:status` | Check bot status |
| `npm run pm2:monit` | Open monitoring dashboard |

## Windows Batch Files

For easy management on Windows:
- **`start.bat`** - Build and start the bot
- **`stop.bat`** - Stop the bot

## PM2 Configuration

The bot is configured with:
- **Auto-restart** on crashes
- **Memory limit**: 1GB
- **Logging**: Centralized in `logs/` folder
- **Environment**: Production mode
- **Single instance** (recommended for Discord bots)

## Log Files

Logs are stored in the `logs/` folder:
- `combined.log` - All logs combined
- `out.log` - Standard output
- `error.log` - Error logs only

## Monitoring

Use `npm run pm2:monit` to open the PM2 monitoring dashboard where you can see:
- CPU and memory usage
- Logs in real-time
- Process status
- Restart counts

## Auto-Start on Boot

To make the bot start automatically when your computer boots:

```bash
pm2 startup
pm2 save
```

## Troubleshooting

1. **Bot won't start**: Check your `.env` file has the correct Discord token
2. **Commands not working**: Run `npm run register` to register slash commands
3. **High memory usage**: The bot will auto-restart if it exceeds 1GB
4. **Logs not showing**: Check the `logs/` folder for log files

## Production Tips

- Always use PM2 for production (not `npm start`)
- Monitor logs regularly with `npm run pm2:logs`
- Set up log rotation if running long-term
- Consider using PM2's clustering for high-traffic bots

Your bot is ready to run with PM2! 🚀
