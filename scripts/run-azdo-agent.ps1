param(
    [string]$AgentRoot = "C:\azagent"
)

$ErrorActionPreference = "Stop"

$runCmd = Join-Path $AgentRoot "run.cmd"
$listenerPath = Join-Path $AgentRoot "bin\Agent.Listener.exe"

if (-not (Test-Path $runCmd)) {
    throw "Azure DevOps agent runner not found at $runCmd"
}

$normalizedListenerPath = [IO.Path]::GetFullPath($listenerPath)
$runningAgent = Get-CimInstance Win32_Process -Filter "Name='Agent.Listener.exe'" |
    Where-Object {
        $_.ExecutablePath -and
        ([IO.Path]::GetFullPath($_.ExecutablePath) -ieq $normalizedListenerPath)
    } |
    Select-Object -First 1

if ($runningAgent) {
    Write-Host "Azure DevOps agent is already running from $AgentRoot."
    exit 0
}

Push-Location $AgentRoot
try {
    & $runCmd
}
finally {
    Pop-Location
}
