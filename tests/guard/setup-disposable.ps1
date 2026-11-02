<#
  Operator tool for separately approved B5 runs. The harness never calls it.
  Creates one new bridge, volume and PostgreSQL container, then the limited role, database and
  marker, and writes the policy plus a DPAPI-protected URL outside Git. It removes nothing: on
  failure the created IDs stay in created-resources.json for an exact, owner-approved cleanup.
  The bridge is NOT internal: Docker publishes no port on an internal network. The container
  therefore has outbound access; loopback publishing limits inbound access only.
#>
param(
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [int]$HostPort = 55499
)
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path.TrimEnd('\')
$out = [IO.Path]::GetFullPath($OutputDir).TrimEnd('\')
if (-not [IO.Path]::IsPathRooted($OutputDir) -or
    ($out + '\').StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'OutputDir must be an absolute path outside the repository'
}
New-Item -ItemType Directory -Force $out | Out-Null

# Same engine endpoint as tests/guard/test-environment.mjs.
$env:DOCKER_HOST = 'npipe:////./pipe/docker_engine'
$Label = 'com.drphynex.migration-guard-test'
$LabelValue = 'disposable-v1'
$Image = 'postgres@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94'
$Database = 'drphynex_migration_guard_test'
$Marker = 'drphynex:migration-guard-test:disposable-v1'
$DataPath = '/var/lib/postgresql/data'

function Get-RandomHex([int]$Bytes) {
  $buffer = New-Object byte[] $Bytes
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  $rng.Dispose()
  -join ($buffer | ForEach-Object { $_.ToString('x2') })
}

# A plain function on purpose: [Parameter()] would add common parameters, and -d would then bind
# to -Debug instead of reaching Docker. Always call it with one explicit array.
function Invoke-Docker([string[]]$DockerArgs) {
  $output = & docker @DockerArgs
  if ($LASTEXITCODE -ne 0) { throw ('docker ' + $DockerArgs[0] + ' failed') }
  $output
}

function Save-Text([string]$Name, [string]$Text) {
  [IO.File]::WriteAllText((Join-Path $out $Name), $Text, (New-Object Text.UTF8Encoding($false)))
}

# PowerShell 5.1 strips quotes from native arguments, so never quote a label into a Go template.
function Assert-Labelled($LabelsJson) {
  if ((($LabelsJson -join '') | ConvertFrom-Json).$Label -ne $LabelValue) {
    throw 'Created resource does not carry the disposable label'
  }
}

$suffix = Get-RandomHex 4
$networkName = "drphynex-b5-test-net-$suffix"
$volumeName = "drphynex-b5-test-data-$suffix"
$containerName = "drphynex-b5-test-pg-$suffix"
$role = "b5_migrator_$suffix"
$created = [ordered]@{ networkName = $networkName; volumeName = $volumeName; containerName = $containerName; role = $role; hostPort = $HostPort; image = $Image }

$networkId = "$(Invoke-Docker @('network', 'create', '--driver', 'bridge', '--label', "$Label=$LabelValue", $networkName))".Trim()
$created.networkId = $networkId
Save-Text 'created-resources.json' ($created | ConvertTo-Json)

Invoke-Docker @('volume', 'create', '--driver', 'local', '--label', "$Label=$LabelValue", $volumeName) | Out-Null

$env:POSTGRES_PASSWORD = Get-RandomHex 32
$containerId = "$(Invoke-Docker @(
  'run', '-d', '--pull', 'never', '--name', $containerName,
  '--label', "$Label=$LabelValue", '--network', $networkName,
  '--publish', "127.0.0.1:${HostPort}:5432",
  '--mount', "type=volume,source=$volumeName,destination=$DataPath",
  '--env', 'POSTGRES_PASSWORD',
  '--memory', '1g', '--memory-swap', '1g', '--cpus', '2', '--pids-limit', '256',
  '--restart', 'no', $Image
))".Trim()
Remove-Item Env:POSTGRES_PASSWORD
$created.containerId = $containerId
Save-Text 'created-resources.json' ($created | ConvertTo-Json)

Assert-Labelled (Invoke-Docker @('inspect', $containerId, '--format', '{{json .Config.Labels}}'))
Assert-Labelled (Invoke-Docker @('network', 'inspect', $networkId, '--format', '{{json .Labels}}'))
Assert-Labelled (Invoke-Docker @('volume', 'inspect', $volumeName, '--format', '{{json .Labels}}'))

if ("$(Invoke-Docker @('network', 'inspect', $networkId, '--format', '{{json .Internal}}'))".Trim() -ne 'false') {
  throw 'Network must not be internal'
}
$ports = ((Invoke-Docker @('inspect', $containerId, '--format', '{{json .NetworkSettings.Ports}}')) -join '') | ConvertFrom-Json
$bindings = @($ports.'5432/tcp')
if ($bindings.Count -ne 1 -or $bindings[0].HostIp -ne '127.0.0.1' -or $bindings[0].HostPort -ne "$HostPort") {
  throw 'Port was not published on loopback exactly as declared'
}

$ready = $false
for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
  & docker exec $containerId pg_isready -q -h 127.0.0.1 -U postgres | Out-Null
  $ready = $LASTEXITCODE -eq 0
  if (-not $ready) { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) { throw 'PostgreSQL did not become ready' }

# Bootstrap superuser stays inside the container; the password reaches psql on stdin only.
$password = Get-RandomHex 32
$bootstrapSql = @"
CREATE ROLE $role LOGIN PASSWORD '$password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE DATABASE $Database OWNER $role TEMPLATE template0 ENCODING 'UTF8';
COMMENT ON DATABASE $Database IS '$Marker';
"@
$bootstrapSql | & docker exec -i $containerId psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Bootstrap SQL failed' }
$bootstrapSql = $null

$url = "postgresql://${role}:${password}@127.0.0.1:${HostPort}/${Database}?sslmode=disable"
ConvertTo-SecureString $url -AsPlainText -Force | ConvertFrom-SecureString |
  Out-File (Join-Path $out 'url.dpapi') -Encoding ascii
$password = $null
$url = $null

$policy = [ordered]@{
  version     = 1
  containerId = $containerId
  ports       = @([ordered]@{ containerPort = '5432/tcp'; hostIp = '127.0.0.1'; hostPort = $HostPort })
  volumes     = @([ordered]@{ name = $volumeName; destination = $DataPath; readOnly = $false })
  networks    = @([ordered]@{ name = $networkName; id = $networkId })
}
Save-Text 'resources.json' ($policy | ConvertTo-Json -Depth 4)
"Provisioned. Policy, IDs and protected URL are in $out"
