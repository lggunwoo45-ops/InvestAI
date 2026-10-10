[CmdletBinding()]
param([switch]$FixLock)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $repoRoot
try {
    Write-Host "=== Repository / Git status ==="
    Write-Host "Repository: $repoRoot"
    git branch --show-current
    if ($LASTEXITCODE -ne 0) { throw 'git branch --show-current failed' }
    git status --short
    if ($LASTEXITCODE -ne 0) { throw 'git status --short failed' }
    $lockPath = git rev-parse --path-format=absolute --git-path index.lock
    if ($LASTEXITCODE -ne 0) { throw 'git rev-parse --git-path index.lock failed' }
    $gitProcesses = @(Get-Process -Name git -ErrorAction SilentlyContinue)
    $codexProcesses = @(Get-Process -Name '*codex*' -ErrorAction SilentlyContinue)
    Write-Host "Git processes: $($gitProcesses.Count); Codex processes: $($codexProcesses.Count)"
    $hasLock = Test-Path -LiteralPath $lockPath
    Write-Host "index.lock exists: $hasLock"
    if ($hasLock -and $FixLock) {
        if ($gitProcesses.Count -gt 0) { throw 'Git is running. Lock was not removed.' }
        # Recheck immediately before removing this one exact Git lock file.
        if (@(Get-Process -Name git -ErrorAction SilentlyContinue).Count -gt 0) { throw 'Git started. Lock was not removed.' }
        Remove-Item -LiteralPath $lockPath -ErrorAction Stop
        Write-Host 'Removed idle index.lock. Do not run concurrent Git commands.'
    } elseif ($hasLock) {
        Write-Host 'Close Git operations, then use dev-preflight.ps1 -FixLock if the lock is stale.'
    }
    if (!(Test-Path -LiteralPath (Join-Path $repoRoot 'frontend/package.json'))) { throw 'frontend/package.json not found' }
    Write-Host '=== Node / npm ==='
    node --version
    if ($LASTEXITCODE -ne 0) { throw 'node --version failed' }
    npm --version
    if ($LASTEXITCODE -ne 0) { throw 'npm --version failed' }
    Write-Host '=== Preflight done ==='
} finally {
    Pop-Location
}
