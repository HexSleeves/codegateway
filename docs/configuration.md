# Configuration Guide

CodeGateway is configured via a JSON config file in your project. This guide covers
all settings and how to customize them for your workflow.

## Config File Locations

CodeGateway searches for configuration in this order:

1. `codegateway.config.json`
2. `.codegaterc.json`
3. `.codegaterc`
4. `package.json` (under `"codegateway"` key)

The search starts in the current directory and traverses up to the filesystem root.

## Creating a Config File

### Via CLI

```bash
codegateway init
```

This creates `codegateway.config.json` with sensible defaults.

### Via VS Code

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `CodeGateway: Create Config File`

### Manually

Create `codegateway.config.json` in your project root:

```json
{
  "minSeverity": "info",
  "exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ],
  "blockOnCritical": true
}
```

## All Settings

### Pattern Detection

#### `enabledPatterns`

Array of pattern types to detect. If not specified, all patterns are enabled.

```json
{
  "enabledPatterns": [
    "empty_catch_block",
    "hardcoded_secret",
    "unsafe_eval",
    "generic_variable_name"
  ]
}
```

See [Pattern Reference](./patterns.md) for the full list of pattern types.

#### `minSeverity`

Minimum severity level to report. Options: `"info"`, `"warning"`, `"critical"`

```json
{
  "minSeverity": "warning"
}
```

| Value | Shows |
| ----- | ----- |
| `"info"` | All patterns (info, warning, critical) |
| `"warning"` | Warnings and critical only |
| `"critical"` | Critical patterns only |

#### `severityOverrides`

Override the default severity for specific patterns.

```json
{
  "severityOverrides": {
    "magic_number": "warning",
    "todo_without_context": "critical"
  }
}
```

#### `exclude`

Glob patterns for paths to exclude from analysis.

```json
{
  "exclude": [
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

### Detector Customization

#### `genericVariableNames`

Additional variable names to flag as generic. These are **added** to the built-in list
(`data`, `result`, `temp`, `item`, etc.).

```json
{
  "genericVariableNames": ["info", "input", "output", "params"]
}
```

#### `loopVariableNames`

Additional single-letter variable names allowed in loop contexts. These are **added**
to the built-in list (`i`, `j`, `k`, `n`, `m`).

```json
{
  "loopVariableNames": ["l", "p", "q"]
}
```

#### `coordinateVariableNames`

Additional variable names allowed for coordinates/math contexts. These are **added**
to the built-in list (`x`, `y`, `z`, `w`).

```json
{
  "coordinateVariableNames": ["u", "v", "r", "theta"]
}
```

#### `genericErrorMessages`

Additional error message patterns to flag as generic. These are **added** to the
built-in list (`"something went wrong"`, `"an error occurred"`, etc.).

```json
{
  "genericErrorMessages": ["operation failed", "try again later", "contact support"]
}
```

#### `secretPatterns`

Additional regex patterns to detect hardcoded secrets. These are **added** to the
built-in patterns for API keys, passwords, tokens, etc.

```json
{
  "secretPatterns": [
    "my_service_key\\s*=\\s*[\"'][^\"\']+[\"\']",
    "CUSTOM_TOKEN_[A-Z0-9]+"
  ]
}
```

> **Note:** Patterns are JavaScript regular expressions. Remember to double-escape
> backslashes in JSON.

### Git Integration

#### `blockOnCritical`

Block git commits when critical issues are found.

```json
{
  "blockOnCritical": true
}
```

#### `blockOnWarning`

Block git commits when warnings are found.

```json
{
  "blockOnWarning": false
}
```

#### `showCheckpoint`

Show comprehension checkpoint UI before commit.

```json
{
  "showCheckpoint": true
}
```

### UI Settings (VS Code only)

#### `showInlineHints`

Show inline decorations (wavy underlines) in the editor.

```json
{
  "showInlineHints": true
}
```

#### `debounceMs`

Delay before analyzing after typing stops (milliseconds).

```json
{
  "debounceMs": 500
}
```

#### `analyzeOnOpen`

Automatically analyze files when opened.

```json
{
  "analyzeOnOpen": true
}
```

#### `analyzeOnSave`

Automatically analyze files when saved.

```json
{
  "analyzeOnSave": true
}
```

## Configuration Profiles

### Strict Mode (Teams/Production)

Maximum detection, block on issues:

```json
{
  "minSeverity": "info",
  "blockOnCritical": true,
  "blockOnWarning": true,
  "showCheckpoint": true
}
```

### Balanced Mode (Default)

Good balance of feedback and flow:

```json
{
  "minSeverity": "info",
  "blockOnCritical": true,
  "blockOnWarning": false,
  "showCheckpoint": true
}
```

### Minimal Mode (Learning/Exploration)

Only critical issues, no blocking:

```json
{
  "minSeverity": "critical",
  "blockOnCritical": false,
  "blockOnWarning": false,
  "showCheckpoint": false
}
```

### Security-Focused

Only security-related patterns:

```json
{
  "enabledPatterns": [
    "hardcoded_secret",
    "sql_concatenation",
    "unsafe_eval",
    "insecure_random"
  ],
  "minSeverity": "warning",
  "blockOnCritical": true
}
```

### Domain-Specific (Graphics/Math)

Allow common graphics/math variable names:

```json
{
  "coordinateVariableNames": ["u", "v", "r", "theta", "phi"],
  "loopVariableNames": ["t"]
}
```

### Custom Secret Detection

Add company-specific secret patterns:

```json
{
  "secretPatterns": [
    "ACME_API_KEY_[A-Za-z0-9]+",
    "internal_token\\s*[:=]\\s*[\"'][^\"\']+[\"\']"
  ]
}
```

## Using package.json

You can also configure CodeGateway in your `package.json`:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "codegateway": {
    "minSeverity": "warning",
    "blockOnCritical": true,
    "exclude": ["**/generated/**"]
  }
}
```

## Config File Schema

VS Code provides autocomplete and validation for config files. The schema is
available at:

```
https://raw.githubusercontent.com/codegateway/codegateway/main/schema/codegateway.schema.json
```

Add it to your config file:

```json
{
  "$schema": "https://raw.githubusercontent.com/codegateway/codegateway/main/schema/codegateway.schema.json",
  "minSeverity": "warning"
}
```

## CLI Usage with Config

The CLI automatically loads the config file:

```bash
# Uses config file from current directory
codegateway analyze .

# Override config file location
codegateway analyze . --config ./custom-config.json

# CLI flags override config file
codegateway analyze . --severity critical
```

## Troubleshooting Configuration

### Config Not Loading

1. Check file name is correct (`codegateway.config.json`, `.codegaterc.json`, etc.)
2. Ensure valid JSON syntax
3. In VS Code, run `CodeGateway: Open Config File` to verify which config is loaded

### Settings Not Taking Effect

1. Save the config file
2. VS Code auto-reloads on config changes
3. For CLI, re-run the command

### Validation Errors

If VS Code shows validation errors in your config file, check:

- Property names are correct (case-sensitive)
- Values are the correct type (string, number, array, etc.)
- Enum values are valid (`"info"`, `"warning"`, `"critical"` for severity)

## Next Steps

- [Pattern Reference](./patterns.md) - Understand what each pattern means
- [Git Integration](./git-integration.md) - Configure pre-commit hooks
- [CLI Reference](./cli.md) - Command-line configuration options
