[CmdletBinding()]
param([Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Message)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Message)) { throw 'Message must not be blank' }
$repoRoot = Split-Path -Parent $PSScriptRoot

function Restore-ExcludedRoadmap {
    $roadmap = 'docs/roadmap.md'
    $changes = @(git --no-optional-locks status --porcelain=v1 -- $roadmap)
    if ($LASTEXITCODE -ne 0) { throw 'git status --porcelain=v1 -- docs/roadmap.md failed' }
    $hasMarkers = $false
    if (Test-Path -LiteralPath $roadmap) {
        $hasMarkers = [bool](Select-String -LiteralPath $roadmap -Pattern '^(<{7}|={7}|>{7}|\|{7})(\s|$)' -Quiet)
    }
    if ($changes.Count -gt 0 -or $hasMarkers) {
        Write-Host 'Discarding roadmap changes: restoring index and working file from HEAD.'
        # Clear staged edits and unmerged index entries first. Plain restore alone
        # would otherwise keep staged roadmap content or fail on a conflict.
        git restore --source=HEAD --staged -- docs/roadmap.md
        if ($LASTEXITCODE -ne 0) { throw 'git restore --source=HEAD --staged -- docs/roadmap.md failed' }
        git restore -- docs/roadmap.md
        if ($LASTEXITCODE -ne 0) { throw 'git restore -- docs/roadmap.md failed' }
        if (Test-Path -LiteralPath $roadmap) {
            if (Select-String -LiteralPath $roadmap -Pattern '^(<{7}|={7}|>{7}|\|{7})(\s|$)' -Quiet) {
                throw 'HEAD roadmap itself contains conflict markers. No validation or commit performed.'
            }
        }
    }
}

Push-Location -LiteralPath $repoRoot
try {
    # Restore before validation, including its git diff --check step.
    Restore-ExcludedRoadmap
    & (Join-Path $PSScriptRoot 'validate-frontend.ps1')
    # Also exclude edits made while validation was running.
    Restore-ExcludedRoadmap
    git status --short
    if ($LASTEXITCODE -ne 0) { throw 'git status --short failed' }
    git add -- frontend scripts
    if ($LASTEXITCODE -ne 0) { throw 'git add frontend scripts failed' }
    # Documents are individually allowlisted; never stage the whole docs folder.
    git add -- docs/dev-workflow.md
    if ($LASTEXITCODE -ne 0) { throw 'git add docs/dev-workflow.md failed' }
    $stagedPaths = @(git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0) { throw 'git diff --cached --name-only failed' }
    $unexpectedPaths = @($stagedPaths | Where-Object { $_ -notmatch '^(frontend/|scripts/|docs/dev-workflow\.md$)' })
    if ($unexpectedPaths.Count -gt 0) {
        throw "Staged files outside the commit allowlist. No commit performed: $($unexpectedPaths -join ', ')"
    }
    git diff --cached --quiet
    $diffExit = $LASTEXITCODE
    if ($diffExit -eq 0) { Write-Host 'No changes to commit'; return }
    if ($diffExit -ne 1) { throw 'git diff --cached --quiet failed' }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }
    git status
    if ($LASTEXITCODE -ne 0) { throw 'git status failed' }
    git log --oneline -1
    if ($LASTEXITCODE -ne 0) { throw 'git log --oneline -1 failed' }
} finally {
    Pop-Location
}
