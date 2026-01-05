# CLI Reference

The CodeGateway CLI provides command-line access to code analysis, useful for CI/CD pipelines, scripts, and terminal workflows.

## Installation

```bash
# Global installation
npm install -g @codegateway/cli

# Or use without installing
npx @codegateway/cli analyze .
bunx @codegateway/cli analyze .
```

## Commands

### `analyze`

Analyze files for AI-generated code patterns.

```bash
codegateway analyze <path> [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `<path>` | File or directory to analyze |

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--severity <level>` | Minimum severity: `info`, `warning`, `critical` | `info` |
| `--json` | Output results as JSON | `false` |
| `--fail-on <level>` | Exit with code 1 if patterns at this level found | - |
| `--exclude <glob>` | Glob patterns to exclude (can be repeated) | - |

#### Examples

```bash
# Analyze a single file
codegateway analyze src/index.ts

# Analyze a directory
codegateway analyze src/

# Analyze current directory
codegateway analyze .

# Only show warnings and critical
codegateway analyze . --severity warning

# Output as JSON (for scripts)
codegateway analyze . --json

# Fail CI if critical issues found
codegateway analyze . --fail-on critical

# Exclude test files
codegateway analyze . --exclude "**/*.test.ts" --exclude "**/__tests__/**"
```

#### Output Formats

**Default (Human-readable):**

```
Analyzing: src/

src/utils/api.ts
  Line 15: [CRITICAL] hardcoded_secret
    Hardcoded API key detected
    const API_KEY = "sk-1234..."

  Line 42: [WARNING] empty_catch_block
    Empty catch block silently swallows errors
    } catch (error) { }

src/components/Form.tsx
  Line 8: [INFO] magic_number
    Magic number without explanation
    const timeout = 86400000;

==================================================
Summary: 3 pattern(s) found
  Critical: 1
  Warning: 1
  Info: 1
```

**JSON:**

```json
{
  "files": [
    {
      "path": "src/utils/api.ts",
      "patterns": [
        {
          "type": "hardcoded_secret",
          "severity": "critical",
          "line": 15,
          "description": "Hardcoded API key detected",
          "snippet": "const API_KEY = \"sk-1234...\""
        }
      ]
    }
  ],
  "summary": {
    "total": 3,
    "critical": 1,
    "warning": 1,
    "info": 1
  }
}
```

#### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (no issues at `--fail-on` level) |
| `1` | Issues found at `--fail-on` level |
| `2` | Error (invalid arguments, file not found) |

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/codegateway.yml
name: CodeGateway Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Run CodeGateway
        run: bunx @codegateway/cli analyze . --fail-on critical
```

### GitLab CI

```yaml
# .gitlab-ci.yml
codegateway:
  image: oven/bun:latest
  script:
    - bunx @codegateway/cli analyze . --fail-on critical
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1
jobs:
  analyze:
    docker:
      - image: oven/bun:latest
    steps:
      - checkout
      - run:
          name: CodeGateway Analysis
          command: bunx @codegateway/cli analyze . --fail-on critical
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    stages {
        stage('CodeGateway') {
            steps {
                sh 'npx @codegateway/cli analyze . --fail-on critical'
            }
        }
    }
}
```

### Pre-commit (Python)

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

## Scripting Examples

### Analyze Changed Files Only

```bash
#!/bin/bash
# analyze-changed.sh

# Get changed TypeScript/JavaScript files
CHANGED=$(git diff --name-only HEAD~1 | grep -E '\.(ts|tsx|js|jsx)$')

if [ -n "$CHANGED" ]; then
  echo "$CHANGED" | xargs codegateway analyze --fail-on critical
fi
```

### Generate Report

```bash
#!/bin/bash
# generate-report.sh

codegateway analyze src/ --json > codegateway-report.json

# Extract summary
jq '.summary' codegateway-report.json
```

### Watch Mode (with entr)

```bash
# Requires: brew install entr (macOS) or apt install entr (Linux)
find src -name '*.ts' | entr -c codegateway analyze src/
```

### Integration with jq

```bash
# Count critical issues
codegateway analyze . --json | jq '.summary.critical'

# List files with critical issues
codegateway analyze . --json | jq -r '.files[] | select(.patterns[].severity == "critical") | .path'

# Get all hardcoded secrets
codegateway analyze . --json | jq '.files[].patterns[] | select(.type == "hardcoded_secret")'
```

## Configuration

The CLI respects a `.codegaterc.json` file in the project root:

```json
{
  "severity": "warning",
  "exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts"
  ],
  "patterns": [
    "empty_catch_block",
    "hardcoded_secret",
    "unsafe_eval"
  ]
}
```

Command-line options override config file settings.

## Performance Tips

### For Large Projects

```bash
# Exclude heavy directories
codegateway analyze . \
  --exclude "**/node_modules/**" \
  --exclude "**/dist/**" \
  --exclude "**/*.min.js"

# Analyze only source directory
codegateway analyze src/

# Only check critical issues (faster)
codegateway analyze . --severity critical
```

### Caching

The CLI doesn't currently cache results. For CI, consider:

```yaml
# Cache node_modules to speed up npx
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: npm-codegateway
```

## Troubleshooting

### "Command not found"

```bash
# Use npx/bunx instead
npx @codegateway/cli analyze .

# Or install globally
npm install -g @codegateway/cli
```

### Slow Analysis

- Use `--exclude` to skip large directories
- Analyze specific directories instead of root
- Use `--severity critical` for faster CI checks

### JSON Parse Errors

Ensure no other output is mixed in:

```bash
# Redirect stderr
codegateway analyze . --json 2>/dev/null | jq .
```

## Next Steps

- [CI/CD Integration](./ci-cd.md) - Detailed CI setup guides
- [Configuration](./configuration.md) - All configuration options
- [Git Integration](./git-integration.md) - Pre-commit hook setup
