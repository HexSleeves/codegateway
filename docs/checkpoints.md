# Comprehension Checkpoints

Checkpoints are CodeGateway's way of ensuring you understand the code before it
enters your codebase. This guide explains how checkpoints work and how to use
them effectively.

## What is a Checkpoint?

A checkpoint is a verification step that:

1. Shows all detected patterns in your code
2. Asks you to acknowledge that you understand each issue
3. Records your response for metrics and learning
4. Optionally blocks commits until acknowledged

## When Checkpoints Trigger

### Automatic (Pre-commit)

When you have the git hook installed and commit code with detected patterns:

```bash
$ git commit -m "Add user service"

CodeGateway: Analyzing staged files...

═══════════════════════════════════
  CodeGateway Analysis Results
═══════════════════════════════════
  ● Critical: 1 issues
  ● Warnings: 2 issues
═══════════════════════════════════

Do you understand the flagged issues? (y/n)
```

### Manual

Trigger a checkpoint anytime:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `CodeGateway: Trigger Comprehension Checkpoint`

## The Checkpoint Panel

When triggered from VS Code, a checkpoint panel opens showing:

### Header

- File being reviewed
- Summary counts (critical, warning, info)

### Pattern Cards

Each detected pattern shows:

- **Severity badge** - Color-coded importance
- **Pattern type** - What was detected
- **Location** - Line number
- **Description** - What the issue is
- **Code snippet** - The problematic code
- **Explanation** - Why it matters
- **Suggestion** - How to fix it (when available)
- **Acknowledge checkbox** - Confirm understanding

### Actions

- **Proceed** - Continue with commit (requires acknowledging critical issues)
- **Skip** - Skip checkpoint with optional reason
- **Cancel** - Abort and return to editor

## Acknowledging Patterns

### Critical Patterns

Must be acknowledged before proceeding. The "Proceed" button is disabled until
all critical patterns are checked.

### Warnings and Info

Pre-checked by default. Uncheck if you want to flag for later review.

## Skipping Checkpoints

Sometimes you need to skip:

- False positive detection
- Intentional code pattern
- Time-sensitive commit
- Will fix in follow-up

### How to Skip

1. Click "Skip checkpoint"
2. Optionally enter a reason
3. Click "Confirm skip"

### Skip Reasons

Providing a reason helps:

- Track why patterns were skipped
- Identify false positives for improvement
- Maintain accountability

Example reasons:

- "False positive - this is test data"
- "Intentional empty catch for cleanup"
- "Will address in JIRA-123"
- "Time-sensitive hotfix"

## Checkpoint History

CodeGateway tracks checkpoint results:

- Total checkpoints triggered
- Pass/fail/skip counts
- Patterns encountered
- Time spent reviewing
- Skip reasons

View history in the Dashboard (coming in Phase 5).

## Configuration

### Enable/Disable Checkpoints

```json
{
  "codegateway.showCheckpoint": true
}
```

### Require Checkpoints for Commit

```json
{
  "codegateway.blockOnCritical": true,
  "codegateway.blockOnWarning": false
}
```

## Checkpoint Workflow

### Recommended Flow

1. **Write code** (possibly with AI assistance)
2. **Stage changes** (`git add`)
3. **Commit** (`git commit`)
4. **Review checkpoint** (if issues found)
5. **Either:**
   - Fix issues and re-commit
   - Acknowledge and proceed
   - Skip with reason

### Team Workflow

For teams, consider:

1. Enable checkpoints for all developers
2. Block on critical issues
3. Review skip reasons in weekly retrospectives
4. Track metrics to identify common AI patterns

## Best Practices

### Do

- ✅ Actually read each pattern before acknowledging
- ✅ Provide meaningful skip reasons
- ✅ Fix critical issues when possible
- ✅ Use checkpoints as learning opportunities

### Don't

- ❌ Blindly acknowledge all patterns
- ❌ Always skip without reading
- ❌ Disable checkpoints to "move faster"
- ❌ Ignore patterns you don't understand

## Questions in Checkpoints (Coming Soon)

Phase 4 will add comprehension questions:

- **Multiple choice** - "What does this code do?"
- **Code trace** - "What value does X have after line 5?"
- **Free text** - "Explain why this pattern is problematic"

These help verify genuine understanding, not just checkbox clicking.

## Metrics and Insights (Coming Soon)

Phase 5 will add:

- Checkpoint pass rate over time
- Most skipped patterns
- Average review time
- Correlation with production issues

## Troubleshooting

### Checkpoint Not Appearing

1. Check `showCheckpoint` is enabled
2. Verify git hook is installed
3. Ensure file has detected patterns

### Can't Proceed

The "Proceed" button is disabled when:

- Critical patterns aren't acknowledged
- Analysis is still running

### Panel Doesn't Close

Click "Proceed", "Skip", or "Cancel" to close.

## Next Steps

- [Git Integration](./git-integration.md) - Set up pre-commit hooks
- [Configuration](./configuration.md) - Customize checkpoint behavior
- [Pattern Reference](./patterns.md) - Understand what's being detected
