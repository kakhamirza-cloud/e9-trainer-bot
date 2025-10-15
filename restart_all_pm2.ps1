# PM2 Scheduled Restart Script
# This script restarts all PM2 processes for all projects

Write-Host "Starting scheduled PM2 restart at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')" -ForegroundColor Green

# Function to restart PM2 processes in a specific directory
function Restart-PM2Project {
    param(
        [string]$ProjectPath,
        [string]$ProjectName,
        [string]$PM2ProcessName
    )
    
    Write-Host "Processing $ProjectName..." -ForegroundColor Yellow
    
    if (Test-Path $ProjectPath) {
        Set-Location $ProjectPath
        
        # Check if package.json exists and has PM2 scripts
        if (Test-Path "package.json") {
            $packageContent = Get-Content "package.json" -Raw | ConvertFrom-Json
            
            # Check for PM2 restart script
            if ($packageContent.scripts -and $packageContent.scripts."pm2:restart") {
                Write-Host "  Found PM2 restart script for $ProjectName" -ForegroundColor Green
                
                # Check if PM2 process exists
                $pm2Output = pm2 list 2>&1
                $processExists = $pm2Output -match $PM2ProcessName
                
                if ($processExists) {
                    try {
                        # Run PM2 restart
                        npm run pm2:restart
                        Write-Host "  Successfully restarted $ProjectName" -ForegroundColor Green
                    }
                    catch {
                        $errorMsg = $_.Exception.Message
                        Write-Host "  Failed to restart $ProjectName - $errorMsg" -ForegroundColor Red
                    }
                }
                else {
                    Write-Host "  PM2 process '$PM2ProcessName' not found, trying to start..." -ForegroundColor Yellow
                    try {
                        # Try to start the process instead
                        npm run pm2:start
                        Write-Host "  Successfully started $ProjectName" -ForegroundColor Green
                    }
                    catch {
                        $errorMsg = $_.Exception.Message
                        Write-Host "  Failed to start $ProjectName - $errorMsg" -ForegroundColor Red
                    }
                }
            }
            else {
                Write-Host "  No PM2 restart script found for $ProjectName" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  No package.json found for $ProjectName" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  Project path not found: $ProjectPath" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Define all project paths with their PM2 process names
$projects = @(
    @{ Path = "D:\Cursor Project\Glyphs Bot 1"; Name = "Glyphs Bot 1"; PM2Name = "glyphs-bot" },
    @{ Path = "D:\Cursor Project\Glyphs Bot Game"; Name = "Glyphs Bot Game"; PM2Name = "glyphs-mining-bot" },
    @{ Path = "D:\Cursor Project\Trainer"; Name = "E9 Trainer Bot"; PM2Name = "e9-trainer-bot" }
)

Write-Host "Found $($projects.Count) projects to restart" -ForegroundColor Cyan
Write-Host ""

# Restart each project
foreach ($project in $projects) {
    Restart-PM2Project -ProjectPath $project.Path -ProjectName $project.Name -PM2ProcessName $project.PM2Name
}

# Show final PM2 status
Write-Host "Final PM2 Status:" -ForegroundColor Cyan
pm2 list

Write-Host ""
Write-Host "Scheduled PM2 restart completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')" -ForegroundColor Green