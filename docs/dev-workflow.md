# Windows PowerShell developer workflow

## Recommended Git workflow

Prefer `git-safe.ps1` over raw Git commands. Run from normal Windows PowerShell without administrator access:

```powershell
# Status (read-only)
.\scripts\git-safe.ps1 -Action Status
# Repair an idle index lock
.\scripts\git-safe.ps1 -Action FixLock
# Update a clean main checkout
.\scripts\git-safe.ps1 -Action SyncMain
# Start a sprint from updated main
.\scripts\git-safe.ps1 -Action StartSprint -Branch feature/sprint-XX-name
# Finish with validation and a local commit
.\scripts\git-safe.ps1 -Action Finish -Message "Sprint XX: message"
```

From `frontend`, use `..\scripts\git-safe.ps1`; from `scripts`, use `.\git-safe.ps1`. The script resolves its repository from its own path and restores your working directory. Its syntax supports PowerShell 5. The script file uses UTF-8 with BOM so Korean output is readable in Windows PowerShell 5.

SyncMain and StartSprint refuse any tracked, staged or untracked changes before switching branches or pulling. StartSprint refuses an existing branch unless `-ForceExisting` is supplied; that flag switches without resetting or overwriting the branch. Both update main with a fast-forward-only pull. If a pull fails after switching to main, the checkout stays on main; there is no automatic rollback or retry.

FixLock, SyncMain, StartSprint and Finish check for Git processes before lock repair. The only deletion allowed is a regular `.git/index.lock` inside this repository, after another process check. Reparse points and external worktree Git directories are refused. Do not run concurrent Git operations: process checks cannot eliminate races. Status disables optional Git locks and never repairs anything. A permission denial is not necessarily a stale lock, and this wrapper does not change filesystem permissions.

Finish delegates to the existing finish-sprint script, which validates before staging and committing. Existing staged changes are included by Git: review them before finishing. No action pushes, creates PRs, merges branches, rebases, amends, resets, restores or cleans the working tree.

The Codex Windows sandbox can still fail with EPERM or Permission denied. This wrapper reduces lock mistakes; it cannot bypass sandbox permissions. On failure, stop and run the same script from normal Windows PowerShell. Original Git error output and the failing command are printed without automatic retries.

Run these commands in a normal, non-administrator PowerShell at the repository root. Node, npm and Git must already be installed. Scripts locate the repository relative to their own location and restore the caller's working directory on exit. Do not run concurrent Git operations while repairing a lock or finishing a sprint.

## Normal sprint workflow

1. Confirm the current branch and preserve existing changes before starting another sprint.
2. Codex implements and runs validation when permitted.
3. If Codex encounters EPERM, Permission denied, spawn errors, or setup refresh failures, stop rather than retry blindly. Keep all changes and run validation from normal PowerShell.
4. Review the changes, then finish locally only after validation passes.

## One-command validation

```powershell
.\scripts\validate-frontend.ps1
```

Checks repository status and tooling, repairs an idle Git index lock, then runs proxy tests, lint, typecheck, unit tests with one worker, build and `git diff --check` in order. The first failure stops the script; output is preserved. The final success message appears only after all checks pass. No dependencies are installed and no product services are started.

## One-command local finish

```powershell
.\scripts\finish-sprint.ps1 -Message "Sprint XX: message"
```

Runs validation first. On success, stages `frontend`, `docs` and `scripts`, commits locally, and prints status and the latest commit. Review staged changes beforehand: Git commits all staged changes, including anything staged earlier. With no staged changes after staging, prints `No changes to commit` and returns successfully. It never pushes, opens a PR, merges or deploys.

## Diagnose a Git lock

```powershell
.\scripts\dev-preflight.ps1
.\scripts\dev-preflight.ps1 -FixLock
```

`index.lock` protects the index while Git updates it. An interrupted operation may leave a stale lock, but an existing lock is not automatically stale. Preflight reports the repository, branch, status, lock, Git and Codex process counts, frontend manifest, Node and npm versions. Without `-FixLock`, it makes no changes. With that flag, it removes only the exact index lock reported by Git, and only after checking that no Git process is running. Validation explicitly opts into this same repair. This process check cannot eliminate races: do not start another Git operation during repair. A Codex process alone does not establish that a lock is stale.

Never casually run `git reset --hard`, `git restore .` or `git clean -fd`: they can discard unfinished work. These scripts do not reset Git, clean the working tree, modify permissions or request administrator access.

## Component test providers

Use `renderWithProviders` from `@/test/renderWithProviders` for isolated components using application hooks. It supplies an in-memory router, language, display mode, UI, watchlist and market workspace providers, plus static mock news context without a news loader. Testing Library keeps the wrapper on `rerender`.

Clear localStorage in test setup when fresh defaults are required; the helper intentionally preserves storage so persistence tests remain possible. Use fixture data and mocked requests when a component itself requests market data. The helper does not globally disable fetch. Never use real DART, RSS, AI, broker or backend APIs in tests.

Tests rendering `App` already have the runtime providers and router; do not wrap them again. Runtime `AppProviders` is unchanged. When adding a required provider, update this centralized helper and its stability tests. AiCopilot's existing evidence-wiring test uses the helper and fixture market data; stability tests also exercise watchlist context through real `AppProviders` with the news service mocked.

There is no root package.json; the PowerShell entry points are documented directly instead of adding a package solely for aliases.
