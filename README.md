# CodeGateway - AI Code Review Trust Layer

> "Spell-check for AI-assisted coding"

CodeGateway automatically detects AI-generated code patterns, prompts comprehension verification, and helps developers understand the code they're committing.

## The Problem

- **66%** of developers say AI solutions are "almost right, but not quite" (Stack Overflow 2024)
- AI-co-authored PRs contain **1.7x more issues** - logic errors, readability problems, security vulnerabilities (GitClear 2024)
- Developers often merge code they don't fully understand, creating technical debt

## The Solution

CodeGateway sits between AI code generation and version control, ensuring you actually understand the code before it enters your codebase - without killing velocity.

## Features

### Pattern Detection

CodeGateway detects 20+ pattern types across categories:

**Naming Issues**
- Generic variable names (`data`, `result`, `temp`)
- Inconsistent naming conventions

**Error Handling**
- Empty catch blocks
- Swallowed errors (caught but not used)
- Missing error boundaries in async code
- Generic error messages

**Security**
- Hardcoded secrets and API keys
- SQL concatenation (injection risk)
- Unsafe `eval()` usage
- Insecure randomness in security contexts

**Code Quality**
- Magic numbers
- TODOs without context
- Commented-out code
- Overly complex functions (cyclomatic complexity)
- Placeholder implementations

### VS Code Integration

- **Problems Panel**: All detected patterns show in VS Code's Problems panel
- **Inline Decorations**: Wavy underlines indicate issues directly in the editor
- **Status Bar**: Quick summary of pattern counts
- **Commands**: Analyze on demand or automatically on save/open

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/codegateway/codegateway.git
cd codegateway

# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Build all packages
bun run build

# Package the extension
cd packages/extension
bun run package
```

Then install the `.vsix` file in VS Code.

## Configuration

Configure CodeGateway in VS Code settings:

```json
{
  "codegateway.enabledPatterns": [
    "generic_variable_name",
    "empty_catch_block",
    "hardcoded_secret",
    // ... see full list in settings
  ],
  "codegateway.minSeverity": "info",
  "codegateway.analyzeOnSave": true,
  "codegateway.analyzeOnOpen": true,
  "codegateway.showInlineHints": true,
  "codegateway.excludePaths": [
    "**/node_modules/**",
    "**/dist/**"
  ]
}
```

## Commands

| Command | Description |
|---------|-------------|
| `CodeGateway: Analyze Current File` | Analyze the active file immediately |
| `CodeGateway: Analyze Workspace` | Analyze all TypeScript/JavaScript files |
| `CodeGateway: Clear All Diagnostics` | Clear all CodeGateway diagnostics |
| `CodeGateway: Show Dashboard` | Open the CodeGateway dashboard (coming soon) |

## Project Structure

```
codegateway/
├── packages/
│   ├── shared/          # Shared types and utilities
│   ├── core/            # Analysis engine and detectors
│   └── extension/       # VS Code extension
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test

# Watch mode for development
bun run dev
```

### Running the Extension in Development

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. Open a TypeScript/JavaScript file to see CodeGateway in action

## Severity Levels

- **Critical** (🔴): Issues that should block commit - empty catch blocks, hardcoded secrets, unsafe eval
- **Warning** (🟡): Issues that need attention - generic names, missing error boundaries, complex functions  
- **Info** (🔵): Suggestions for improvement - magic numbers, TODOs, minor style issues

## Roadmap

- [x] Core pattern detection engine
- [x] VS Code extension with diagnostics
- [x] TypeScript/JavaScript support
- [ ] Comprehension checkpoints (pre-commit questions)
- [ ] Git hook integration
- [ ] Local metrics dashboard
- [ ] Python, Rust, Go support
- [ ] Cloud sync for teams
- [ ] CI/CD integration (CLI + GitHub Action)

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines first.
