<#
  Regression for setup-disposable.ps1 against tests/guard/fake-docker.cs only. No engine, PostgreSQL
  or real credential is used: each case runs a child PowerShell whose PATH holds the fake directory
  and System32. Not part of the pure-memory unit suite, because it starts processes.
#>
param(
  [Parameter(Mandatory = $true)][string]$WorkDir,
  [string]$ScriptPath = ''
)
$ErrorActionPreference = 'Stop'
if (-not $ScriptPath) { $ScriptPath = Join-Path $PSScriptRoot 'setup-disposable.ps1' }

$fakeDir = Join-Path $WorkDir 'fake'
New-Item -ItemType Directory -Force $fakeDir | Out-Null
$fake = Join-Path $fakeDir 'docker.exe'
Add-Type -TypeDefinition (Get-Content -Raw (Join-Path $PSScriptRoot 'fake-docker.cs')) `
  -OutputAssembly $fake -OutputType ConsoleApplication -ReferencedAssemblies 'System.Core'
$powershell = Join-Path $PSHOME 'powershell.exe'
$system32 = Join-Path $env:SystemRoot 'System32'
$Pinned = 'npipe:////./pipe/docker_engine'
$AllowedEnv = @('DOCKER_CONFIG', 'PATH', 'PATHEXT', 'SystemRoot', 'TEMP', 'TMP', 'WINDIR')
$results = New-Object Collections.ArrayList

function Check([string]$Case, [string]$Name, [bool]$Ok) {
  [void]$results.Add([pscustomobject]@{ Case = $Case; Name = $Name; Ok = $Ok })
}

function Get-Calls {
  $log = Join-Path $fakeDir 'calls.log'
  if (-not (Test-Path $log)) { return @() }
  @(Get-Content $log | ForEach-Object {
      $f = $_ -split [char]0x1e
      [pscustomobject]@{ Pid = [int]$f[0]; Argv = @($f[1] -split [char]0x1f); Env = @($f[2] -split ','); Config = $f[3] }
    })
}

function Get-Verb($Call) {
  $argv = @($Call.Argv)
  if ($argv.Count -ge 2 -and $argv[0] -eq '--host') { $argv = @($argv[2..($argv.Count - 1)]) }
  $argv -join ' '
}

function Test-Creating($Call) { (Get-Verb $Call) -match '^(network create|volume create|run|exec -i)' }

# Runs one case in a child PowerShell with poisoned Docker settings and a parent secret sentinel.
function Invoke-Case([string]$Scenario, [string]$Out, [int]$Timeout = 2) {
  Remove-Item (Join-Path $fakeDir 'calls.log'), (Join-Path $fakeDir 'secrets.log') -ErrorAction SilentlyContinue
  Set-Content (Join-Path $fakeDir 'scenario.txt') $Scenario -Encoding ascii
  $evil = Join-Path $WorkDir 'evil-config'
  New-Item -ItemType Directory -Force $evil | Out-Null
  Set-Content (Join-Path $evil 'config.json') '{"currentContext":"remote"}' -Encoding ascii
  $inner = @"
`$env:POSTGRES_PASSWORD = 'PARENT_SENTINEL'
`$env:DOCKER_CONTEXT = 'remote'; `$env:DOCKER_HOST = 'tcp://remote.invalid:2376'
`$env:DOCKER_TLS_VERIFY = '1'; `$env:DOCKER_CERT_PATH = 'C:\evil'; `$env:DOCKER_CONFIG = '$evil'
`$env:PATH = '$fakeDir;$system32'
& '$ScriptPath' -OutputDir '$Out' -CommandTimeoutSeconds $Timeout
'CHILD_EXIT=' + `$LASTEXITCODE
'AFTER_PASSWORD=' + `$env:POSTGRES_PASSWORD
'AFTER_CONTEXT=' + `$env:DOCKER_CONTEXT
"@
  $file = Join-Path $WorkDir 'case.ps1'
  Set-Content $file $inner -Encoding UTF8
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $powershell
  $psi.Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$file`""
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $child = [Diagnostics.Process]::Start($psi)
  $stdout = $child.StandardOutput.ReadToEndAsync()
  $stderr = $child.StandardError.ReadToEndAsync()
  $finished = $child.WaitForExit(30000)
  if (-not $finished) {
    $child.Kill()
    [void]$child.WaitForExit(5000)
    # Only fake processes this case recorded; a hung one would hold the output pipes open.
    Get-Calls | ForEach-Object { Stop-Process -Id $_.Pid -Force -ErrorAction SilentlyContinue }
  }
  [pscustomobject]@{ Finished = $finished; Output = $stdout.Result + $stderr.Result; Calls = Get-Calls }
}

function Read-Ledger([string]$Out) {
  $file = Join-Path $Out 'created-resources.json'
  if (Test-Path $file) { Get-Content -Raw $file | ConvertFrom-Json }
}

function Test-NoRemoval($Run) {
  -not @($Run.Calls | Where-Object { (Get-Verb $_) -match '\b(rm|prune|kill|stop)\b' }).Count
}

# Files written by setup and everything it printed must hold neither secret.
function Test-NoSecret([string]$Case, $Run, [string]$Out) {
  $file = Join-Path $fakeDir 'secrets.log'
  $secrets = if (Test-Path $file) { @(Get-Content $file) } else { @() }
  $text = $Run.Output
  if (Test-Path $Out) {
    Get-ChildItem $Out -Recurse -File | Where-Object { $_.Name -ne 'url.dpapi' } |
      ForEach-Object { $text += [IO.File]::ReadAllText($_.FullName) }
  }
  $leak = @($secrets | Where-Object { $_ -and $text.Contains($_) }).Count
  Check $Case 'no secret in output or plain files' ($leak -eq 0 -and -not $text.Contains('PARENT_SENTINEL='))
}

function Test-ParentEnv([string]$Case, $Run) {
  Check $Case 'parent environment restored' ($Run.Output -match 'AFTER_PASSWORD=PARENT_SENTINEL' -and $Run.Output -match 'AFTER_CONTEXT=remote')
}

# ---- 1. Endpoint ------------------------------------------------------------------------------
$out = Join-Path $WorkDir 'out-ok'
$run = Invoke-Case 'ok' $out
$ledger = Read-Ledger $out
Check 'ok' 'finished and provisioned' ($run.Finished -and $run.Output -match 'CHILD_EXIT=0' -and $ledger.status -eq 'provisioned')
Check 'ok' 'every call pins the endpoint' (@($run.Calls | Where-Object { $_.Argv[0] -ne '--host' -or $_.Argv[1] -ne $Pinned }).Count -eq 0 -and @($run.Calls).Count -gt 0)
$firstCreate = -1
for ($i = 0; $i -lt @($run.Calls).Count; $i++) { if (Test-Creating @($run.Calls)[$i]) { $firstCreate = $i; break } }
Check 'ok' 'engine verified before the first create' ($firstCreate -gt 0 -and (Get-Verb @($run.Calls)[0]) -match '^info')
$extraEnv = @($run.Calls | ForEach-Object { $_.Env } | Where-Object { $_ -and $_ -notin ($AllowedEnv + 'POSTGRES_PASSWORD') } | Select-Object -Unique)
Check 'ok' 'children get only the allowed environment' ($extraEnv.Count -eq 0)
Check 'ok' 'password reaches docker run only' (@($run.Calls | Where-Object { $_.Env -contains 'POSTGRES_PASSWORD' -and (Get-Verb $_) -notmatch '^run ' }).Count -eq 0 -and @($run.Calls | Where-Object { $_.Env -contains 'POSTGRES_PASSWORD' }).Count -eq 1)
$privateConfig = Join-Path $out 'docker-config'
Check 'ok' 'private Docker config on every call' (@($run.Calls | Where-Object { $_.Config -ne $privateConfig }).Count -eq 0)
Check 'ok' 'label reaches Docker unbroken' (@($run.Calls | Where-Object { $_.Argv -contains '{{json .Labels}}' }).Count -ge 2)
Check 'ok' 'credentials and policy written' ((Test-Path (Join-Path $out 'url.dpapi')) -and (Test-Path (Join-Path $out 'resources.json')))
Test-NoSecret 'ok' $run $out
Test-ParentEnv 'ok' $run

foreach ($scenario in 'wrong-engine', 'wrong-context', 'fail:info', 'timeout:info') {
  $out = Join-Path $WorkDir ('out-' + ($scenario -replace ':', '-'))
  $run = Invoke-Case $scenario $out
  Check $scenario 'stops before any create' ($run.Finished -and $run.Output -match 'CHILD_EXIT=1' -and @($run.Calls).Count -ge 1 -and @($run.Calls | Where-Object { Test-Creating $_ }).Count -eq 0)
  Check $scenario 'ledger kept as failed, nothing attempted' ((Read-Ledger $out).status -eq 'failed' -and (Read-Ledger $out).resources.network.state -eq 'not-attempted')
}

# ---- 3. OutputDir -----------------------------------------------------------------------------
$out = Join-Path $WorkDir 'out-existing'
New-Item -ItemType Directory -Force $out | Out-Null
$old = @{ 'created-resources.json' = 'OLD LEDGER'; 'resources.json' = 'OLD POLICY'; 'url.dpapi' = 'OLD CREDENTIAL' }
foreach ($k in $old.Keys) { Set-Content (Join-Path $out $k) $old[$k] -NoNewline }
$run = Invoke-Case 'ok' $out
Check 'existing-dir' 'refused without Docker' ($run.Output -match 'CHILD_EXIT=1' -and @($run.Calls).Count -eq 0)
Check 'existing-dir' 'old artifacts intact' (@($old.Keys | Where-Object { [IO.File]::ReadAllText((Join-Path $out $_)) -ne $old[$_] }).Count -eq 0 -and @(Get-ChildItem $out).Count -eq 3)

$repo = (Resolve-Path (Join-Path (Split-Path $ScriptPath) '..\..')).Path
$invalid = @{
  'inside-repo'    = (Join-Path $repo 'b5-setup-output')
  'missing-parent' = (Join-Path $WorkDir 'no-such-parent\out')
  'relative'       = 'relative-out'
  'not-canonical'  = (Join-Path $WorkDir 'a\..\out-dots')
}
foreach ($case in $invalid.Keys) {
  $run = Invoke-Case 'ok' $invalid[$case]
  Check $case 'refused without Docker or new folder' ($run.Output -match 'CHILD_EXIT=1' -and @($run.Calls).Count -eq 0 -and -not (Test-Path $invalid[$case]))
}

# ---- 4. Deadline and failure ledger -----------------------------------------------------------
$sentinelFlag = Join-Path $fakeDir 'scenario.txt'
Set-Content $sentinelFlag 'idle-sentinel' -Encoding ascii
$sentinel = New-Object Diagnostics.ProcessStartInfo
$sentinel.FileName = $fake
$sentinel.UseShellExecute = $false
$sentinel.CreateNoWindow = $true
$other = [Diagnostics.Process]::Start($sentinel)
Start-Sleep -Milliseconds 500
try {
  $expect = @(
    @{ Scenario = 'timeout:network'; Resource = 'network'; Verb = '^network create' }
    @{ Scenario = 'timeout:volume'; Resource = 'volume'; Verb = '^volume create' }
    @{ Scenario = 'timeout:run'; Resource = 'container'; Verb = '^run ' }
    @{ Scenario = 'fail:run'; Resource = 'container'; Verb = '^run ' }
    @{ Scenario = 'timeout:bootstrap'; Resource = 'database'; Verb = '^exec -i' }
    @{ Scenario = 'fail:bootstrap'; Resource = 'database'; Verb = '^exec -i' }
  )
  foreach ($e in $expect) {
    $case = $e.Scenario
    $out = Join-Path $WorkDir ('out-' + ($case -replace ':', '-'))
    $run = Invoke-Case $case $out
    $ledger = Read-Ledger $out
    Check $case 'exits 1 inside the deadline' ($run.Finished -and $run.Output -match 'CHILD_EXIT=1')
    Check $case 'outcome recorded as unknown' ($ledger.status -eq 'failed' -and $ledger.resources.($e.Resource).state -eq 'unknown')
    Check $case 'no automatic retry' (@($run.Calls | Where-Object { (Get-Verb $_) -match $e.Verb }).Count -eq 1)
    Check $case 'nothing removed' (Test-NoRemoval $run)
    Check $case 'no credential or policy after failure' (-not (Test-Path (Join-Path $out 'url.dpapi')) -and -not (Test-Path (Join-Path $out 'resources.json')))
    if ($case -like 'timeout:*') {
      $timed = @($run.Calls)[-1]
      Check $case 'own child stopped' ($null -eq (Get-Process -Id $timed.Pid -ErrorAction SilentlyContinue))
      Check $case 'unrelated docker process untouched' (-not $other.HasExited)
    }
    Test-NoSecret $case $run $out
    Test-ParentEnv $case $run
  }
} finally {
  if (-not $other.HasExited) { $other.Kill(); [void]$other.WaitForExit(5000) }
}

$failed = @($results | Where-Object { -not $_.Ok })
$results | ForEach-Object { '{0,-4} {1,-18} {2}' -f $(if ($_.Ok) { 'ok' } else { 'FAIL' }), $_.Case, $_.Name }
"checks=$($results.Count) failed=$($failed.Count)"
if ($failed.Count) { exit 1 }
