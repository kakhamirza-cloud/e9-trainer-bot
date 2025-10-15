# PM2 Scheduled Restart Setup Guide

## 🎯 Overview
This guide will help you set up automatic PM2 restarts for all your bot projects at 5:30 AM and 5:30 PM UTC.

## 📁 Files Created
- `restart_all_pm2.ps1` - Main restart script
- `scheduled_restart.bat` - Batch file for Task Scheduler
- `setup_scheduled_tasks.ps1` - Setup script (requires admin)

## 🚀 Manual Setup (Recommended)

### Step 1: Open Task Scheduler
1. Press `Windows + R`
2. Type `taskschd.msc` and press Enter
3. Or search "Task Scheduler" in Start Menu

### Step 2: Create First Task (5:30 AM UTC)
1. Click "Create Basic Task..." in the right panel
2. **Name**: `PM2 Restart - 5:30 AM UTC`
3. **Description**: `Automatically restart all PM2 processes for bot projects`
4. Click "Next"

5. **Trigger**: Daily
6. Click "Next"

7. **Start**: `5:30:00 AM`
8. **Recur every**: `1 days`
9. Click "Next"

10. **Action**: Start a program
11. Click "Next"

12. **Program/script**: `D:\Cursor Project\Trainer\scheduled_restart.bat`
13. **Start in**: `D:\Cursor Project\Trainer`
14. Click "Next"

15. Check "Open the Properties dialog for this task when I click Finish"
16. Click "Finish"

17. In Properties dialog:
    - Check "Run whether user is logged on or not"
    - Check "Run with highest privileges"
    - Click "OK"

### Step 3: Create Second Task (5:30 PM UTC)
Repeat Step 2 with these changes:
- **Name**: `PM2 Restart - 5:30 PM UTC`
- **Start**: `5:30:00 PM`

## 🧪 Testing

### Test the Script Manually
```cmd
cd "D:\Cursor Project\Trainer"
scheduled_restart.bat
```

### Test a Scheduled Task
1. Open Task Scheduler
2. Find your task
3. Right-click → "Run"
4. Check the logs in `D:\Cursor Project\Trainer\logs\`

## 📊 What Gets Restarted
- **Glyphs Bot 1** (glyphs-bot)
- **Glyphs Bot Game** (glyphs-mining-bot)  
- **E9 Trainer Bot** (e9-trainer-bot)

## 📝 Logs
Logs are saved to: `D:\Cursor Project\Trainer\logs\scheduled_restart_YYYYMMDD_HHMMSS.log`

## 🔧 Troubleshooting

### If Tasks Don't Run
1. Check Task Scheduler → Task Scheduler Library
2. Look for errors in the "Last Run Result" column
3. Check the logs in the logs directory

### If Script Fails
1. Run `scheduled_restart.bat` manually to see errors
2. Check that all project paths exist
3. Verify PM2 is installed and accessible

### Permission Issues
- Make sure the task runs with "highest privileges"
- Check that the batch file path is correct
- Verify the user account has access to the project directories

## ✅ Verification
After setup, you should see:
- 2 tasks in Task Scheduler
- Logs being created in the logs directory
- All PM2 processes restarting at scheduled times

## 🎯 Benefits
- **Automatic maintenance** - No manual restarts needed
- **Memory cleanup** - Prevents memory leaks
- **Uptime reliability** - Keeps bots running smoothly
- **Logging** - Track restart history and any issues












