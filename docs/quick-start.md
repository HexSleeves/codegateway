# Quick Start Guide

Get CodeGateway up and running in 5 minutes.

## 1. Install the Extension

In VS Code or Cursor:

1. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
2. Search for "CodeGateway"
3. Click **Install**

## 2. Open a Project

Open any TypeScript or JavaScript project. CodeGateway activates automatically
when you open `.ts`, `.tsx`, `.js`, or `.jsx` files.

## 3. See It in Action

CodeGateway immediately starts analyzing your code. You'll see:

- **Wavy underlines** on detected patterns
- **Problems panel** (`Ctrl+Shift+M`) showing all issues
- **Status bar** indicator with pattern counts

![CodeGateway in action](./images/screenshot-inline.png)

## 4. Try a Sample File

Create a test file to see CodeGateway's detection:

```typescript
// test-codegateway.ts

// Generic variable names (warning)
const data = fetchSomething();
const result = process(data);

// Empty catch block (critical)
try {
  riskyOperation();
} catch (error) {
  // TODO: handle error
}

// Hardcoded secret (critical)
const API_KEY = "sk-1234567890abcdef";

// Magic number (info)
const timeout = 86400000;
```

You should see:

- 🔴 2 Critical issues (empty catch, hardcoded secret)
- 🟡 2 Warnings (generic names)
- 🔵 1 Info (magic number)

## 5. Review Detected Patterns

Click on any underlined code or check the Problems panel to see:

- **What** was detected
- **Why** it matters
- **How** to fix it

## 6. Install Git Hooks (Optional)

To analyze code before every commit:

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `CodeGateway: Install Git Hook`
3. Choose whether to also install pre-push hook

Now CodeGateway will:

- Analyze staged files before commit
- Block commits with critical issues (configurable)
- Show a summary of detected patterns

## 7. Trigger a Checkpoint (Optional)

To manually verify your understanding of detected patterns:

1. Open a file with detected patterns
2. Open Command Palette
3. Run `CodeGateway: Trigger Comprehension Checkpoint`

This opens a panel where you can:

- Review all detected patterns
- Acknowledge that you understand each issue
- Skip with an optional reason
- Cancel to go back and fix issues

## Common Commands

| Command | Description |
| ------- | ----------- |
| `CodeGateway: Analyze Current File` | Analyze the active file |
| `CodeGateway: Analyze Workspace` | Analyze all files in workspace |
| `CodeGateway: Clear All Diagnostics` | Clear all CodeGateway markers |
| `CodeGateway: Install Git Hook` | Set up pre-commit analysis |
| `CodeGateway: Trigger Comprehension Checkpoint` | Start a checkpoint review |

## Next Steps

- [Configuration](./configuration.md) - Customize detection rules and severity
- [Pattern Reference](./patterns.md) - Understand all detected patterns
- [Git Integration](./git-integration.md) - Deep dive into hooks and workflows
