# Setup Windows Task Scheduler for PM2 Restarts
# This script creates scheduled tasks for 5:30 AM and 5:30 PM UTC

Write-Host "Setting up scheduled PM2 restart tasks..." -ForegroundColor Green

# Create logs directory if it doesn't exist
$logsDir = "D:\Cursor Project\Trainer\logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force
    Write-Host "Created logs directory: $logsDir" -ForegroundColor Yellow
}

# Define task details
$taskName1 = "PM2 Restart - 5:30 AM UTC"
$taskName2 = "PM2 Restart - 5:30 PM UTC"
$taskDescription = "Automatically restart all PM2 processes for bot projects"
$scriptPath = "D:\Cursor Project\Trainer\scheduled_restart.bat"

# Create the first task (5:30 AM UTC)
try {
    $action1 = New-ScheduledTaskAction -Execute $scriptPath
    $trigger1 = New-ScheduledTaskTrigger -Daily -At "5:30AM"
    $settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal1 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName $taskName1 -Action $action1 -Trigger $trigger1 -Settings $settings1 -Principal $principal1 -Description $taskDescription -Force
    
    Write-Host "✅ Created task: $taskName1" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create task: $taskName1 - $($_.Exception.Message)" -ForegroundColor Red
}

# Create the second task (5:30 PM UTC)
try {
    $action2 = New-ScheduledTaskAction -Execute $scriptPath
    $trigger2 = New-ScheduledTaskTrigger -Daily -At "5:30PM"
    $settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal2 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName $taskName2 -Action $action2 -Trigger $trigger2 -Settings $settings2 -Principal $principal2 -Description $taskDescription -Force
    
    Write-Host "✅ Created task: $taskName2" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create task: $taskName2 - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Task Summary:" -ForegroundColor Cyan
Write-Host "• Task 1: $taskName1" -ForegroundColor White
Write-Host "• Task 2: $taskName2" -ForegroundColor White
Write-Host "• Script: $scriptPath" -ForegroundColor White
Write-Host "• Logs: $logsDir" -ForegroundColor White

Write-Host ""
Write-Host "🔍 To verify tasks, run:" -ForegroundColor Yellow
Write-Host "Get-ScheduledTask -TaskName '*PM2 Restart*'" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Scheduled task setup completed!" -ForegroundColor Green












