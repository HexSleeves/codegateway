# Configuration Guide

CodeGateway is highly configurable. This guide covers all settings and how to
customize them for your workflow.

## Accessing Settings

### Via VS Code Settings UI

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "codegateway"
3. Modify settings as needed

### Via settings.json

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `Preferences: Open Settings (JSON)`
3. Add CodeGateway settings

## All Settings

### Pattern Detection

#### `codegateway.enabledPatterns`

Array of pattern types to detect. Remove patterns you don't want to see.

```json
{
  "codegateway.enabledPatterns": [
    "generic_variable_name",
    "inconsistent_naming",
    "empty_catch_block",
    "swallowed_error",
    "missing_error_boundary",
    "generic_error_message",
    "hardcoded_secret",
    "sql_concatenation",
    "unsafe_eval",
    "insecure_random",
    "magic_number",
    "todo_without_context",
    "commented_out_code",
    "overly_complex_function",
    "placeholder_implementation"
  ]
}
```

To disable specific patterns, remove them from the array:

```json
{
  "codegateway.enabledPatterns": [
    "empty_catch_block",
    "hardcoded_secret",
    "unsafe_eval"
  ]
}
```

#### `codegateway.minSeverity`

Minimum severity level to display. Options: `"info"`, `"warning"`, `"critical"`

```json
{
  "codegateway.minSeverity": "warning"
}
```

| Value | Shows |
| ----- | ----- |
| `"info"` | All patterns (info, warning, critical) |
| `"warning"` | Warnings and critical only |
| `"critical"` | Critical patterns only |

#### `codegateway.excludePaths`

Glob patterns for paths to exclude from analysis.

```json
{
  "codegateway.excludePaths": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/coverage/**",
    "**/*.min.js",
    "**/vendor/**"
  ]
}
```

### Analysis Triggers

#### `codegateway.analyzeOnSave`

Automatically analyze files when saved.

```json
{
  "codegateway.analyzeOnSave": true
}
```

#### `codegateway.analyzeOnOpen`

Automatically analyze files when opened.

```json
{
  "codegateway.analyzeOnOpen": true
}
```

#### `codegateway.debounceMs`

Delay before analyzing after typing stops (milliseconds).

```json
{
  "codegateway.debounceMs": 500
}
```

Lower values = faster feedback, higher CPU usage.
Higher values = less CPU, delayed feedback.

### Visual Settings

#### `codegateway.showInlineHints`

Show wavy underlines on detected patterns.

```json
{
  "codegateway.showInlineHints": true
}
```

### Git Integration

#### `codegateway.blockOnCritical`

Block git commits when critical issues are found.

```json
{
  "codegateway.blockOnCritical": true
}
```

#### `codegateway.blockOnWarning`

Block git commits when warnings are found.

```json
{
  "codegateway.blockOnWarning": false
}
```

#### `codegateway.showCheckpoint`

Show comprehension checkpoint UI before commit.

```json
{
  "codegateway.showCheckpoint": true
}
```

### Detector Customization

These settings allow you to extend the built-in detection patterns with your own custom values.

#### `codegateway.genericVariableNames`

Additional variable names to flag as generic. These are **added** to the built-in list (`data`, `result`, `temp`, `item`, etc.).

```json
{
  "codegateway.genericVariableNames": ["info", "input", "output", "params"]
}
```

#### `codegateway.loopVariableNames`

Additional single-letter variable names allowed in loop contexts. These are **added** to the built-in list (`i`, `j`, `k`, `n`, `m`).

```json
{
  "codegateway.loopVariableNames": ["l", "p", "q"]
}
```

#### `codegateway.coordinateVariableNames`

Additional variable names allowed for coordinates/math contexts. These are **added** to the built-in list (`x`, `y`, `z`, `w`).

```json
{
  "codegateway.coordinateVariableNames": ["u", "v", "r", "theta"]
}
```

#### `codegateway.genericErrorMessages`

Additional error message patterns to flag as generic. These are **added** to the built-in list (`"something went wrong"`, `"an error occurred"`, etc.).

```json
{
  "codegateway.genericErrorMessages": ["operation failed", "try again later", "contact support"]
}
```

#### `codegateway.secretPatterns`

Additional regex patterns to detect hardcoded secrets. These are **added** to the built-in patterns for API keys, passwords, tokens, etc.

```json
{
  "codegateway.secretPatterns": [
    "my_service_key\\s*=\\s*[\"'][^\"\']+[\"\']",
    "CUSTOM_TOKEN_[A-Z0-9]+"
  ]
}
```

> **Note:** Patterns are JavaScript regular expressions. Remember to double-escape backslashes in JSON.

## Configuration Profiles

### Strict Mode (Teams/Production)

Maximum detection, block on issues:

```json
{
  "codegateway.minSeverity": "info",
  "codegateway.blockOnCritical": true,
  "codegateway.blockOnWarning": true,
  "codegateway.showCheckpoint": true,
  "codegateway.analyzeOnSave": true,
  "codegateway.analyzeOnOpen": true
}
```

### Balanced Mode (Default)

Good balance of feedback and flow:

```json
{
  "codegateway.minSeverity": "info",
  "codegateway.blockOnCritical": true,
  "codegateway.blockOnWarning": false,
  "codegateway.showCheckpoint": true,
  "codegateway.analyzeOnSave": true,
  "codegateway.analyzeOnOpen": true
}
```

### Minimal Mode (Learning/Exploration)

Only critical issues, no blocking:

```json
{
  "codegateway.minSeverity": "critical",
  "codegateway.blockOnCritical": false,
  "codegateway.blockOnWarning": false,
  "codegateway.showCheckpoint": false,
  "codegateway.analyzeOnSave": true,
  "codegateway.analyzeOnOpen": false
}
```

### Security-Focused

Only security-related patterns:

```json
{
  "codegateway.enabledPatterns": [
    "hardcoded_secret",
    "sql_concatenation",
    "unsafe_eval",
    "insecure_random"
  ],
  "codegateway.minSeverity": "warning",
  "codegateway.blockOnCritical": true
}
```

### Domain-Specific (Graphics/Math)

Allow common graphics/math variable names:

```json
{
  "codegateway.coordinateVariableNames": ["u", "v", "r", "theta", "phi"],
  "codegateway.loopVariableNames": ["t"]
}
```

### Custom Secret Detection

Add company-specific secret patterns:

```json
{
  "codegateway.secretPatterns": [
    "ACME_API_KEY_[A-Za-z0-9]+",
    "internal_token\\s*[:=]\\s*[\"'][^\"\']+[\"\']"
  ]
}
```

## Workspace vs User Settings

### User Settings (Global)

Applies to all projects. Good for personal preferences.

Location: `~/.config/Code/User/settings.json`

### Workspace Settings (Per-Project)

Applies to a specific project. Good for team standards.

Location: `.vscode/settings.json` in project root

```json
// .vscode/settings.json
{
  "codegateway.minSeverity": "warning",
  "codegateway.blockOnCritical": true,
  "codegateway.excludePaths": [
    "**/generated/**",
    "**/migrations/**"
  ]
}
```

Commit this file to share settings with your team.

## Environment-Specific Configuration

### Disable in CI/CD

The extension only runs in VS Code. For CI, use the CLI:

```bash
codegateway analyze . --severity warning --fail-on critical
```

### Different Settings for Different Projects

Use workspace settings (`.vscode/settings.json`) in each project.

## Troubleshooting Configuration

### Settings Not Taking Effect

1. Reload VS Code (`Ctrl+Shift+P` → `Developer: Reload Window`)
2. Check for syntax errors in settings.json
3. Verify setting names are correct (case-sensitive)

### Too Many/Few Patterns Detected

- Adjust `minSeverity` to filter by importance
- Modify `enabledPatterns` to include/exclude specific patterns
- Add paths to `excludePaths` for generated code

### Performance Issues

- Increase `debounceMs` (e.g., 1000)
- Disable `analyzeOnOpen` for large projects
- Add large directories to `excludePaths`

## Next Steps

- [Pattern Reference](./patterns.md) - Understand what each pattern means
- [Git Integration](./git-integration.md) - Configure pre-commit hooks
- [CLI Reference](./cli.md) - Configuration for command-line usage
