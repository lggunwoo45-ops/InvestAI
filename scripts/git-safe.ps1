[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Status', 'FixLock', 'SyncMain', 'StartSprint', 'Finish')]
    [string]$Action,
    [string]$Branch,
    [string]$Message,
    [switch]$ForceExisting
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))

function Invoke-SafeGit {
    param([string[]]$Arguments, [switch]$Capture, [int[]]$AllowedExitCodes = @(0))
    $commandLabel = 'git ' + ($Arguments -join ' ')
    # PS 5 treats redirected native stderr as ErrorRecord objects. Preserve it,
    # and use the native exit code rather than terminating on a stderr message.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& git @Arguments 2>&1)
        $commandExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($AllowedExitCodes -notcontains $commandExit) {
        foreach ($line in $output) { Write-Host $line.ToString() }
        throw "Failed command: $commandLabel (exit $commandExit). No retry performed."
    }
    if ($Capture) { return $output }
    foreach ($line in $output) { Write-Host $line.ToString() }
}

function Get-GitProcesses {
    return @(Get-Process -Name 'git', 'git-*' -ErrorAction SilentlyContinue)
}

function Repair-IndexLock {
    Write-Host '=== Git lock check / Git 잠금 확인 ==='
    if (@(Get-GitProcesses).Count -gt 0) { throw 'Git process is running. Stop Git operations before trying again. No lock removed.' }
    if (Test-Path -LiteralPath $script:lockPath) {
        if (@(Get-GitProcesses).Count -gt 0) { throw 'Git process started. No lock removed.' }
        $lockItem = Get-Item -LiteralPath $script:lockPath -Force
        if ($lockItem.PSIsContainer -or ($lockItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
            throw 'index.lock is not a regular file. Nothing removed.'
        }
        Remove-Item -LiteralPath $script:lockPath -Force -ErrorAction Stop
        Write-Host 'Removed idle index.lock only.'
    } else {
        Write-Host 'No index.lock found. Nothing removed.'
    }
}

function Assert-CleanTree {
    $changes = @(Invoke-SafeGit -Arguments @('status', '--porcelain=v1', '--untracked-files=all') -Capture)
    if ($changes.Count -gt 0) {
        foreach ($line in $changes) { Write-Host $line.ToString() }
        throw 'Uncommitted changes found. Preserve and finish them first; no branch switch or pull performed.'
    }
}

function Sync-MainBranch {
    Assert-CleanTree
    Write-Host '=== Sync main / main 최신화 ==='
    Invoke-SafeGit -Arguments @('switch', 'main')
    Invoke-SafeGit -Arguments @('pull', '--ff-only', 'origin', 'main')
    Invoke-SafeGit -Arguments @('log', '--oneline', '-1')
}

Push-Location -LiteralPath $repoRoot
try {
    $actualRoot = [string](Invoke-SafeGit -Arguments @('rev-parse', '--show-toplevel') -Capture)
    if ([System.IO.Path]::GetFullPath($actualRoot) -ne $repoRoot) { throw 'Script must belong to this repository root.' }
    $gitDir = [string](Invoke-SafeGit -Arguments @('rev-parse', '--absolute-git-dir') -Capture)
    $expectedGitDir = [System.IO.Path]::GetFullPath((Join-Path $repoRoot '.git'))
    if ([System.IO.Path]::GetFullPath($gitDir) -ne $expectedGitDir) {
        throw 'External worktree Git directory is outside this repository. No lock access or removal performed.'
    }
    $script:lockPath = Join-Path $expectedGitDir 'index.lock'
    switch ($Action) {
        'Status' {
            Write-Host '=== Current status / 현재 상태 확인 ==='
            Write-Host "Repository: $repoRoot"
            Invoke-SafeGit -Arguments @('branch', '--show-current')
            # --no-optional-locks keeps this diagnostic action read-only.
            Invoke-SafeGit -Arguments @('--no-optional-locks', 'status', '--short', '--branch')
            Write-Host "index.lock exists: $(Test-Path -LiteralPath $script:lockPath)"
            Write-Host "Git processes: $(@(Get-GitProcesses).Count)"
            Write-Host "Codex processes: $(@(Get-Process -Name '*codex*' -ErrorAction SilentlyContinue).Count)"
        }
        'FixLock' { Repair-IndexLock }
        'SyncMain' {
            Repair-IndexLock
            Sync-MainBranch
        }
        'StartSprint' {
            if ([string]::IsNullOrWhiteSpace($Branch) -or $Branch.StartsWith('-')) { throw 'A valid -Branch is required.' }
            Invoke-SafeGit -Arguments @('check-ref-format', '--branch', $Branch)
            Repair-IndexLock
            Assert-CleanTree
            $existing = @(Invoke-SafeGit -Arguments @('for-each-ref', '--format=%(refname)', "refs/heads/$Branch") -Capture) -contains "refs/heads/$Branch"
            if ($existing -and !$ForceExisting) { throw 'Branch already exists. Use -ForceExisting to switch to it without resetting it.' }
            Sync-MainBranch
            Assert-CleanTree
            Write-Host '=== Sprint branch / 브랜치 생성 ==='
            if ($existing) { Invoke-SafeGit -Arguments @('switch', $Branch) }
            else { Invoke-SafeGit -Arguments @('switch', '-c', $Branch) }
            Invoke-SafeGit -Arguments @('branch', '--show-current')
            Invoke-SafeGit -Arguments @('--no-optional-locks', 'status', '--short', '--branch')
        }
        'Finish' {
            if ([string]::IsNullOrWhiteSpace($Message)) { throw 'A nonblank -Message is required.' }
            Repair-IndexLock
            Write-Host '=== Validate and commit / 검증 및 커밋 ==='
            Write-Host 'Roadmap edits/conflicts will be discarded before validation. docs/roadmap.md is excluded from commits.'
            Write-Host 'Commit allowlist: frontend/, scripts/, docs/dev-workflow.md only.'
            # Delegate restoration and staged-file enforcement to the same entry
            # point used by direct finish-sprint callers. Do not stage here.
            & (Join-Path $PSScriptRoot 'finish-sprint.ps1') -Message $Message
        }
    }
    Write-Host '=== Done / 완료 ==='
} catch {
    Write-Host "Stopped: $($_.Exception.Message)" -ForegroundColor Red
    throw
} finally {
    Pop-Location
}
