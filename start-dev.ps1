# Maxro dev startup - brings up MongoDB, backend, and frontend in one command

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backendDir = Join-Path $root "maxro-backend"
$frontendDir = Join-Path $root "maxro-frontend"

function Load-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        Write-Host "No .env found. Using defaults where possible." -ForegroundColor Yellow
        Write-Host "See docs/MONGODB_SETUP.md if you want to use MongoDB Atlas instead of local Docker." -ForegroundColor Yellow
        return $false
    }

    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
            Write-Host "Loaded $key"
        }
    }

    return $true
}

function Test-TcpPort {
    param(
        [string]$HostName = "127.0.0.1",
        [int]$Port,
        [int]$TimeoutMs = 1000
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            return $false
        }

        $null = $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Wait-ForTcpPort {
    param(
        [string]$HostName = "127.0.0.1",
        [int]$Port,
        [int]$TimeoutSeconds = 60,
        [string]$Label
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort -HostName $HostName -Port $Port) {
            Write-Host "$Label is ready on ${HostName}:$Port" -ForegroundColor Green
            return $true
        }

        Start-Sleep -Seconds 2
    }

    Write-Host "$Label did not become ready on ${HostName}:$Port within $TimeoutSeconds seconds." -ForegroundColor Yellow
    return $false
}

function Get-DockerDesktopPath {
    $candidates = @(
        (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
        (Join-Path $env:LocalAppData "Programs\Docker\Docker\Docker Desktop.exe")
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Test-DockerReady {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }

    try {
        $null = & docker info 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Ensure-DockerReady {
    if (Test-DockerReady) {
        return $true
    }

    $dockerDesktop = Get-DockerDesktopPath
    if (-not $dockerDesktop) {
        Write-Host "Docker CLI is installed, but Docker Desktop was not found." -ForegroundColor Yellow
        return $false
    }

    Write-Host "`nStarting Docker Desktop..." -ForegroundColor Green
    Start-Process $dockerDesktop | Out-Null

    Write-Host "Waiting for Docker engine..." -ForegroundColor Yellow
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if (Test-DockerReady) {
            Write-Host "Docker engine is ready." -ForegroundColor Green
            return $true
        }

        Start-Sleep -Seconds 3
    }

    Write-Host "Docker engine did not become ready in time." -ForegroundColor Yellow
    return $false
}

function Uses-LocalMongo {
    if (-not $env:MONGODB_URI) {
        return $true
    }

    return ($env:MONGODB_URI -match '^mongodb://(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:/|$)')
}

function Ensure-LocalMongo {
    if (Test-TcpPort -Port 27017) {
        Write-Host "MongoDB is already running on localhost:27017" -ForegroundColor Green
        return $true
    }

    if (-not (Ensure-DockerReady)) {
        Write-Host "MongoDB is not running and Docker could not be started." -ForegroundColor Yellow
        return $false
    }

    Write-Host "`nStarting MongoDB..." -ForegroundColor Green
    & docker start maxro-mongo *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Started existing maxro-mongo container." -ForegroundColor Green
    } else {
        & docker compose up -d mongodb
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Unable to start MongoDB with docker compose." -ForegroundColor Yellow
            return $false
        }
    }

    return (Wait-ForTcpPort -Port 27017 -TimeoutSeconds 45 -Label "MongoDB")
}

function Start-ServiceWindow {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command,
        [int]$Port
    )

    if (Test-TcpPort -Port $Port) {
        Write-Host "$Name is already running on port $Port" -ForegroundColor Green
        return
    }

    Write-Host "`nStarting $Name..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; $Command" -WindowStyle Normal | Out-Null
}

Load-DotEnv -Path (Join-Path $root ".env") | Out-Null

if (Uses-LocalMongo) {
    if (-not (Ensure-LocalMongo)) {
        Write-Host "Backend needs MongoDB on localhost:27017, but it could not be started." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Using remote MongoDB from MONGODB_URI." -ForegroundColor Green
}

Start-ServiceWindow -Name "backend" -WorkingDirectory $backendDir -Command ".\\mvnw.cmd spring-boot:run" -Port 8080
$backendReady = Wait-ForTcpPort -Port 8080 -TimeoutSeconds 75 -Label "Backend"
if (-not $backendReady) {
    Write-Host "Backend is still not listening on port 8080. Check the backend window for startup errors." -ForegroundColor Yellow
}

Start-ServiceWindow -Name "frontend" -WorkingDirectory $frontendDir -Command "npm start" -Port 4200
$frontendReady = Wait-ForTcpPort -Port 4200 -TimeoutSeconds 75 -Label "Frontend"
if (-not $frontendReady) {
    Write-Host "Frontend is still not listening on port 4200. Check the frontend window for startup errors." -ForegroundColor Yellow
}

Write-Host "`nDev startup summary" -ForegroundColor Cyan
if (Test-TcpPort -Port 27017) {
    Write-Host "MongoDB:  localhost:27017" -ForegroundColor Cyan
}
if (Test-TcpPort -Port 8080) {
    Write-Host "Backend:  http://localhost:8080" -ForegroundColor Cyan
}
if (Test-TcpPort -Port 4200) {
    Write-Host "Frontend: http://127.0.0.1:4200" -ForegroundColor Cyan
}



