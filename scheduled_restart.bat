@echo off
cd /d "D:\Cursor Project\Trainer"
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "restart_all_pm2.ps1" > "logs\scheduled_restart_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log" 2>&1












