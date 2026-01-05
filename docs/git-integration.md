# Git Integration

CodeGateway integrates with Git to analyze code before commits and pushes,
helping you catch issues before they enter your codebase.

## Overview

CodeGateway provides:

- **Pre-commit hook** - Analyzes staged files before each commit
- **Pre-push hook** - Analyzes changes before pushing to remote
- **Staged file analysis** - On-demand analysis of what you're about to commit

## Installing Git Hooks

### Via VS Code (Staged Files) Uninstall Command

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `CodeGateway: Install Git Hook`
3. Optionally install pre-push hook when prompted

### What Gets Installed

The hook is installed at `.git/hooks/pre-commit` and:

- Extracts staged file contents to a temp directory
- Runs CodeGateway analysis
- Reports findings with color-coded output
- Optionally blocks the commit based on severity

## Pre-Commit Hook Behavior

### Default Behavior

By default, the pre-commit hook:

1. ✅ Analyzes all staged `.ts`, `.tsx`, `.js`, `.jsx` files
2. ✅ Shows a summary of detected patterns
3. ✅ **Blocks** commits with critical issues
4. ✅ **Allows** commits with warnings (with notification)
5. ✅ Prompts for confirmation if issues found

### Example Output

```bash
CodeGateway: Analyzing staged files...

═══════════════════════════════════════════════════════════
  CodeGateway Analysis Results
═══════════════════════════════════════════════════════════
  ● Critical: 1 issues
  ● Warnings: 3 issues
  ● Info: 2 issues
═══════════════════════════════════════════════════════════

Commit blocked: 1 critical issue(s) found
Run 'codegateway analyze' to see details, or use --no-verify to bypass
```

## Configuration

### VS Code Settings

Configure hook behavior in VS Code settings:

```json
{
  // Block commit on critical issues (default: true)
  "codegateway.blockOnCritical": true,

  // Block commit on warnings (default: false)
  "codegateway.blockOnWarning": false,

  // Show checkpoint confirmation (default: true)
  "codegateway.showCheckpoint": true,

  // Minimum severity to report (default: "warning")
  "codegateway.minSeverity": "warning"
}
```

### Re-installing After Config Change

After changing settings, re-install the hook to apply changes:

1. Run `CodeGateway: Install Git Hook`
2. Choose "Update hook" when prompted

## Bypassing the Hook

### For a Single Commit

Use Git's `--no-verify` flag:

```bash
git commit --no-verify -m "WIP: temporary commit"
```

### Temporarily Disable

Rename or remove the hook:

```bash
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
```

Re-enable:

```bash
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
```

## Analyzing Staged Files On-Demand

Without committing, you can analyze what's staged:

### Via VS Code (Staged Files) Uninstall

1. Stage your changes (`git add ...`)
2. Open Command Palette
3. Run `CodeGateway: Analyze Staged Files`

### Via CLI

```bash
# Analyze staged changes
git diff --cached --name-only | xargs codegateway analyze
```

## Pre-Push Hook

The pre-push hook provides a final check before code reaches the remote:

### Behavior

- Analyzes all commits being pushed
- Only blocks on critical issues (configurable)
- Runs faster than pre-commit (analyzes current working directory)

### Installation

When installing the pre-commit hook, you'll be asked if you also want the
pre-push hook.

Or install separately by editing `.git/hooks/pre-push`.

## Uninstalling Hooks

### Via VS Code (Staged Files) Uninstall

1. Open Command Palette
2. Run `CodeGateway: Uninstall Git Hook`

### Manually

```bash
rm .git/hooks/pre-commit
rm .git/hooks/pre-push
```

## Preserving Existing Hooks

If you already have a pre-commit hook, CodeGateway will:

1. Detect the existing hook
2. Chain them together (CodeGateway runs first)
3. Preserve the original hook content

When uninstalling, the original hook is restored.

## Team Setup

To ensure everyone on your team has the hook:

### Option 1: Documented Installation

Add to your project's README:

```markdown
## Development Setup

1. Install dependencies: `npm install`
2. Install CodeGateway hook: In VS Code, run `CodeGateway: Install Git Hook`
```

### Option 2: Husky (Recommended for Teams)

Use [Husky](https://typicode.github.io/husky/) to manage hooks in version control:

```bash
# Install husky
npm install -D husky
npx husky install

# Add CodeGateway to pre-commit
npx husky add .husky/pre-commit
"npx @codegateway/cli analyze --staged --fail-on critical"
```

This ensures everyone gets the hook automatically via `npm install`.

### Option 3: lint-staged

Combine with [lint-staged](https://github.com/okonet/lint-staged) for efficient
analysis:

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "codegateway analyze --fail-on critical"
    ]
  }
}
```

## Troubleshooting

### Hook Not Running

1. Check hook exists: `ls -la .git/hooks/pre-commit`
2. Check it's executable: `chmod +x .git/hooks/pre-commit`
3. Check for errors: `cat .git/hooks/pre-commit`

### Hook Runs But Doesn't Block

Verify settings:

```json
{
  "codegateway.blockOnCritical": true
}
```

Then re-install the hook.

### "CodeGateway CLI not found"

The hook tries multiple methods:

1. Global `codegateway` command
2. `bunx @codegateway/cli`
3. `npx @codegateway/cli`

Install the CLI globally to avoid npx overhead:

```bash
npm install -g @codegateway/cli
```

### Slow Commits

If analysis is slow:

1. Increase `debounceMs` in settings
2. Add large directories to `excludePaths`
3. Install CLI globally (avoids npx download time)

## Next Steps

- [Checkpoints](./checkpoints.md) - Comprehension verification workflow
- [CLI Reference](./cli.md) - Command-line options for CI/CD
- [Team Setup](./team-setup.md) - Rolling out to your team
