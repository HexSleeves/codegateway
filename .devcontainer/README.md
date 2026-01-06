# CodeGateway Dev Container

This dev container provides a fully configured development environment for CodeGateway.

## What's Included

- **Node.js 22** - Latest LTS version
- **Bun** - Fast JavaScript runtime and package manager
- **Git** - Version control
- **TypeScript** - Language support

## VS Code Extensions

The following extensions are automatically installed:

- **Biome** - Linting and formatting
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting (fallback)
- **Bun for VS Code** - Bun runtime support
- **TypeScript Next** - Latest TypeScript features

## Getting Started

1. Open this repository in VS Code
2. When prompted, click "Reopen in Container" (or run `Dev Containers: Reopen in Container` from command palette)
3. Wait for the container to build and dependencies to install
4. Start developing!

## Available Commands

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run in development mode
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint

# Format code
bun run format

# Run tests
bun run test
```

## Debugging the Extension

1. Press `F5` or run "Run Extension" from the debug panel
2. A new VS Code window will open with the extension loaded
3. Open a TypeScript/JavaScript file to see CodeGateway in action

## Ports

- **3000** - Demo server (when running)
- **8000** - Alternative port for development
