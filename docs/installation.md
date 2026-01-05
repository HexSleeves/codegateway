# Installation Guide

This guide covers all the ways to install CodeGateway.

## VS Code Extension

### Method 1: VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "CodeGateway"
4. Click **Install**

Or install via command line:

```bash
code --install-extension codegateway.codegateway
```

### Method 2: Install from VSIX File

For offline installation or pre-release versions:

1. Download the `.vsix` file from [GitHub Releases](https://github.com/codegateway/codegateway/releases)
2. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file

Or via command line:

```bash
code --install-extension codegateway-1.0.0.vsix
```

### Method 3: Build from Source

For contributors or custom builds:

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

# Install the generated .vsix file
code --install-extension codegateway-1.0.0.vsix
```

## Cursor IDE

CodeGateway works with Cursor IDE using the same installation methods:

### From Marketplace

1. Open Cursor
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "CodeGateway"
4. Click **Install**

### From VSIX

```bash
cursor --install-extension codegateway-1.0.0.vsix
```

## CLI Installation

The CodeGateway CLI can be used independently for CI/CD pipelines or command-line analysis.

### Via npm/bun (Global)

```bash
# Using npm
npm install -g @codegateway/cli

# Using bun
bun install -g @codegateway/cli
```

### Via npx/bunx (No Install)

```bash
# Using npx
npx @codegateway/cli analyze .

# Using bunx
bunx @codegateway/cli analyze .
```

### From Source

```bash
cd codegateway
bun run build

# Run directly
bun packages/cli/dist/index.js analyze .

# Or link globally
cd packages/cli
bun link
```

## Verifying Installation

### VS Code Extension

1. Open a TypeScript or JavaScript file
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Type "CodeGateway" - you should see available commands
4. Check the status bar for the CodeGateway indicator

### CLI

```bash
codegateway --version
codegateway --help
```

## System Requirements

### VS Code Extension

- VS Code 1.85.0 or later
- Cursor IDE (any recent version)
- No additional runtime requirements (bundled)

### CLI

- Node.js 20.0.0 or later, OR
- Bun 1.0.0 or later

### Supported Languages

Currently supported:
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)

Coming soon:
- Python
- Rust
- Go

## Updating

### VS Code Extension

VS Code automatically updates extensions. To manually update:

1. Go to Extensions
2. Find CodeGateway
3. Click **Update** (if available)

### CLI

```bash
# npm
npm update -g @codegateway/cli

# bun
bun update -g @codegateway/cli
```

## Uninstalling

### VS Code Extension

1. Go to Extensions
2. Find CodeGateway
3. Click **Uninstall**

Or via command line:

```bash
code --uninstall-extension codegateway.codegateway
```

### CLI

```bash
npm uninstall -g @codegateway/cli
```

### Git Hooks

If you installed git hooks, remove them:

1. Open Command Palette in VS Code
2. Run `CodeGateway: Uninstall Git Hook`

Or manually:

```bash
rm .git/hooks/pre-commit
rm .git/hooks/pre-push
```

## Next Steps

- [Quick Start Guide](./quick-start.md) - Get started in 5 minutes
- [Configuration](./configuration.md) - Customize for your workflow
