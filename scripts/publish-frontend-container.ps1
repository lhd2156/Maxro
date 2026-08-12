[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ArtifactDirectory,
    [Parameter(Mandatory = $true)][string]$NginxConfigPath,
    [Parameter(Mandatory = $true)][string]$RegistryName,
    [string]$Repository = 'maxro-frontend',
    [string]$BaseTag = 'runtime-base',
    [Parameter(Mandatory = $true)][string]$ImageTag,
    [string]$CraneVersion = 'v0.21.9'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if (-not (Test-Path -LiteralPath (Join-Path $ArtifactDirectory 'index.html'))) {
    throw "Frontend artifact does not contain index.html: $ArtifactDirectory"
}
if (-not (Test-Path -LiteralPath $NginxConfigPath)) {
    throw "Nginx config does not exist: $NginxConfigPath"
}

[void](Get-Command az -ErrorAction Stop)
[void](Get-Command tar.exe -ErrorAction Stop)

$registryHost = "$RegistryName.azurecr.io"
$imageRef = "$registryHost/${Repository}:$ImageTag"
$baseRef = "$registryHost/${Repository}:$BaseTag"
$workingDirectory = Join-Path ([IO.Path]::GetTempPath()) ("maxro-static-image-" + [guid]::NewGuid().ToString('N'))
$archiveName = 'go-containerregistry_Windows_x86_64.tar.gz'
$releaseRoot = "https://github.com/google/go-containerregistry/releases/download/$CraneVersion"
$crane = $null
$previousDockerConfig = $env:DOCKER_CONFIG

try {
    $toolDirectory = Join-Path $workingDirectory 'tools'
    $dockerConfigDirectory = Join-Path $workingDirectory 'docker-config'
    $layerRoot = Join-Path $workingDirectory 'layer'
    $htmlDirectory = Join-Path $layerRoot 'usr\share\nginx\html'
    $nginxDirectory = Join-Path $layerRoot 'etc\nginx\conf.d'
    New-Item -ItemType Directory -Path $toolDirectory, $dockerConfigDirectory, $htmlDirectory, $nginxDirectory -Force | Out-Null
    $env:DOCKER_CONFIG = $dockerConfigDirectory

    $archivePath = Join-Path $workingDirectory $archiveName
    $checksumsPath = Join-Path $workingDirectory 'checksums.txt'
    Invoke-WebRequest -UseBasicParsing -Uri "$releaseRoot/$archiveName" -OutFile $archivePath
    Invoke-WebRequest -UseBasicParsing -Uri "$releaseRoot/checksums.txt" -OutFile $checksumsPath

    $checksumLine = Get-Content -LiteralPath $checksumsPath |
        Where-Object { $_ -match ("\s" + [regex]::Escape($archiveName) + '$') } |
        Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace($checksumLine)) {
        throw "No checksum was published for $archiveName."
    }
    $expectedHash = ($checksumLine -split '\s+')[0].ToUpperInvariant()
    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $expectedHash) {
        throw "Crane checksum mismatch. Expected $expectedHash but received $actualHash."
    }

    & tar.exe -xzf $archivePath -C $toolDirectory
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to extract crane.'
    }
    $crane = Join-Path $toolDirectory 'crane.exe'
    if (-not (Test-Path -LiteralPath $crane)) {
        throw 'crane.exe was not present in the verified release archive.'
    }

    $baseExists = az acr repository show `
        --name $RegistryName `
        --image "${Repository}:$BaseTag" `
        --query name -o tsv 2>$null
    if ([string]::IsNullOrWhiteSpace($baseExists)) {
        Write-Host "Seeding $baseRef from nginx:alpine."
        az acr import `
            --name $RegistryName `
            --source docker.io/library/nginx:alpine `
            --image "${Repository}:$BaseTag" `
            --only-show-errors
        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to seed the frontend runtime base image.'
        }
    }

    # Hide all static files from the base layer before adding the new Angular bundle.
    New-Item -ItemType File -Path (Join-Path $htmlDirectory '.wh..wh..opq') -Force | Out-Null
    Get-ChildItem -LiteralPath $ArtifactDirectory -Force | Copy-Item -Destination $htmlDirectory -Recurse -Force
    Copy-Item -LiteralPath $NginxConfigPath -Destination (Join-Path $nginxDirectory 'default.conf') -Force

    $layerPath = Join-Path $workingDirectory 'frontend-layer.tar'
    & tar.exe -cf $layerPath -C $layerRoot .
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to create the frontend OCI layer.'
    }

    az acr update --name $RegistryName --admin-enabled true --only-show-errors 1>$null
    $acrUsername = az acr credential show --name $RegistryName --query username -o tsv
    $acrPassword = az acr credential show --name $RegistryName --query 'passwords[0].value' -o tsv
    if ([string]::IsNullOrWhiteSpace($acrUsername) -or [string]::IsNullOrWhiteSpace($acrPassword)) {
        throw "Unable to resolve credentials for $registryHost."
    }

    & $crane auth login $registryHost --username $acrUsername --password $acrPassword
    if ($LASTEXITCODE -ne 0) {
        throw 'Registry login failed.'
    }
    & $crane append `
        --platform linux/amd64 `
        --base $baseRef `
        --new_layer $layerPath `
        --new_tag $imageRef
    if ($LASTEXITCODE -ne 0) {
        throw 'Publishing the frontend image failed.'
    }
    & $crane validate --remote $imageRef
    if ($LASTEXITCODE -ne 0) {
        throw 'The published frontend image failed OCI validation.'
    }
    & $crane tag $imageRef latest
    if ($LASTEXITCODE -ne 0) {
        throw 'Publishing the latest frontend tag failed.'
    }

    Write-Host "Published $imageRef"
    Write-Output $imageRef
}
finally {
    Remove-Variable acrPassword -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($previousDockerConfig)) {
        Remove-Item Env:DOCKER_CONFIG -ErrorAction SilentlyContinue
    } else {
        $env:DOCKER_CONFIG = $previousDockerConfig
    }
    if (Test-Path -LiteralPath $workingDirectory) {
        Remove-Item -LiteralPath $workingDirectory -Recurse -Force
    }
}
