# VS Code Commands Reference

All commands available in CodeGateway for VS Code and Cursor.

## Accessing Commands

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "CodeGateway" to filter commands
3. Select the command to run

## Analysis Commands

### `CodeGateway: Analyze Current File`

**Command ID:** `codegateway.analyzeFile`

Analyzes the currently active file immediately, bypassing debounce.

**Usage:**
- Open a TypeScript/JavaScript file
- Run the command
- Results appear in Problems panel and inline

**Output:** Shows notification with pattern count.

---

### `CodeGateway: Analyze Workspace`

**Command ID:** `codegateway.analyzeWorkspace`

Analyzes all TypeScript/JavaScript files in the workspace.

**Usage:**
- Run the command
- Progress shown in notification
- Can be cancelled mid-analysis

**Output:** Summary of total files analyzed and patterns found.

**Note:** May take time for large projects. Uses `excludePaths` setting.

---

### `CodeGateway: Analyze Staged Files`

**Command ID:** `codegateway.analyzeStagedFiles`

Analyzes only files that are staged for commit (git index).

**Usage:**
- Stage files with `git add`
- Run the command
- Review results before committing

**Requirements:** Must be in a git repository.

---

### `CodeGateway: Clear All Diagnostics`

**Command ID:** `codegateway.clearDiagnostics`

Removes all CodeGateway markers from Problems panel and inline decorations.

**Usage:**
- Run command to clear all markers
- Analysis will re-run on next file change/save

**Use case:** Reset state or temporarily hide all warnings.

---

## Git Commands

### `CodeGateway: Install Git Hook`

**Command ID:** `codegateway.installGitHook`

Installs the pre-commit hook for automatic analysis before commits.

**Behavior:**
1. Checks if in a git repository
2. If hook exists, offers to update
3. Asks about pre-push hook installation
4. Installs hook with current settings

**Settings used:**
- `codegateway.blockOnCritical`
- `codegateway.blockOnWarning`
- `codegateway.showCheckpoint`
- `codegateway.minSeverity`

---

### `CodeGateway: Uninstall Git Hook`

**Command ID:** `codegateway.uninstallGitHook`

Removes CodeGateway git hooks.

**Behavior:**
1. Removes CodeGateway pre-commit hook
2. Removes CodeGateway pre-push hook
3. Preserves any original hooks that were present

---

## Checkpoint Commands

### `CodeGateway: Trigger Comprehension Checkpoint`

**Command ID:** `codegateway.triggerCheckpoint`

Opens the checkpoint panel for the current file.

**Usage:**
1. Open a file with detected patterns
2. Run the command
3. Review patterns in the checkpoint panel
4. Acknowledge issues or skip/cancel

**Panel features:**
- Grouped by severity (critical, warning, info)
- Code snippets for each pattern
- Explanations and suggestions
- Acknowledge checkboxes
- Skip with optional reason

---

### `CodeGateway: Show Dashboard`

**Command ID:** `codegateway.showDashboard`

Opens the CodeGateway metrics dashboard.

**Status:** Coming in Phase 5

**Planned features:**
- Checkpoint pass rate over time
- Most common patterns
- Weekly activity
- Export options

---

## Keyboard Shortcuts

No default keyboard shortcuts are assigned. To add your own:

1. Open Keyboard Shortcuts (`Ctrl+K Ctrl+S`)
2. Search for "codegateway"
3. Click the + icon to add a binding

**Suggested bindings:**

```json
// keybindings.json
[
  {
    "key": "ctrl+shift+g a",
    "command": "codegateway.analyzeFile"
  },
  {
    "key": "ctrl+shift+g c",
    "command": "codegateway.triggerCheckpoint"
  },
  {
    "key": "ctrl+shift+g s",
    "command": "codegateway.analyzeStagedFiles"
  }
]
```

## Context Menu

CodeGateway adds an entry to the editor context menu:

- Right-click in editor → **CodeGateway: Analyze Current File**

## Command Palette Tips

### Quick Access

Type partial matches:
- `cg analyze` → matches analysis commands
- `cg git` → matches git commands
- `cg check` → matches checkpoint

### Recent Commands

Recently used commands appear at the top of Command Palette.

## Programmatic Access

Commands can be invoked from other extensions:

```typescript
import * as vscode from 'vscode';

// Run CodeGateway analysis
await vscode.commands.executeCommand('codegateway.analyzeFile');

// Install git hook
await vscode.commands.executeCommand('codegateway.installGitHook');
```

## Next Steps

- [Configuration](./configuration.md) - Customize command behavior
- [CLI Reference](./cli.md) - Command-line alternatives
