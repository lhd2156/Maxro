[CmdletBinding()]
param(
    [string]$EnvFile = (Join-Path (Split-Path $PSScriptRoot -Parent) '.env'),
    [string]$SubscriptionId = '',
    [string]$ResourceGroup = 'maxro-rg',
    [string]$Location = 'centralus',
    [string]$AcrName = '',
    [string]$CosmosAccountName = '',
    [string]$MongoDatabaseName = 'maxro',
    [string]$ContainerAppEnvironment = 'maxro-env',
    [string]$BackendAppName = 'maxro-backend',
    [string]$FrontendAppName = 'maxro-web',
    [string]$FrontendImageName = 'maxro-frontend',
    [string]$DomainName = 'gomaxro.com',
    [string]$ApiHostname = 'api.gomaxro.com',
    [string]$WwwHostname = 'www.gomaxro.com',
    [ValidateSet('auto', 'none', 'namecheap')]
    [string]$DnsProvider = 'auto',
    [switch]$UseConfiguredMongoUri,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipDns
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step([string]$Message) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}

function Import-DotEnv {
    param([Parameter(Mandatory = $true)][string]$Path)

    $values = @{}
    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf('=')
        if ($separatorIndex -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1)
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$key] = $value
    }

    return $values
}

function Get-ConfigValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [string]$Default = '',
        [switch]$Required
    )

    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value) -and $script:DotEnv.ContainsKey($Name)) {
        $value = [string]$script:DotEnv[$Name]
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        $value = $Default
    }

    if ($Required -and [string]::IsNullOrWhiteSpace($value)) {
        throw "Missing required value '$Name'. Set it in '$EnvFile' or in the process environment."
    }

    return [string]$value
}

function Get-PropertyValue {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string[]]$Paths
    )

    foreach ($path in $Paths) {
        $current = $Object
        $resolved = $true
        foreach ($segment in ($path -split '\.')) {
            if ($null -eq $current) {
                $resolved = $false
                break
            }

            if ($current -is [System.Array] -or $current -is [System.Collections.IList]) {
                $index = 0
                if (-not [int]::TryParse($segment, [ref]$index)) {
                    $resolved = $false
                    break
                }
                if ($index -lt 0 -or $index -ge $current.Count) {
                    $resolved = $false
                    break
                }
                $current = $current[$index]
                continue
            }

            if ($current -is [System.Collections.IDictionary]) {
                if ($current.Contains($segment)) {
                    $current = $current[$segment]
                } else {
                    $resolved = $false
                    break
                }
            } else {
                $property = $current.PSObject.Properties[$segment]
                if ($null -eq $property) {
                    $resolved = $false
                    break
                }
                $current = $property.Value
            }
        }

        if ($resolved -and $null -ne $current) {
            if ($current -is [string]) {
                if (-not [string]::IsNullOrWhiteSpace($current)) {
                    return $current
                }
            } else {
                return $current
            }
        }
    }

    return $null
}

function Invoke-AzRaw {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $commandArgs = @($Arguments + '--only-show-errors')
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $script:AzCliPath @commandArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw (($output | Out-String).Trim())
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return $output
}

function Invoke-AzJson {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $commandArgs = @($Arguments + '--output' + 'json' + '--only-show-errors')
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $script:AzCliPath @commandArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw (($output | Out-String).Trim())
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    $text = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    return ConvertFrom-AzJsonText -Text $text
}

function Try-AzJson {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $commandArgs = @($Arguments + '--output' + 'json' + '--only-show-errors')
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $script:AzCliPath @commandArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    $text = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    return ConvertFrom-AzJsonText -Text $text
}

function ConvertFrom-AzJsonText {
    param([Parameter(Mandatory = $true)][string]$Text)

    $trimmed = $Text.Trim()
    try {
        return $trimmed | ConvertFrom-Json
    } catch {
        $objectStart = $trimmed.IndexOf('{')
        $arrayStart = $trimmed.IndexOf('[')
        $starts = @($objectStart, $arrayStart) | Where-Object { $_ -ge 0 } | Sort-Object
        if ($starts.Count -eq 0) {
            throw
        }

        $start = [int]$starts[0]
        $closeChar = if ($trimmed[$start] -eq '{') { '}' } else { ']' }
        $end = $trimmed.LastIndexOf($closeChar)
        if ($end -le $start) {
            throw
        }

        return $trimmed.Substring($start, $end - $start + 1) | ConvertFrom-Json
    }
}

function Wait-Until {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][scriptblock]$Condition,
        [int]$TimeoutSeconds = 600,
        [int]$IntervalSeconds = 10
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (& $Condition) {
            return
        }

        Start-Sleep -Seconds $IntervalSeconds
    }

    throw "Timed out waiting for $Description."
}

function Get-RelativeHost {
    param(
        [Parameter(Mandatory = $true)][string]$Hostname,
        [Parameter(Mandatory = $true)][string]$ApexDomain
    )

    if ($Hostname -ieq $ApexDomain) {
        return '@'
    }

    $suffix = ".$ApexDomain"
    if ($Hostname.EndsWith($suffix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Hostname.Substring(0, $Hostname.Length - $suffix.Length)
    }

    throw "Hostname '$Hostname' is not under apex domain '$ApexDomain'."
}

function Split-RegisteredDomain {
    param([Parameter(Mandatory = $true)][string]$ApexDomain)

    $labels = $ApexDomain.Split('.')
    if ($labels.Count -lt 2) {
        throw "Domain '$ApexDomain' is not a valid registered domain."
    }

    return @{
        Sld = $labels[0]
        Tld = ($labels[1..($labels.Count - 1)] -join '.')
    }
}

function ConvertTo-QueryString {
    param([Parameter(Mandatory = $true)][hashtable]$Parameters)

    $pairs = foreach ($entry in ($Parameters.GetEnumerator() | Sort-Object Key)) {
        "{0}={1}" -f [uri]::EscapeDataString([string]$entry.Key), [uri]::EscapeDataString([string]$entry.Value)
    }

    return ($pairs -join '&')
}

function Invoke-NamecheapApi {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][hashtable]$ExtraParameters
    )

    $parameters = @{
        ApiUser  = $script:NamecheapSettings.ApiUser
        ApiKey   = $script:NamecheapSettings.ApiKey
        UserName = $script:NamecheapSettings.UserName
        ClientIp = $script:NamecheapSettings.ClientIp
        Command  = $Command
    }

    foreach ($key in $ExtraParameters.Keys) {
        $parameters[$key] = $ExtraParameters[$key]
    }

    $uri = 'https://api.namecheap.com/xml.response?' + (ConvertTo-QueryString -Parameters $parameters)
    [xml]$xml = Invoke-RestMethod -Uri $uri -Method Get
    if ($xml.ApiResponse.Status -ne 'OK') {
        $errors = @($xml.ApiResponse.Errors.Error | ForEach-Object { $_.'#text' }) -join '; '
        throw "Namecheap API call '$Command' failed. $errors"
    }

    return $xml
}

function Get-NamecheapHosts {
    $domainParts = Split-RegisteredDomain -ApexDomain $DomainName
    $xml = Invoke-NamecheapApi -Command 'namecheap.domains.dns.getHosts' -ExtraParameters @{
        SLD = $domainParts.Sld
        TLD = $domainParts.Tld
    }

    $hosts = @()
    foreach ($host in @($xml.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host)) {
        $hosts += [pscustomobject]@{
            Name    = [string]$host.Name
            Type    = [string]$host.Type
            Address = [string]$host.Address
            TTL     = if ([string]::IsNullOrWhiteSpace([string]$host.TTL)) { '1800' } else { [string]$host.TTL }
            MXPref  = if ([string]::IsNullOrWhiteSpace([string]$host.MXPref)) { '10' } else { [string]$host.MXPref }
        }
    }

    return $hosts
}

function Set-NamecheapHosts {
    param([Parameter(Mandatory = $true)][object[]]$Hosts)

    $domainParts = Split-RegisteredDomain -ApexDomain $DomainName
    $parameters = @{
        SLD = $domainParts.Sld
        TLD = $domainParts.Tld
    }

    for ($index = 0; $index -lt $Hosts.Count; $index++) {
        $number = $index + 1
        $record = $Hosts[$index]
        $parameters["HostName$number"] = $record.Name
        $parameters["RecordType$number"] = $record.Type
        $parameters["Address$number"] = $record.Address
        $parameters["TTL$number"] = $record.TTL
        $parameters["MXPref$number"] = $record.MXPref
    }

    [void](Invoke-NamecheapApi -Command 'namecheap.domains.dns.setHosts' -ExtraParameters $parameters)
}

function Upsert-HostRecords {
    param(
        [Parameter(Mandatory = $true)][object[]]$ExistingHosts,
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][string[]]$ReplaceTypes,
        [Parameter(Mandatory = $true)][object[]]$DesiredHosts
    )

    $updatedHosts = @(
        $ExistingHosts | Where-Object {
            -not (
                $_.Name -ieq $HostName -and
                ($ReplaceTypes -contains $_.Type.ToUpperInvariant())
            )
        }
    )

    return @($updatedHosts + $DesiredHosts)
}

function Get-AuthoritativeNameServer {
    $record = Resolve-DnsName -Name $DomainName -Type NS -ErrorAction Stop |
        Where-Object { $_.Type -eq 'NS' } |
        Select-Object -First 1
    if ($null -eq $record) {
        throw "Unable to resolve an authoritative nameserver for '$DomainName'."
    }

    return $record.NameHost.TrimEnd('.')
}

function Wait-DnsRecord {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][ValidateSet('A', 'CNAME', 'TXT')][string]$Type,
        [Parameter(Mandatory = $true)][string]$ExpectedValue
    )

    Wait-Until -Description "$Type record for $Name" -TimeoutSeconds 900 -IntervalSeconds 15 -Condition {
        try {
            $records = Resolve-DnsName -Name $Name -Type $Type -Server $script:AuthoritativeNameServer -ErrorAction Stop
        } catch {
            return $false
        }

        switch ($Type) {
            'A' {
                return @($records | Where-Object { $_.Type -eq 'A' -and $_.IPAddress -eq $ExpectedValue }).Count -gt 0
            }
            'CNAME' {
                return @($records | Where-Object {
                    $_.Type -eq 'CNAME' -and $_.NameHost.TrimEnd('.').ToLowerInvariant() -eq $ExpectedValue.TrimEnd('.').ToLowerInvariant()
                }).Count -gt 0
            }
            'TXT' {
                return @($records | Where-Object {
                    $_.Type -eq 'TXT' -and (($_.Strings -join '') -eq $ExpectedValue)
                }).Count -gt 0
            }
        }

        return $false
    }
}

function Ensure-AzureLogin {
    $tenantId = Get-ConfigValue -Name 'AZURE_TENANT_ID'
    $clientId = Get-ConfigValue -Name 'AZURE_CLIENT_ID'
    $clientSecret = Get-ConfigValue -Name 'AZURE_CLIENT_SECRET'

    if (
        -not [string]::IsNullOrWhiteSpace($tenantId) -and
        -not [string]::IsNullOrWhiteSpace($clientId) -and
        -not [string]::IsNullOrWhiteSpace($clientSecret)
    ) {
        Write-Step 'Authenticating Azure CLI with the configured service principal.'
        [void](Invoke-AzRaw -Arguments @(
            'login',
            '--service-principal',
            '--username', $clientId,
            '--password', $clientSecret,
            '--tenant', $tenantId
        ))
    }

    $account = Try-AzJson -Arguments @('account', 'show')
    if ($null -eq $account) {
        throw "Azure CLI is not authenticated. Run 'az login' once, or set AZURE_CLIENT_ID/AZURE_CLIENT_SECRET/AZURE_TENANT_ID in '$EnvFile'."
    }

    if ([string]::IsNullOrWhiteSpace($SubscriptionId)) {
        $script:EffectiveSubscriptionId = Get-ConfigValue -Name 'AZURE_SUBSCRIPTION_ID' -Default ''
    } else {
        $script:EffectiveSubscriptionId = $SubscriptionId
    }

    if (-not [string]::IsNullOrWhiteSpace($script:EffectiveSubscriptionId)) {
        [void](Invoke-AzRaw -Arguments @('account', 'set', '--subscription', $script:EffectiveSubscriptionId))
        $account = Invoke-AzJson -Arguments @('account', 'show')
    }

    return $account
}

function Ensure-ResourceGroup {
    Write-Step "Ensuring resource group '$ResourceGroup' exists in '$Location'."
    [void](Invoke-AzJson -Arguments @('group', 'create', '--name', $ResourceGroup, '--location', $Location))
}

function Ensure-AzureProviders {
    $providers = @(
        'Microsoft.App',
        'Microsoft.ContainerRegistry',
        'Microsoft.DocumentDB',
        'Microsoft.OperationalInsights',
        'Microsoft.Web'
    )

    foreach ($provider in $providers) {
        $state = [string](Invoke-AzRaw -Arguments @(
            'provider', 'show',
            '--namespace', $provider,
            '--query', 'registrationState',
            '--output', 'tsv'
        ))
        if ($state.Trim() -ne 'Registered') {
            Write-Step "Registering Azure provider '$provider'."
            [void](Invoke-AzRaw -Arguments @('provider', 'register', '--namespace', $provider))
        }
    }

    Wait-Until -Description 'Azure provider registration' -TimeoutSeconds 600 -IntervalSeconds 10 -Condition {
        foreach ($provider in $providers) {
            $state = [string](Invoke-AzRaw -Arguments @(
                'provider', 'show',
                '--namespace', $provider,
                '--query', 'registrationState',
                '--output', 'tsv'
            ))
            if ($state.Trim() -ne 'Registered') {
                return $false
            }
        }
        return $true
    }
}

function Ensure-ProductionMongoUri {
    if ($UseConfiguredMongoUri) {
        $configuredUri = Get-ConfigValue -Name 'MONGODB_URI' -Required
        if ($configuredUri -notmatch '^mongodb(\+srv)?://') {
            throw 'MONGODB_URI must start with mongodb:// or mongodb+srv://.'
        }
        if ($configuredUri -match '(^|[@/])(localhost|127\.0\.0\.1)([:/]|$)') {
            throw 'MONGODB_URI must point at a remote MongoDB instance when -UseConfiguredMongoUri is set.'
        }

        $script:ProductionMongoUri = $configuredUri
        $script:CosmosAccountName = $null
        Write-Step 'Using the configured remote MongoDB connection.'
        return
    }

    if ([string]::IsNullOrWhiteSpace($CosmosAccountName)) {
        $cleanSubscription = ($script:Account.id -replace '-', '').ToLowerInvariant()
        $script:CosmosAccountName = "maxrocosmos$($cleanSubscription.Substring($cleanSubscription.Length - 5))"
    } else {
        $script:CosmosAccountName = $CosmosAccountName.ToLowerInvariant()
    }

    $cosmosAccount = Try-AzJson -Arguments @(
        'cosmosdb', 'show',
        '--name', $script:CosmosAccountName,
        '--resource-group', $ResourceGroup
    )
    if ($null -eq $cosmosAccount) {
        Write-Step "Creating Cosmos DB for MongoDB account '$script:CosmosAccountName'."
        [void](Invoke-AzRaw -Arguments @(
            'cosmosdb', 'create',
            '--name', $script:CosmosAccountName,
            '--resource-group', $ResourceGroup,
            '--kind', 'MongoDB',
            '--server-version', '7.0',
            '--enable-free-tier', 'true',
            '--default-consistency-level', 'Session',
            '--locations', "regionName=$Location", 'failoverPriority=0', 'isZoneRedundant=False'
        ))
    } else {
        Write-Step "Using existing Cosmos DB account '$script:CosmosAccountName'."
    }

    $database = Try-AzJson -Arguments @(
        'cosmosdb', 'mongodb', 'database', 'show',
        '--account-name', $script:CosmosAccountName,
        '--resource-group', $ResourceGroup,
        '--name', $MongoDatabaseName
    )
    if ($null -eq $database) {
        Write-Step "Creating MongoDB database '$MongoDatabaseName'."
        [void](Invoke-AzRaw -Arguments @(
            'cosmosdb', 'mongodb', 'database', 'create',
            '--account-name', $script:CosmosAccountName,
            '--resource-group', $ResourceGroup,
            '--name', $MongoDatabaseName
        ))
    }

    $keys = Invoke-AzJson -Arguments @(
        'cosmosdb', 'keys', 'list',
        '--name', $script:CosmosAccountName,
        '--resource-group', $ResourceGroup,
        '--type', 'connection-strings'
    )
    $connectionStrings = @(Get-PropertyValue -Object $keys -Paths @('connectionStrings'))
    $connectionString = [string](
        $connectionStrings |
            Where-Object { $_.description -match 'Primary.*MongoDB' } |
            Select-Object -First 1 -ExpandProperty connectionString
    )
    if ([string]::IsNullOrWhiteSpace($connectionString)) {
        throw "Unable to resolve the MongoDB connection string for '$script:CosmosAccountName'."
    }

    $script:ProductionMongoUri = (($connectionString -replace '/\?', "/$MongoDatabaseName?") -split '&' | Select-Object -First 1)
    if ($script:ProductionMongoUri -notmatch '^mongodb(\+srv)?://') {
        throw 'Resolved Cosmos Mongo URI is invalid.'
    }
}

function Ensure-Acr {
    if ([string]::IsNullOrWhiteSpace($AcrName)) {
        $cleanSubscription = ($script:Account.id -replace '-', '').ToLowerInvariant()
        $script:AcrName = "maxroacr$($cleanSubscription.Substring($cleanSubscription.Length - 5))"
    } else {
        $script:AcrName = $AcrName.ToLowerInvariant()
    }

    $registry = Try-AzJson -Arguments @('acr', 'show', '--name', $script:AcrName, '--resource-group', $ResourceGroup)
    if ($null -eq $registry) {
        Write-Step "Creating Azure Container Registry '$script:AcrName'."
        $registry = Invoke-AzJson -Arguments @(
            'acr', 'create',
            '--name', $script:AcrName,
            '--resource-group', $ResourceGroup,
            '--location', $Location,
            '--sku', 'Basic',
            '--admin-enabled', 'true'
        )
    } else {
        Write-Step "Using existing Azure Container Registry '$script:AcrName'."
        [void](Invoke-AzRaw -Arguments @('acr', 'update', '--name', $script:AcrName, '--admin-enabled', 'true'))
    }

    return $registry
}

function Ensure-ContainerAppEnvironment {
    $environment = Try-AzJson -Arguments @('containerapp', 'env', 'show', '--name', $ContainerAppEnvironment, '--resource-group', $ResourceGroup)
    if ($null -eq $environment) {
        Write-Step "Creating Container Apps environment '$ContainerAppEnvironment'."
        $environment = Invoke-AzJson -Arguments @(
            'containerapp', 'env', 'create',
            '--name', $ContainerAppEnvironment,
            '--resource-group', $ResourceGroup,
            '--location', $Location,
            '--logs-destination', 'none'
        )
    } else {
        Write-Step "Using existing Container Apps environment '$ContainerAppEnvironment'."
    }

    return $environment
}

function Build-BackendImage {
    param([Parameter(Mandatory = $true)][string]$ImageTag)

    Write-Step "Building backend image '${BackendAppName}:$ImageTag'."
    try {
        [void](Invoke-AzRaw -Arguments @(
            'acr', 'build',
            '--registry', $script:AcrName,
            '--image', "${BackendAppName}:$ImageTag",
            '--image', "${BackendAppName}:latest",
            $script:BackendDirectory
        ))
    }
    catch {
        if ($_.Exception.Message -notmatch 'TasksOperationsNotAllowed') {
            throw
        }

        Write-Step 'ACR Tasks are unavailable in this subscription, falling back to local Jib push.'
        $acrCredentials = Get-AcrCredentials
        Push-Location $script:BackendDirectory
        try {
            [void](& .\mvnw.cmd `
                -B `
                -DskipTests `
                "-Djib.to.image=$($script:AcrName).azurecr.io/$BackendAppName" `
                "-Djib.to.tags=$ImageTag,latest" `
                "-Djib.to.auth.username=$($acrCredentials.Username)" `
                "-Djib.to.auth.password=$($acrCredentials.Password)" `
                jib:build)
            if ($LASTEXITCODE -ne 0) {
                throw 'Local Jib push failed.'
            }
        }
        finally {
            Pop-Location
        }
    }

    return "$($script:AcrName).azurecr.io/${BackendAppName}:$ImageTag"
}

function Get-AcrCredentials {
    $credentials = Invoke-AzJson -Arguments @('acr', 'credential', 'show', '--name', $script:AcrName)
    return @{
        Username = [string](Get-PropertyValue -Object $credentials -Paths @('username'))
        Password = [string](Get-PropertyValue -Object $credentials -Paths @('passwords.0.value'))
    }
}

function Ensure-FrontendContainerApp {
    param([Parameter(Mandatory = $true)][string]$ImageReference)

    $acrCredentials = Get-AcrCredentials
    $containerApp = Try-AzJson -Arguments @('containerapp', 'show', '--name', $FrontendAppName, '--resource-group', $ResourceGroup)
    if ($null -eq $containerApp) {
        Write-Step "Creating frontend Container App '$FrontendAppName'."
        [void](Invoke-AzRaw -Arguments @(
            'containerapp', 'create',
            '--name', $FrontendAppName,
            '--resource-group', $ResourceGroup,
            '--environment', $ContainerAppEnvironment,
            '--image', $ImageReference,
            '--ingress', 'external',
            '--target-port', '80',
            '--cpu', '0.25',
            '--memory', '0.5Gi',
            '--min-replicas', '1',
            '--max-replicas', '1',
            '--registry-server', "$($script:AcrName).azurecr.io",
            '--registry-username', $acrCredentials.Username,
            '--registry-password', $acrCredentials.Password
        ))
    }

    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'registry', 'set',
        '--name', $FrontendAppName,
        '--resource-group', $ResourceGroup,
        '--server', "$($script:AcrName).azurecr.io",
        '--username', $acrCredentials.Username,
        '--password', $acrCredentials.Password
    ))

    Write-Step "Updating frontend Container App '$FrontendAppName'."
    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'update',
        '--name', $FrontendAppName,
        '--resource-group', $ResourceGroup,
        '--image', $ImageReference,
        '--revision-suffix', ('r' + (Get-Date -Format 'MMddHHmmss')),
        '--cpu', '0.25',
        '--memory', '0.5Gi',
        '--min-replicas', '1',
        '--max-replicas', '1'
    ))
    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'revision', 'set-mode',
        '--name', $FrontendAppName,
        '--resource-group', $ResourceGroup,
        '--mode', 'single'
    ))

    Wait-Until -Description "frontend Container App '$FrontendAppName' readiness" -TimeoutSeconds 900 -IntervalSeconds 15 -Condition {
        $app = Invoke-AzJson -Arguments @('containerapp', 'show', '--name', $FrontendAppName, '--resource-group', $ResourceGroup)
        $runningStatus = [string](Get-PropertyValue -Object $app -Paths @('properties.runningStatus'))
        $latestRevision = [string](Get-PropertyValue -Object $app -Paths @('properties.latestRevisionName'))
        $latestReadyRevision = [string](Get-PropertyValue -Object $app -Paths @('properties.latestReadyRevisionName'))
        return (
            $runningStatus -eq 'Running' -and
            -not [string]::IsNullOrWhiteSpace($latestRevision) -and
            $latestRevision -eq $latestReadyRevision
        )
    }

    return Invoke-AzJson -Arguments @('containerapp', 'show', '--name', $FrontendAppName, '--resource-group', $ResourceGroup)
}

function Ensure-ContainerApp {
    param(
        [Parameter(Mandatory = $true)][string]$ImageReference,
        [Parameter(Mandatory = $true)][string]$FrontendDefaultHostname
    )

    $mongodbUri = $script:ProductionMongoUri
    $jwtSecret = Get-ConfigValue -Name 'JWT_SECRET' -Required
    if ($jwtSecret.Length -lt 32) {
        throw 'JWT_SECRET must be at least 32 characters for production HS256 signing.'
    }

    if ([string]::IsNullOrWhiteSpace($mongodbUri) -or $mongodbUri -notmatch '^mongodb(\+srv)?:\/\/') {
        throw 'The production MongoDB URI was not prepared before deploying the backend.'
    }

    $serverPort = Get-ConfigValue -Name 'SERVER_PORT' -Default '8080'
    $appLogLevel = Get-ConfigValue -Name 'APP_LOG_LEVEL' -Default 'INFO'
    $graphiqlEnabled = Get-ConfigValue -Name 'GRAPHIQL_ENABLED' -Default 'false'
    $jwtAccessExpiration = Get-ConfigValue -Name 'JWT_ACCESS_EXPIRATION' -Default '900000'
    $jwtRefreshExpiration = Get-ConfigValue -Name 'JWT_REFRESH_EXPIRATION' -Default '604800000'
    $googleClientId = Get-ConfigValue -Name 'GOOGLE_CLIENT_ID'
    $spotifyClientId = Get-ConfigValue -Name 'SPOTIFY_CLIENT_ID'
    $googleAiModel = Get-ConfigValue -Name 'GOOGLE_AI_MODEL' -Default 'gemini-2.5-flash'
    $spotifyClientSecret = Get-ConfigValue -Name 'SPOTIFY_CLIENT_SECRET'
    $googleAiApiKey = Get-ConfigValue -Name 'GOOGLE_AI_API_KEY'
    $usdaFoodDataApiKey = Get-ConfigValue -Name 'USDA_FOODDATA_API_KEY'
    $fatSecretClientId = Get-ConfigValue -Name 'FATSECRET_CLIENT_ID'
    $fatSecretClientSecret = Get-ConfigValue -Name 'FATSECRET_CLIENT_SECRET'

    $corsOrigins = @(
        "https://$DomainName",
        "https://$WwwHostname",
        "https://$FrontendDefaultHostname",
        'http://localhost:4200',
        'http://127.0.0.1:4200'
    ) | Select-Object -Unique
    $corsOriginValue = $corsOrigins -join ','

    $acrCredentials = Get-AcrCredentials
    $containerApp = Try-AzJson -Arguments @('containerapp', 'show', '--name', $BackendAppName, '--resource-group', $ResourceGroup)
    if ($null -ne $containerApp) {
        $provisioningState = [string](Get-PropertyValue -Object $containerApp -Paths @('properties.provisioningState'))
        $existingContainers = Get-PropertyValue -Object $containerApp -Paths @('properties.template.containers')
        $existingIngress = Get-PropertyValue -Object $containerApp -Paths @('properties.configuration.ingress')
        if ($provisioningState -eq 'Failed' -and $null -eq $existingContainers -and $null -eq $existingIngress) {
            Write-Step "Deleting failed Container App '$BackendAppName' so it can be recreated cleanly."
            [void](Invoke-AzRaw -Arguments @(
                'containerapp', 'delete',
                '--name', $BackendAppName,
                '--resource-group', $ResourceGroup,
                '--yes'
            ))
            $containerApp = $null
        }
    }

    if ($null -eq $containerApp) {
        Write-Step "Creating Container App '$BackendAppName'."
        [void](Invoke-AzRaw -Arguments @(
            'containerapp', 'create',
            '--name', $BackendAppName,
            '--resource-group', $ResourceGroup,
            '--environment', $ContainerAppEnvironment,
            '--image', $ImageReference,
            '--ingress', 'external',
            '--target-port', $serverPort,
            '--cpu', '0.5',
            '--memory', '1.0Gi',
            '--min-replicas', '1',
            '--max-replicas', '1',
            '--registry-server', "$($script:AcrName).azurecr.io",
            '--registry-username', $acrCredentials.Username,
            '--registry-password', $acrCredentials.Password,
            '--env-vars',
            'SPRING_PROFILES_ACTIVE=prod',
            "SERVER_PORT=$serverPort",
            "APP_LOG_LEVEL=$appLogLevel",
            "GRAPHIQL_ENABLED=$graphiqlEnabled"
        ))
    }

    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'registry', 'set',
        '--name', $BackendAppName,
        '--resource-group', $ResourceGroup,
        '--server', "$($script:AcrName).azurecr.io",
        '--username', $acrCredentials.Username,
        '--password', $acrCredentials.Password
    ))

    $secretArgs = @(
        "mongodb-uri=$mongodbUri",
        "jwt-secret=$jwtSecret"
    )
    if (-not [string]::IsNullOrWhiteSpace($spotifyClientSecret)) {
        $secretArgs += "spotify-client-secret=$spotifyClientSecret"
    }
    if (-not [string]::IsNullOrWhiteSpace($googleAiApiKey)) {
        $secretArgs += "google-ai-api-key=$googleAiApiKey"
    }
    if (-not [string]::IsNullOrWhiteSpace($usdaFoodDataApiKey)) {
        $secretArgs += "usda-fooddata-api-key=$usdaFoodDataApiKey"
    }
    if (-not [string]::IsNullOrWhiteSpace($fatSecretClientId)) {
        $secretArgs += "fatsecret-client-id=$fatSecretClientId"
    }
    if (-not [string]::IsNullOrWhiteSpace($fatSecretClientSecret)) {
        $secretArgs += "fatsecret-client-secret=$fatSecretClientSecret"
    }

    $secretSetArguments = @(
        'containerapp', 'secret', 'set',
        '--name', $BackendAppName,
        '--resource-group', $ResourceGroup,
        '--secrets'
    ) + $secretArgs
    [void](Invoke-AzRaw -Arguments $secretSetArguments)

    $revisionSuffix = 'r' + (Get-Date -Format 'MMddHHmmss')
    $envArgs = @(
        'SPRING_PROFILES_ACTIVE=prod',
        "SERVER_PORT=$serverPort",
        'MAXRO_PR_CLEANUP_ENABLED=false',
        "CORS_ORIGINS=$corsOriginValue",
        "APP_LOG_LEVEL=$appLogLevel",
        "GRAPHIQL_ENABLED=$graphiqlEnabled",
        "JWT_ACCESS_EXPIRATION=$jwtAccessExpiration",
        "JWT_REFRESH_EXPIRATION=$jwtRefreshExpiration",
        "GOOGLE_AI_MODEL=$googleAiModel"
    )
    if (-not [string]::IsNullOrWhiteSpace($googleClientId)) {
        $envArgs += "GOOGLE_CLIENT_ID=$googleClientId"
    }
    if (-not [string]::IsNullOrWhiteSpace($spotifyClientId)) {
        $envArgs += "SPOTIFY_CLIENT_ID=$spotifyClientId"
    }

    $envArgs += 'MONGODB_URI=secretref:mongodb-uri'
    $envArgs += 'SPRING_DATA_MONGODB_URI=secretref:mongodb-uri'
    $envArgs += 'JWT_SECRET=secretref:jwt-secret'

    if (-not [string]::IsNullOrWhiteSpace($spotifyClientSecret)) {
        $envArgs += 'SPOTIFY_CLIENT_SECRET=secretref:spotify-client-secret'
    }
    if (-not [string]::IsNullOrWhiteSpace($googleAiApiKey)) {
        $envArgs += 'GOOGLE_AI_API_KEY=secretref:google-ai-api-key'
    }
    if (-not [string]::IsNullOrWhiteSpace($usdaFoodDataApiKey)) {
        $envArgs += 'USDA_FOODDATA_API_KEY=secretref:usda-fooddata-api-key'
    }
    if (-not [string]::IsNullOrWhiteSpace($fatSecretClientId)) {
        $envArgs += 'FATSECRET_CLIENT_ID=secretref:fatsecret-client-id'
    }
    if (-not [string]::IsNullOrWhiteSpace($fatSecretClientSecret)) {
        $envArgs += 'FATSECRET_CLIENT_SECRET=secretref:fatsecret-client-secret'
    }

    Write-Step "Updating Container App '$BackendAppName'."
    $containerUpdateArguments = @(
        'containerapp', 'update',
        '--name', $BackendAppName,
        '--resource-group', $ResourceGroup,
        '--image', $ImageReference,
        '--revision-suffix', $revisionSuffix,
        '--cpu', '0.5',
        '--memory', '1.0Gi',
        '--min-replicas', '1',
        '--max-replicas', '1',
        '--set-env-vars'
    ) + $envArgs
    [void](Invoke-AzRaw -Arguments $containerUpdateArguments)

    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'revision', 'set-mode',
        '--name', $BackendAppName,
        '--resource-group', $ResourceGroup,
        '--mode', 'single'
    ))

    Wait-Until -Description "Container App '$BackendAppName' readiness" -TimeoutSeconds 900 -IntervalSeconds 15 -Condition {
        $app = Invoke-AzJson -Arguments @('containerapp', 'show', '--name', $BackendAppName, '--resource-group', $ResourceGroup)
        $runningStatus = [string](Get-PropertyValue -Object $app -Paths @('properties.runningStatus'))
        $latestRevision = [string](Get-PropertyValue -Object $app -Paths @('properties.latestRevisionName'))
        $latestReadyRevision = [string](Get-PropertyValue -Object $app -Paths @('properties.latestReadyRevisionName'))
        return (
            $runningStatus -eq 'Running' -and
            -not [string]::IsNullOrWhiteSpace($latestRevision) -and
            $latestRevision -eq $latestReadyRevision
        )
    }

    return Invoke-AzJson -Arguments @('containerapp', 'show', '--name', $BackendAppName, '--resource-group', $ResourceGroup)
}

function Configure-ApiHostname {
    param(
        [Parameter(Mandatory = $true)][string]$BackendIngressHostname,
        [Parameter(Mandatory = $true)][string]$VerificationCode
    )

    if ($SkipDns) {
        Write-Host ''
        Write-Host 'Manual DNS needed for the backend custom domain:' -ForegroundColor Yellow
        Write-Host "  CNAME $(Get-RelativeHost -Hostname $ApiHostname -ApexDomain $DomainName) -> $BackendIngressHostname"
        Write-Host "  TXT   asuid.$(Get-RelativeHost -Hostname $ApiHostname -ApexDomain $DomainName) -> $VerificationCode"
        return
    }

    if (-not $script:AuthoritativeNameServer) {
        $script:AuthoritativeNameServer = Get-AuthoritativeNameServer
    }

    Write-Step "Waiting for backend DNS records on '$ApiHostname'."
    Wait-DnsRecord -Name $ApiHostname -Type 'CNAME' -ExpectedValue $BackendIngressHostname
    Wait-DnsRecord -Name "asuid.$ApiHostname" -Type 'TXT' -ExpectedValue $VerificationCode

    Write-Step "Binding '$ApiHostname' to Container App '$BackendAppName'."
    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'hostname', 'bind',
        '--name', $BackendAppName,
        '--resource-group', $ResourceGroup,
        '--environment', $ContainerAppEnvironment,
        '--hostname', $ApiHostname,
        '--validation-method', 'CNAME'
    ))
}

function Configure-ApexHostname {
    param(
        [Parameter(Mandatory = $true)][string]$EnvironmentStaticIp,
        [Parameter(Mandatory = $true)][string]$VerificationCode
    )

    if ($SkipDns) {
        Write-Host ''
        Write-Host 'Manual DNS needed for the apex HTTPS redirect:' -ForegroundColor Yellow
        Write-Host "  A   @ -> $EnvironmentStaticIp"
        Write-Host "  TXT asuid -> $VerificationCode"
        return
    }

    if (-not $script:AuthoritativeNameServer) {
        $script:AuthoritativeNameServer = Get-AuthoritativeNameServer
    }

    Write-Step "Waiting for apex DNS records on '$DomainName'."
    Wait-DnsRecord -Name $DomainName -Type 'A' -ExpectedValue $EnvironmentStaticIp
    Wait-DnsRecord -Name "asuid.$DomainName" -Type 'TXT' -ExpectedValue $VerificationCode

    Write-Step "Binding '$DomainName' to Container App '$BackendAppName'."
    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'hostname', 'bind',
        '--name', $BackendAppName,
        '--resource-group', $ResourceGroup,
        '--environment', $ContainerAppEnvironment,
        '--hostname', $DomainName,
        '--validation-method', 'HTTP'
    ))
}

function Build-AndDeploy-Frontend {
    param([Parameter(Mandatory = $true)][string]$ImageTag)

    Write-Step "Installing frontend dependencies in '$script:FrontendDirectory'."
    Push-Location $script:FrontendDirectory
    try {
        & npm ci | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'npm ci failed.'
        }

        Write-Step 'Building the Angular production bundle.'
        & npm run build -- --configuration=production | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'Angular production build failed.'
        }

    }
    finally {
        Pop-Location
    }

    Write-Step "Publishing frontend image '${FrontendImageName}:$ImageTag' without a local container engine."
    $publisher = Join-Path $PSScriptRoot 'publish-frontend-container.ps1'
    $imageReference = & $publisher `
        -ArtifactDirectory $script:FrontendDistDirectory `
        -NginxConfigPath (Join-Path $script:FrontendDirectory 'nginx.conf') `
        -RegistryName $script:AcrName `
        -Repository $FrontendImageName `
        -ImageTag $ImageTag |
        Select-Object -Last 1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($imageReference)) {
        throw 'Frontend image publication failed.'
    }

    return [string]$imageReference
}

function Configure-WwwHostname {
    param(
        [Parameter(Mandatory = $true)][string]$DefaultHostname,
        [Parameter(Mandatory = $true)][string]$VerificationCode
    )

    if ($SkipDns) {
        Write-Host ''
        Write-Host 'Manual DNS needed for the frontend custom domain:' -ForegroundColor Yellow
        Write-Host "  CNAME $(Get-RelativeHost -Hostname $WwwHostname -ApexDomain $DomainName) -> $DefaultHostname"
        Write-Host "  TXT   asuid.$(Get-RelativeHost -Hostname $WwwHostname -ApexDomain $DomainName) -> $VerificationCode"
        return
    }

    if (-not $script:AuthoritativeNameServer) {
        $script:AuthoritativeNameServer = Get-AuthoritativeNameServer
    }

    Write-Step "Waiting for frontend DNS records on '$WwwHostname'."
    Wait-DnsRecord -Name $WwwHostname -Type 'CNAME' -ExpectedValue $DefaultHostname
    Wait-DnsRecord -Name "asuid.$WwwHostname" -Type 'TXT' -ExpectedValue $VerificationCode

    Write-Step "Binding '$WwwHostname' to frontend Container App '$FrontendAppName'."
    [void](Invoke-AzRaw -Arguments @(
        'containerapp', 'hostname', 'bind',
        '--name', $FrontendAppName,
        '--resource-group', $ResourceGroup,
        '--environment', $ContainerAppEnvironment,
        '--hostname', $WwwHostname,
        '--validation-method', 'CNAME'
    ))
}

$script:DotEnv = @{}
if (Test-Path -Path $EnvFile) {
    $script:DotEnv = Import-DotEnv -Path $EnvFile
}

$script:BackendDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'maxro-backend'
$script:FrontendDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'maxro-frontend'
$script:FrontendDistDirectory = Join-Path $script:FrontendDirectory 'dist\maxro-frontend\browser'
$script:AzCliPath = (Get-Command az -ErrorAction Stop).Source
$script:NamecheapSettings = $null
$script:EffectiveDnsProvider = 'none'
$script:ProductionMongoUri = $null
$script:CosmosAccountName = $null

if (-not $ApiHostname.EndsWith(".$DomainName", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "ApiHostname '$ApiHostname' must live under '$DomainName'."
}

if (-not $WwwHostname.EndsWith(".$DomainName", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "WwwHostname '$WwwHostname' must live under '$DomainName'."
}

Write-Step 'Checking Azure CLI and local build tooling.'
[void](Get-Command az -ErrorAction Stop)
if (-not $SkipFrontend) {
    [void](Get-Command npm -ErrorAction Stop)
}

Write-Step 'Ensuring the Container Apps CLI extension is available.'
[void](Invoke-AzRaw -Arguments @('extension', 'add', '--name', 'containerapp', '--upgrade'))

$script:Account = Ensure-AzureLogin
Write-Step "Using Azure subscription '$($script:Account.name)' ($($script:Account.id))."

Ensure-AzureProviders
Ensure-ResourceGroup
[void](Ensure-Acr)
$containerAppEnvironmentResource = Ensure-ContainerAppEnvironment
$containerAppEnvironmentStaticIp = [string](Get-PropertyValue -Object $containerAppEnvironmentResource -Paths @('properties.staticIp', 'staticIp'))

if (-not $SkipBackend) {
    if ([string]::IsNullOrWhiteSpace($containerAppEnvironmentStaticIp)) {
        throw "Unable to resolve the static IP for Container Apps environment '$ContainerAppEnvironment'."
    }
    Ensure-ProductionMongoUri
}

if (-not $SkipDns -and $DnsProvider -ne 'none') {
    $namecheapApiUser = Get-ConfigValue -Name 'NAMECHEAP_API_USER'
    $namecheapUsername = Get-ConfigValue -Name 'NAMECHEAP_USERNAME' -Default $namecheapApiUser
    $namecheapApiKey = Get-ConfigValue -Name 'NAMECHEAP_API_KEY'
    $namecheapClientIp = Get-ConfigValue -Name 'NAMECHEAP_CLIENT_IP'

    if (
        -not [string]::IsNullOrWhiteSpace($namecheapApiUser) -and
        -not [string]::IsNullOrWhiteSpace($namecheapApiKey) -and
        -not [string]::IsNullOrWhiteSpace($namecheapUsername) -and
        -not [string]::IsNullOrWhiteSpace($namecheapClientIp)
    ) {
        $nameServers = Resolve-DnsName -Name $DomainName -Type NS -ErrorAction Stop |
            Where-Object { $_.Type -eq 'NS' } |
            ForEach-Object { $_.NameHost.TrimEnd('.') }
        if ($DnsProvider -eq 'namecheap' -or $nameServers -match 'registrar-servers\.com$') {
            $script:NamecheapSettings = @{
                ApiUser  = $namecheapApiUser
                UserName = $namecheapUsername
                ApiKey   = $namecheapApiKey
                ClientIp = $namecheapClientIp
            }
            $script:EffectiveDnsProvider = 'namecheap'
            $script:AuthoritativeNameServer = Get-AuthoritativeNameServer
            Write-Step "Using Namecheap DNS automation against '$script:AuthoritativeNameServer'."
        }
    }

    if ($DnsProvider -eq 'namecheap' -and $script:EffectiveDnsProvider -ne 'namecheap') {
        throw "DnsProvider was set to 'namecheap' but NAMECHEAP_* credentials were missing or '$DomainName' is not delegated to Namecheap BasicDNS."
    }
}

$backendIngressHostname = $null
$backendVerificationCode = $null
$backendImageReference = $null
$frontendDefaultHostname = $WwwHostname
$frontendVerificationCode = $null
$frontendImageReference = $null

if (-not $SkipFrontend) {
    $frontendImageTag = 'release-' + (Get-Date -Format 'yyyyMMddHHmmss')
    $frontendImageReference = Build-AndDeploy-Frontend -ImageTag $frontendImageTag
    $frontendContainerApp = Ensure-FrontendContainerApp -ImageReference $frontendImageReference
    $frontendDefaultHostname = [string](Get-PropertyValue -Object $frontendContainerApp -Paths @('properties.configuration.ingress.fqdn'))
    $frontendVerificationCode = [string](Get-PropertyValue -Object $frontendContainerApp -Paths @('properties.customDomainVerificationId'))
    if ([string]::IsNullOrWhiteSpace($frontendDefaultHostname) -or [string]::IsNullOrWhiteSpace($frontendVerificationCode)) {
        throw "Unable to resolve the frontend ingress hostname or verification code for '$FrontendAppName'."
    }
} else {
    $existingFrontend = Try-AzJson -Arguments @('containerapp', 'show', '--name', $FrontendAppName, '--resource-group', $ResourceGroup)
    if ($null -ne $existingFrontend) {
        $existingFrontendHostname = [string](Get-PropertyValue -Object $existingFrontend -Paths @('properties.configuration.ingress.fqdn'))
        if (-not [string]::IsNullOrWhiteSpace($existingFrontendHostname)) {
            $frontendDefaultHostname = $existingFrontendHostname
        }
    }
}

if (-not $SkipBackend) {
    $backendImageTag = 'release-' + (Get-Date -Format 'yyyyMMddHHmmss')
    $backendImageReference = Build-BackendImage -ImageTag $backendImageTag
    $containerApp = Ensure-ContainerApp -ImageReference $backendImageReference -FrontendDefaultHostname $frontendDefaultHostname
    $backendIngressHostname = [string](Get-PropertyValue -Object $containerApp -Paths @('properties.configuration.ingress.fqdn'))
    $backendVerificationCode = [string](Get-PropertyValue -Object $containerApp -Paths @('properties.customDomainVerificationId'))
    if ([string]::IsNullOrWhiteSpace($backendIngressHostname) -or [string]::IsNullOrWhiteSpace($backendVerificationCode)) {
        throw "Unable to resolve the backend ingress hostname or verification code for '$BackendAppName'."
    }
}

if ($script:EffectiveDnsProvider -eq 'namecheap') {
    Write-Step "Preparing Namecheap DNS updates for '$DomainName'."
    $namecheapHosts = Get-NamecheapHosts

    if (-not $SkipBackend) {
        $apiHost = Get-RelativeHost -Hostname $ApiHostname -ApexDomain $DomainName
        $namecheapHosts = Upsert-HostRecords -ExistingHosts $namecheapHosts -HostName $apiHost -ReplaceTypes @('A', 'ALIAS', 'CNAME') -DesiredHosts @(
            [pscustomobject]@{
                Name    = $apiHost
                Type    = 'CNAME'
                Address = $backendIngressHostname
                TTL     = '1800'
                MXPref  = '10'
            }
        )
        $namecheapHosts = Upsert-HostRecords -ExistingHosts $namecheapHosts -HostName "asuid.$apiHost" -ReplaceTypes @('TXT') -DesiredHosts @(
            [pscustomobject]@{
                Name    = "asuid.$apiHost"
                Type    = 'TXT'
                Address = $backendVerificationCode
                TTL     = '1800'
                MXPref  = '10'
            }
        )
        $namecheapHosts = Upsert-HostRecords -ExistingHosts $namecheapHosts -HostName '@' -ReplaceTypes @('A', 'ALIAS', 'CNAME', 'URL', 'URL301') -DesiredHosts @(
            [pscustomobject]@{
                Name    = '@'
                Type    = 'A'
                Address = $containerAppEnvironmentStaticIp
                TTL     = '1800'
                MXPref  = '10'
            }
        )
        $namecheapHosts = Upsert-HostRecords -ExistingHosts $namecheapHosts -HostName 'asuid' -ReplaceTypes @('TXT') -DesiredHosts @(
            [pscustomobject]@{
                Name    = 'asuid'
                Type    = 'TXT'
                Address = $backendVerificationCode
                TTL     = '1800'
                MXPref  = '10'
            }
        )
    }

    if (-not $SkipFrontend) {
        $wwwHost = Get-RelativeHost -Hostname $WwwHostname -ApexDomain $DomainName
        $namecheapHosts = Upsert-HostRecords -ExistingHosts $namecheapHosts -HostName $wwwHost -ReplaceTypes @('A', 'ALIAS', 'CNAME') -DesiredHosts @(
            [pscustomobject]@{
                Name    = $wwwHost
                Type    = 'CNAME'
                Address = $frontendDefaultHostname
                TTL     = '1800'
                MXPref  = '10'
            }
        )
        $namecheapHosts = Upsert-HostRecords -ExistingHosts $namecheapHosts -HostName "asuid.$wwwHost" -ReplaceTypes @('TXT') -DesiredHosts @(
            [pscustomobject]@{
                Name    = "asuid.$wwwHost"
                Type    = 'TXT'
                Address = $frontendVerificationCode
                TTL     = '1800'
                MXPref  = '10'
            }
        )
    }

    $caaRecords = @($namecheapHosts | Where-Object { $_.Type -ieq 'CAA' })
    if ($caaRecords.Count -gt 0 -and @($caaRecords | Where-Object { $_.Address -match 'digicert\.com' }).Count -eq 0) {
        Write-Warning "CAA records exist on '$DomainName' but none mention digicert.com. Managed certificate issuance for '$ApiHostname' can fail until DigiCert is allowed."
    }

    Write-Step "Applying Namecheap DNS updates for '$DomainName'."
    Set-NamecheapHosts -Hosts $namecheapHosts
}

if (-not $SkipBackend) {
    Configure-ApiHostname -BackendIngressHostname $backendIngressHostname -VerificationCode $backendVerificationCode
    Configure-ApexHostname -EnvironmentStaticIp $containerAppEnvironmentStaticIp -VerificationCode $backendVerificationCode
}

if (-not $SkipFrontend) {
    Configure-WwwHostname -DefaultHostname $frontendDefaultHostname -VerificationCode $frontendVerificationCode
}

Write-Host ''
Write-Host 'Azure rebuild summary:' -ForegroundColor Green
Write-Host "  Resource group: $ResourceGroup"
Write-Host "  Location: $Location"
Write-Host "  ACR: $script:AcrName"
if (-not $SkipFrontend) {
    Write-Host "  Frontend Container App: $FrontendAppName ($frontendDefaultHostname)"
    Write-Host "  Frontend image: $frontendImageReference"
}
if (-not $SkipBackend) {
    Write-Host "  Container App: $BackendAppName ($backendIngressHostname)"
    Write-Host "  Backend image: $backendImageReference"
    if (-not [string]::IsNullOrWhiteSpace($script:CosmosAccountName)) {
        Write-Host "  Cosmos Mongo: $script:CosmosAccountName/$MongoDatabaseName"
    }
}
Write-Host "  API hostname: $ApiHostname"
Write-Host "  Frontend hostname: $WwwHostname"
if ($SkipDns -or $script:EffectiveDnsProvider -eq 'none') {
    Write-Host '  DNS: manual follow-up still required'
} else {
    Write-Host "  DNS: automated via $script:EffectiveDnsProvider"
    Write-Host "  Apex: $DomainName now redirects to https://$WwwHostname"
}
