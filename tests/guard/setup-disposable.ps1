<#
  Operator tool for separately approved B5 runs. The harness never calls it.
  Creates one new bridge, volume and PostgreSQL container, then the limited role, database and
  marker, and writes the policy plus a DPAPI-protected URL outside Git. It removes and retries
  nothing: on failure created-resources.json stays behind for an exact, owner-approved cleanup.
  A state of "pending" or "unknown" there means the outcome is not known: a stopped or failed
  client proves nothing about what the daemon did, so check that exact name before assuming.
  The bridge is NOT internal: Docker publishes no port on an internal network. The container
  therefore has outbound access; loopback publishing limits inbound access only.
#>
param(
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [ValidateRange(1, 65535)][int]$HostPort = 55499,
  [ValidateRange(1, 600)][int]$CommandTimeoutSeconds = 60
)
$ErrorActionPreference = 'Stop'

# Same engine endpoint as tests/guard/test-environment.mjs.
$Endpoint = 'npipe:////./pipe/docker_engine'
$EngineName = 'docker-desktop'
$EngineOs = 'Docker Desktop'
$Label = 'com.drphynex.migration-guard-test'
$LabelValue = 'disposable-v1'
$Image = 'postgres@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94'
$Database = 'drphynex_migration_guard_test'
$Marker = 'drphynex:migration-guard-test:disposable-v1'
$DataPath = '/var/lib/postgresql/data'
$script:stopReason = 'unexpected-error'
$script:out = $null
$script:ledger = $null
$postgresPassword = $null
$password = $null
$bootstrapSql = $null
$url = $null

# Every message is one of these constants, so no command output or secret can reach the console.
function Stop-Setup([string]$Reason) {
  $script:stopReason = $Reason
  throw $Reason
}

function Get-RandomHex([int]$Bytes) {
  $buffer = New-Object byte[] $Bytes
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  $rng.Dispose()
  -join ($buffer | ForEach-Object { $_.ToString('x2') })
}

function Write-NewFile([string]$Name, [string]$Text) {
  $stream = New-Object IO.FileStream((Join-Path $script:out $Name), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
  try {
    $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes($Text)
    $stream.Write($bytes, 0, $bytes.Length)
  } finally { $stream.Dispose() }
}

function Save-Ledger {
  $file = Join-Path $script:out 'created-resources.json'
  $next = $file + '.next'
  [IO.File]::WriteAllText($next, ($script:ledger | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding($false)))
  if (Test-Path -LiteralPath $file) { [IO.File]::Replace($next, $file, [NullString]::Value) } else { [IO.File]::Move($next, $file) }
}

# .NET Framework takes one command line, so quote by the CommandLineToArgvW rules.
function Join-NativeArguments([string[]]$Arguments) {
  ($Arguments | ForEach-Object {
      if ($_ -match '^[A-Za-z0-9_./:=@,+-]+$') { return $_ }
      '"' + (($_ -replace '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
    }) -join ' '
}

# A plain function on purpose: [Parameter()] would add common parameters, and -d would then bind
# to -Debug instead of reaching Docker. Always call it with one explicit array. This is the only
# place that starts Docker: endpoint, environment and deadline cannot be left out of a call.
# $Secrets lives only in this child's block, so the session environment is never touched.
function Invoke-Docker([string[]]$DockerArgs, [string]$Stdin = '', [hashtable]$Secrets = @{}) {
  $start = New-Object Diagnostics.ProcessStartInfo
  $start.FileName = $script:dockerExe
  $start.Arguments = Join-NativeArguments (@('--host', $Endpoint) + $DockerArgs)
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  # Clearing drops DOCKER_CONTEXT, DOCKER_HOST, DOCKER_TLS* and DOCKER_CERT_PATH with the rest.
  $start.EnvironmentVariables.Clear()
  foreach ($name in 'SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'TEMP', 'TMP') {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value) { $start.EnvironmentVariables[$name] = $value }
  }
  $start.EnvironmentVariables['DOCKER_CONFIG'] = $script:dockerConfig
  foreach ($name in $Secrets.Keys) { $start.EnvironmentVariables[$name] = $Secrets[$name] }

  $limit = $CommandTimeoutSeconds * 1000
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $remaining = { [Math]::Max(0, $limit - [int]$clock.ElapsedMilliseconds) }
  $child = [Diagnostics.Process]::Start($start)
  try {
    # Asynchronous reads: a full pipe must not outlive the deadline.
    $stdout = $child.StandardOutput.ReadToEndAsync()
    $stderr = $child.StandardError.ReadToEndAsync()
    $finished = $true
    try {
      $write = $child.StandardInput.WriteAsync($Stdin)
      $finished = $write.Wait((& $remaining))
      if ($finished) { $child.StandardInput.Close() }
    } catch [Exception] {
      # A child that closed stdin early is judged by its exit code below.
      $finished = $true
    }
    if (-not ($finished -and $child.WaitForExit((& $remaining)) -and $stdout.Wait((& $remaining)) -and $stderr.Wait((& $remaining)))) {
      # Only this process, through the handle Start returned; nothing by name or by tree.
      if (-not $child.HasExited) {
        try { $child.Kill() } catch [Exception] { }
      }
      $script:ledger.childStopped = $child.WaitForExit(5000)
      Stop-Setup 'command-timeout'
    }
    [pscustomobject]@{ ExitCode = $child.ExitCode; Stdout = $stdout.Result }
  } finally {
    $child.Dispose()
  }
}

function Read-Docker([string[]]$DockerArgs) {
  $result = Invoke-Docker $DockerArgs
  if ($result.ExitCode -ne 0) { Stop-Setup 'docker-read-failed' }
  $result.Stdout
}

# The intent is saved first and anything short of a clean answer stays "unknown": docker run can
# fail after the container exists, and a killed client says nothing about the daemon.
function Invoke-Create([string]$Resource, [string[]]$DockerArgs, [string]$Pattern, [string]$Stdin = '', [hashtable]$Secrets = @{}) {
  $entry = $script:ledger.resources[$Resource]
  $entry.state = 'pending'
  $script:ledger.step = $Resource
  Save-Ledger
  try {
    $result = Invoke-Docker $DockerArgs $Stdin $Secrets
  } catch {
    $entry.state = 'unknown'
    throw
  }
  $value = "$($result.Stdout)".Trim()
  if ($result.ExitCode -ne 0 -or $value -notmatch $Pattern) {
    $entry.state = 'unknown'
    Stop-Setup "$Resource-failed"
  }
  $entry.state = 'created'
  Save-Ledger
  $value
}

# PowerShell 5.1 strips quotes from native arguments, so never quote a label into a Go template.
function Assert-Labelled($LabelsJson) {
  if (($LabelsJson | ConvertFrom-Json).$Label -ne $LabelValue) {
    Stop-Setup 'label-mismatch'
  }
}

$exitCode = 1
try {
  # Nothing below touches Docker until OutputDir is proven new and owned by this run.
  $repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path.TrimEnd('\')
  if (-not [IO.Path]::IsPathRooted($OutputDir) -or -not [IO.Path]::GetPathRoot($OutputDir).EndsWith('\')) {
    Stop-Setup 'output-dir-must-be-absolute'
  }
  $script:out = [IO.Path]::GetFullPath($OutputDir).TrimEnd('\')
  if ($script:out -ne $OutputDir.TrimEnd('\')) { Stop-Setup 'output-dir-must-be-canonical' }
  if (($script:out + '\').StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Setup 'output-dir-inside-repository'
  }
  if (-not (Test-Path -LiteralPath (Split-Path $script:out) -PathType Container)) {
    $script:out = $null
    Stop-Setup 'output-dir-parent-missing'
  }
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class B5ExclusiveDirectory {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool CreateDirectoryW(string path, IntPtr security);
}
'@
  # Unlike Directory.CreateDirectory, this fails if the path already exists, with no check-then-act gap.
  if (-not [B5ExclusiveDirectory]::CreateDirectoryW($script:out, [IntPtr]::Zero)) {
    $script:out = $null
    Stop-Setup 'output-dir-must-be-new'
  }

  $suffix = Get-RandomHex 4
  $networkName = "drphynex-b5-test-net-$suffix"
  $volumeName = "drphynex-b5-test-data-$suffix"
  $containerName = "drphynex-b5-test-pg-$suffix"
  $role = "b5_migrator_$suffix"
  $script:ledger = [ordered]@{
    status = 'running'; step = 'engine'; failure = $null; childStopped = $null
    endpoint = $Endpoint; hostPort = $HostPort; image = $Image
    resources = [ordered]@{
      network   = [ordered]@{ name = $networkName; id = $null; state = 'not-attempted' }
      volume    = [ordered]@{ name = $volumeName; state = 'not-attempted' }
      container = [ordered]@{ name = $containerName; id = $null; state = 'not-attempted' }
      database  = [ordered]@{ name = $Database; role = $role; state = 'not-attempted' }
    }
  }
  Save-Ledger

  $script:dockerConfig = Join-Path $script:out 'docker-config'
  [void][IO.Directory]::CreateDirectory($script:dockerConfig)
  Write-NewFile 'docker-config\config.json' "{}`n"
  $script:dockerExe = (Get-Command docker -CommandType Application | Select-Object -First 1).Source

  # One read before the first create: which context the client used and which daemon answered.
  $engine = (Read-Docker @('info', '--format', '{{json .}}')) | ConvertFrom-Json
  if ($engine.ClientInfo.Context -ne 'default' -or $engine.Name -ne $EngineName -or
      $engine.OperatingSystem -ne $EngineOs -or $engine.OSType -ne 'linux' -or $engine.ServerErrors) {
    Stop-Setup 'engine-mismatch'
  }

  $networkId = Invoke-Create 'network' @('network', 'create', '--driver', 'bridge', '--label', "$Label=$LabelValue", $networkName) '^[a-f0-9]{64}$'
  $script:ledger.resources.network.id = $networkId
  Save-Ledger

  [void](Invoke-Create 'volume' @('volume', 'create', '--driver', 'local', '--label', "$Label=$LabelValue", $volumeName) ('^' + [regex]::Escape($volumeName) + '$'))

  $postgresPassword = Get-RandomHex 32
  $containerId = Invoke-Create 'container' @(
    'run', '-d', '--pull', 'never', '--name', $containerName,
    '--label', "$Label=$LabelValue", '--network', $networkName,
    '--publish', "127.0.0.1:${HostPort}:5432",
    '--mount', "type=volume,source=$volumeName,destination=$DataPath",
    '--env', 'POSTGRES_PASSWORD',
    '--memory', '1g', '--memory-swap', '1g', '--cpus', '2', '--pids-limit', '256',
    '--restart', 'no', $Image
  ) '^[a-f0-9]{64}$' '' @{ POSTGRES_PASSWORD = $postgresPassword }
  $postgresPassword = $null
  $script:ledger.resources.container.id = $containerId
  Save-Ledger

  Assert-Labelled (Read-Docker @('inspect', $containerId, '--format', '{{json .Config.Labels}}'))
  Assert-Labelled (Read-Docker @('network', 'inspect', $networkId, '--format', '{{json .Labels}}'))
  Assert-Labelled (Read-Docker @('volume', 'inspect', $volumeName, '--format', '{{json .Labels}}'))

  if ("$(Read-Docker @('network', 'inspect', $networkId, '--format', '{{json .Internal}}'))".Trim() -ne 'false') {
    Stop-Setup 'network-internal'
  }
  $ports = (Read-Docker @('inspect', $containerId, '--format', '{{json .NetworkSettings.Ports}}')) | ConvertFrom-Json
  $bindings = @($ports.'5432/tcp')
  if ($bindings.Count -ne 1 -or $bindings[0].HostIp -ne '127.0.0.1' -or $bindings[0].HostPort -ne "$HostPort") {
    Stop-Setup 'port-not-published'
  }

  $script:ledger.step = 'readiness'
  Save-Ledger
  $ready = $false
  for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
    $ready = (Invoke-Docker @('exec', $containerId, 'pg_isready', '-q', '-h', '127.0.0.1', '-U', 'postgres')).ExitCode -eq 0
    if (-not $ready) { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ready) { Stop-Setup 'postgres-not-ready' }

  # Bootstrap superuser stays inside the container; the password reaches psql on stdin only.
  $password = Get-RandomHex 32
  $bootstrapSql = @"
CREATE ROLE $role LOGIN PASSWORD '$password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE DATABASE $Database OWNER $role TEMPLATE template0 ENCODING 'UTF8';
COMMENT ON DATABASE $Database IS '$Marker';
"@
  [void](Invoke-Create 'database' @('exec', '-i', $containerId, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres') '^$' $bootstrapSql)
  $bootstrapSql = $null

  $url = "postgresql://${role}:${password}@127.0.0.1:${HostPort}/${Database}?sslmode=disable"
  Write-NewFile 'url.dpapi' (ConvertTo-SecureString $url -AsPlainText -Force | ConvertFrom-SecureString)

  $policy = [ordered]@{
    version     = 1
    containerId = $containerId
    ports       = @([ordered]@{ containerPort = '5432/tcp'; hostIp = '127.0.0.1'; hostPort = $HostPort })
    volumes     = @([ordered]@{ name = $volumeName; destination = $DataPath; readOnly = $false })
    networks    = @([ordered]@{ name = $networkName; id = $networkId })
  }
  Write-NewFile 'resources.json' ($policy | ConvertTo-Json -Depth 4)

  $script:ledger.status = 'provisioned'
  Save-Ledger
  "Provisioned. Policy, IDs and protected URL are in $($script:out)"
  $exitCode = 0
} catch {
  # Kept on purpose: the ledger is what an owner-approved cleanup works from.
  if ($script:ledger) {
    $script:ledger.status = 'failed'
    $script:ledger.failure = $script:stopReason
    try { Save-Ledger } catch { $script:stopReason = 'ledger-write-failed' }
  }
  [Console]::Error.WriteLine('Setup stopped: ' + $script:stopReason + '. Nothing was removed or retried.')
} finally {
  # All generated secrets, on every path. The session environment was never changed.
  $postgresPassword = $null
  $password = $null
  $bootstrapSql = $null
  $url = $null
}
exit $exitCode
