---
title: CodeGateway
description: AI Code Review Trust Layer - Spell-check for AI-assisted coding
last_updated: 2026-01-06
---

# CodeGateway - AI Code Review Trust Layer

> "Spell-check for AI-assisted coding"

CodeGateway automatically detects AI-generated code patterns, prompts comprehension verification, and helps developers understand the code they're committing.

## The Problem

- **66%** of developers say AI solutions are "almost right, but not quite" (Stack Overflow 2024)
- AI-co-authored PRs contain **1.7x more issues** - logic errors, readability problems, security vulnerabilities (GitClear 2024)
- Developers often merge code they don't fully understand, creating technical debt

## The Solution

CodeGateway sits between AI code generation and version control, ensuring you actually understand the code before it enters your codebase - without killing velocity.

## Quick Start

```bash
# Install via VS Code
# 1. Open Extensions (Ctrl+Shift+X)
# 2. Search "CodeGateway"
# 3. Click Install

# Or install via command line
code --install-extension codegateway.codegateway
```

See the [Quick Start Guide](./docs/quick-start.md) for a 5-minute introduction.

## Features

### Pattern Detection

CodeGateway detects 20+ pattern types across categories:

| Category | Patterns |
|----------|----------|
| **Naming** | Generic names (`data`, `result`), inconsistent conventions |
| **Error Handling** | Empty catch blocks, swallowed errors, missing boundaries |
| **Security** | Hardcoded secrets, SQL injection, unsafe eval |
| **Code Quality** | Magic numbers, vague TODOs, complex functions |

See [Pattern Reference](./docs/patterns.md) for the complete list.

### VS Code Integration

- **Problems Panel**: All detected patterns in VS Code's Problems panel
- **Inline Decorations**: Wavy underlines directly in the editor
- **Status Bar**: Quick summary of pattern counts
- **Git Hooks**: Pre-commit analysis with blocking
- **Checkpoints**: Comprehension verification UI

### CLI for CI/CD

```bash
# Analyze and fail on critical issues
codegateway analyze . --fail-on critical

# JSON output for scripts
codegateway analyze . --json
```

See [CLI Reference](./docs/cli.md) for all options.

## Documentation

| Guide | Description |
|-------|-------------|
| [Installation](./docs/installation.md) | All installation methods |
| [Quick Start](./docs/quick-start.md) | Get running in 5 minutes |
| [Configuration](./docs/configuration.md) | All settings explained |
| [Pattern Reference](./docs/patterns.md) | What each pattern means |
| [Git Integration](./docs/git-integration.md) | Pre-commit hooks setup |
| [Checkpoints](./docs/checkpoints.md) | Comprehension verification |
| [Commands](./docs/commands.md) | All VS Code commands |
| [CLI Reference](./docs/cli.md) | Command-line usage |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues & solutions |

## CLI Usage

CodeGateway includes a command-line interface for analyzing files and directories, suitable for CI/CD pipelines or local checks.

```bash
# Analyze a specific file
bun packages/cli/dist/index.js analyze src/main.ts

# Analyze the current directory
bun packages/cli/dist/index.js analyze .

# Analyze with severity threshold (only show warnings and critical)
bun packages/cli/dist/index.js analyze . --severity warning

# Analyze and output results as JSON
bun packages/cli/dist/index.js analyze . --json

# Fail with exit code 1 if critical issues are found
bun packages/cli/dist/index.js analyze . --fail-on critical
```

## Configuration

```json
{
  "codegateway.minSeverity": "info",
  "codegateway.analyzeOnSave": true,
  "codegateway.blockOnCritical": true,
  "codegateway.excludePaths": ["**/node_modules/**"],
  
  // Extend built-in detection patterns
  "codegateway.genericVariableNames": ["info", "input"],
  "codegateway.coordinateVariableNames": ["u", "v"],
  "codegateway.secretPatterns": ["MY_CUSTOM_KEY_[A-Z0-9]+"]
}
```

See [Configuration Guide](./docs/configuration.md) for all options.

## Commands

| Command | Description |
|---------|-------------|
| `CodeGateway: Analyze Current File` | Analyze the active file |
| `CodeGateway: Analyze Workspace` | Analyze all files |
| `CodeGateway: Install Git Hook` | Set up pre-commit hook |
| `CodeGateway: Trigger Checkpoint` | Manual comprehension check |

See [Commands Reference](./docs/commands.md) for the full list.

## Severity Levels

| Level | Icon | Action |
|-------|------|--------|
| **Critical** | 🔴 | Blocks commit (configurable) |
| **Warning** | 🟡 | Shown, doesn't block |
| **Info** | 🔵 | Suggestions only |

## Project Structure

```
codegateway/
├── .devcontainer/   # VS Code dev container config
├── packages/
│   ├── shared/      # Types, constants, and utilities
│   ├── core/        # Analysis engine and detectors
│   ├── cli/         # Command-line interface
│   └── extension/   # VS Code extension
├── docs/            # Documentation
└── demo/            # Web demo
```

## Development

### Using Dev Container (Recommended)

1. Open project in VS Code
2. Click "Reopen in Container" when prompted
3. Wait for container to build and dependencies to install
4. Press `F5` to launch Extension Development Host

### Manual Setup

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test

# Lint and format
bun run check

# Type check
bun run typecheck

# Watch mode
bun run dev
```

### Running the Extension in Development

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a TypeScript/JavaScript file
4. Check the Problems panel and inline decorations

## Roadmap

- [x] Core pattern detection engine
- [x] VS Code extension with diagnostics
- [x] TypeScript/JavaScript support
- [x] Git hook integration
- [x] Checkpoint UI
- [ ] Comprehension questions
- [ ] Local metrics dashboard
- [ ] Python, Rust, Go support
- [ ] Cloud sync for teams
- [ ] GitHub Action

## Contributing

Contributions welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) first.

## License

MIT
