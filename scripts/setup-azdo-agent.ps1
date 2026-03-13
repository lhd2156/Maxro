param(
    [Parameter(Mandatory = $true)]
    [string]$Pat,

    [string]$OrganizationUrl = "https://dev.azure.com/louisdo",
    [string]$Pool = "Default",
    [string]$AgentRoot = "C:\azagent",
    [string]$AgentName = "$env:COMPUTERNAME-maxro"
)

$ErrorActionPreference = "Stop"

function Get-BasicAuthHeader([string]$Token) {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes(":" + $Token)
    return "Basic " + [Convert]::ToBase64String($bytes)
}

function Get-LatestAgentPackage([string]$OrgUrl, [string]$Token) {
    $headers = @{ Authorization = Get-BasicAuthHeader $Token }
    $uri = "$OrgUrl/_apis/distributedtask/packages/agent?platform=win-x64&top=1"
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    if (-not $response.value -or $response.count -lt 1) {
        throw "Unable to fetch the latest Azure Pipelines agent package."
    }
    return $response.value[0].downloadUrl
}

if (-not (Test-Path $AgentRoot)) {
    New-Item -ItemType Directory -Path $AgentRoot | Out-Null
}

$packageUrl = Get-LatestAgentPackage -OrgUrl $OrganizationUrl -Token $Pat
$zipPath = Join-Path $AgentRoot "agent.zip"

Write-Host "Downloading Azure Pipelines agent package..."
Invoke-WebRequest -Uri $packageUrl -OutFile $zipPath

Write-Host "Extracting agent..."
Expand-Archive -Path $zipPath -DestinationPath $AgentRoot -Force
Remove-Item $zipPath -Force

Push-Location $AgentRoot
try {
    Write-Host "Configuring self-hosted agent $AgentName..."
    & .\config.cmd `
        --unattended `
        --url $OrganizationUrl `
        --auth pat `
        --token $Pat `
        --pool $Pool `
        --agent $AgentName `
        --replace `
        --acceptTeeEula

    Write-Host ""
    Write-Host "Agent configured successfully."
    Write-Host "Start it with: $AgentRoot\run.cmd"
    Write-Host "If you want it as a Windows service later, rerun config.cmd as Administrator and use the service options."
}
finally {
    Pop-Location
}
