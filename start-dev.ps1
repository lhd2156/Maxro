# Maxro dev startup - runs backend + frontend
# Requires: MongoDB - use Atlas (see docs/MONGODB_SETUP.md) or Docker

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# Load .env if it exists
if (Test-Path "$root\.env") {
    Get-Content "$root\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
            Write-Host "Loaded $key"
        }
    }
} else {
    Write-Host "No .env found. Copy .env.example to .env and add MONGODB_URI + GOOGLE_CLIENT_ID" -ForegroundColor Yellow
    Write-Host "See docs/MONGODB_SETUP.md for MongoDB Atlas (no Docker needed)" -ForegroundColor Yellow
}

# Start backend (child inherits env vars from .env)
Write-Host "`nStarting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\maxro-backend'; .\mvnw.cmd spring-boot:run" -WindowStyle Normal

Write-Host "Waiting 30s for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`nStarting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\maxro-frontend'; npm start" -WindowStyle Normal

Write-Host "`nDone! Frontend: http://localhost:4200  |  Backend: http://localhost:8080" -ForegroundColor Cyan
if (-not $env:MONGODB_URI) {
    Write-Host "Add MONGODB_URI to .env (MongoDB Atlas - see docs/MONGODB_SETUP.md)" -ForegroundColor Yellow
}
