[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath (Join-Path $repoRoot 'frontend/package.json'))) { throw 'frontend/package.json not found' }

# This explicitly requests idle-lock repair. Never run validation beside a Git operation.
& (Join-Path $PSScriptRoot 'dev-preflight.ps1') -FixLock
Push-Location -LiteralPath (Join-Path $repoRoot 'frontend')
try {
    $checks = @(
        @{ Title = 'Proxy tests'; Arguments = @('run', 'test:proxy') },
        @{ Title = 'Lint'; Arguments = @('run', 'lint') },
        @{ Title = 'Typecheck'; Arguments = @('run', 'typecheck') },
        @{ Title = 'Unit tests'; Arguments = @('run', 'test', '--', '--maxWorkers=1') },
        @{ Title = 'Build'; Arguments = @('run', 'build') }
    )
    foreach ($check in $checks) {
        Write-Host "=== $($check.Title) ==="
        $npmArguments = $check.Arguments
        & npm @npmArguments
        if ($LASTEXITCODE -ne 0) { throw "npm $($npmArguments -join ' ') failed (exit $LASTEXITCODE). Validation stopped." }
    }
    Write-Host '=== Diff check ==='
    git -C $repoRoot diff --check
    if ($LASTEXITCODE -ne 0) { throw 'git diff --check failed. Validation stopped.' }
    Write-Host '=== Done: all frontend validation checks passed ==='
} finally {
    Pop-Location
}
