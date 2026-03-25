param(
    [string]$TaskName = "Maxro Azure DevOps Agent",
    [string]$AgentRoot = "C:\azagent",
    [switch]$StartNow
)

$ErrorActionPreference = "Stop"

$runnerScript = Join-Path $PSScriptRoot "run-azdo-agent.ps1"
if (-not (Test-Path $runnerScript)) {
    throw "Agent launcher script not found at $runnerScript"
}

$agentRunCmd = Join-Path $AgentRoot "run.cmd"
if (-not (Test-Path $agentRunCmd)) {
    throw "Azure DevOps agent is not configured at $AgentRoot"
}

$currentUser = "{0}\{1}" -f $env:USERDOMAIN, $env:USERNAME
$encodedRunner = $runnerScript.Replace('"', '""')
$encodedAgentRoot = $AgentRoot.Replace('"', '""')

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoLogo -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ""$encodedRunner"" -AgentRoot ""$encodedAgentRoot"""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Days 30) `
    -MultipleInstances IgnoreNew `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId $currentUser `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName' to start the Azure DevOps agent at logon."

if ($StartNow) {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Started scheduled task '$TaskName'."
}
