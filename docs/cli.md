# CLI Reference

The CodeGateway CLI provides command-line access to code analysis, useful for CI/CD pipelines, scripts, and terminal workflows.

## Installation

```bash
# Global installation
npm install -g @codegateway/cli

# Or use without installing
npx @codegateway/cli analyze .
```

## Commands

### `analyze`

Analyze files for AI-generated code patterns.

```bash
codegateway analyze [paths...] [options]
```

#### Arguments

| Argument | Description | Default |
| -------- | ----------- | ------- |
| `paths` | Files or directories to analyze | `.` (current directory) |

#### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-s, --severity <level>` | Minimum severity: `info`, `warning`, `critical` | From config |
| `--json` | Output results as JSON | `false` |
| `--fail-on <level>` | Exit with code 1 if patterns at this level found | - |
| `-c, --config <path>` | Path to config file | Auto-detected |

#### Examples

```bash
# Analyze current directory
codegateway analyze

# Analyze specific files/directories
codegateway analyze src/ lib/utils.ts

# Only show warnings and critical
codegateway analyze --severity warning

# Output as JSON (for scripts)
codegateway analyze --json

# Fail CI if critical issues found
codegateway analyze --fail-on critical

# Use specific config file
codegateway analyze -c ./custom-config.json
```

### `init`

Create a `codegateway.config.json` configuration file.

```bash
codegateway init [options]
```

#### Options

| Option | Description |
| ------ | ----------- |
| `-f, --force` | Overwrite existing config file |

#### Examples

```bash
# Create config file
codegateway init

# Overwrite existing config
codegateway init --force
```

## CLI Architecture

```
packages/cli/src/
├── index.ts              # Entry point, sets up commander
├── commands/
│   ├── analyze.ts        # Analyze command implementation
│   └── init.ts           # Init command implementation
└── utils/
    ├── files.ts          # File collection utilities
    └── output.ts         # Output formatting (console/JSON)
```

## Output Formats

**Default (Human-readable):**

```
Using config: codegateway.config.json
Analyzing 5 file(s)...

src/utils/api.ts
================
  ❌ Line 15: Hardcoded API key detected
     Hardcoded secrets will be exposed in version control.
     ➔ Move this secret to an environment variable

  ⚠️ Line 42: Empty catch block silently swallows errors
     Empty catch blocks hide errors and make debugging difficult.
     ➔ At minimum, log the error

==================================================
Summary: 2 pattern(s) found
  Critical: 1
  Warning: 1
  Info: 0
```

**JSON:**

```json
[
  {
    "id": "security-src/utils/api.ts-15-1704528000000",
    "type": "hardcoded_secret",
    "severity": "critical",
    "file": "src/utils/api.ts",
    "startLine": 15,
    "endLine": 15,
    "description": "Hardcoded API key detected",
    "explanation": "Hardcoded secrets will be exposed in version control.",
    "suggestion": "Move this secret to an environment variable",
    "codeSnippet": "const API_KEY = \"sk-1234...\"",
    "confidence": 0.9
  }
]
```

#### Exit Codes

| Code | Meaning |
| ---- | ------- |
| `0` | Success (no issues at `--fail-on` level) |
| `1` | Issues found at `--fail-on` level |

## CI/CD Integration

### GitHub Actions

```yaml
name: CodeGateway Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @codegateway/cli analyze --fail-on critical
```

### GitLab CI

```yaml
codegateway:
  image: node:20
  script:
    - npx @codegateway/cli analyze --fail-on critical
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: codegateway
        name: CodeGateway
        entry: npx @codegateway/cli analyze --fail-on critical
        language: system
        types: [typescript, javascript]
        pass_filenames: true
```

## Configuration

The CLI automatically looks for configuration in this order:

1. Path specified with `-c, --config`
2. `codegateway.config.json` in current directory
3. `.codegaterc.json` in current directory
4. `codegateway.config.json` in parent directories
5. Default configuration

See [Configuration Guide](./configuration.md) for all options.

## Next Steps

- [Configuration](./configuration.md) - All configuration options
- [Git Integration](./git-integration.md) - Pre-commit hook setup
- [Pattern Reference](./patterns.md) - What each pattern means
