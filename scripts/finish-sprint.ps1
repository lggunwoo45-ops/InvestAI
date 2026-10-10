[CmdletBinding()]
param([Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Message)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Message)) { throw 'Message must not be blank' }
$repoRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'validate-frontend.ps1')
Push-Location -LiteralPath $repoRoot
try {
    git status --short
    if ($LASTEXITCODE -ne 0) { throw 'git status --short failed' }
    git add -- frontend docs scripts
    if ($LASTEXITCODE -ne 0) { throw 'git add frontend docs scripts failed' }
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
