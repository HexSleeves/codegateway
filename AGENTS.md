---
title: CodeGateway Development Guide
description: Guidelines for AI agents working on the CodeGateway project
last_updated: 2026-01-05
---

# AGENTS.md - CodeGateway Development Guide

This document provides guidelines for AI agents working on the CodeGateway project.

## Project Overview

CodeGateway is a monorepo using Turborepo with Bun. Packages:

- `@codegateway/core` - Core analysis engine with pattern detectors
- `@codegateway/shared` - Shared types, constants, and utilities
- `@codegateway/cli` - Command-line interface
- `codegateway` - VS Code extension
- `@codegateway/demo` - Demo server application

## Essential Commands

```bash
# Build all packages
bun run build

# Watch mode for development
bun run dev

# Clean all build outputs
bun run clean

# Type check all packages
bun run typecheck
```

## Testing

```bash
# Run all tests
bun test

# Run tests for a specific package
cd packages/core && bun test

# Run a single test file
bun test packages/core/test/detectors.test.ts

# Run a specific test by name
bun test --filter "NamingPatternDetector should detect generic variable names"

# Watch mode for tests
cd packages/core && bun run test:watch
```

## TypeScript Configuration

- Target: ES2022
- Module: NodeNext
- Strict mode: All strict flags enabled
- Key flags: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`

## Imports

```typescript
// Type imports first, then value imports
import type { DetectedPattern, PatternType } from "@codegateway/shared";
import { DEFAULT_CONFIG, detectLanguage } from "@codegateway/shared";
import { SomeClass } from "./local.js";

// Group imports by source, use explicit extensions (.js) for relative imports
```

## Naming Conventions

| Type                | Convention           | Examples                                |
| ------------------- | -------------------- | --------------------------------------- |
| Classes             | PascalCase           | `NamingPatternDetector`, `BaseDetector` |
| Interfaces/Types    | PascalCase           | `DetectedPattern`, `AnalysisResult`     |
| Functions/Variables | camelCase            | `analyzeFile`, `generateId`             |
| Constants           | SCREAMING_SNAKE_CASE | `MAX_RETRIES`                           |
| Config objects      | camelCase            | `defaultConfig`                         |
| Directories         | kebab-case           | `packages/core/src/detectors/`          |

## Code Style

- **Error Handling**: Use try-finally for cleanup; catch errors in Promise.all
- **Async/Await**: Prefer over raw promises; use Promise.all() for parallel operations
- **Types**: Use `interface` for objects, `type` for unions/intersections
- **Structure**: Classes for stateful components; pure functions for utilities
- **File Size**: Keep files under 300 lines when possible
- **Comments**: JSDoc for public APIs; no comments for obvious code

## VS Code Extension

- External `vscode` module - use `--external vscode` in bun build
- Handle async operations for VS Code API calls
- Clean up disposables on deactivate

## Package Scripts

| Command             | Location                            |
| ------------------- | ----------------------------------- |
| `bun run build`     | Root - build all packages           |
| `bun run test`      | Root - test all packages            |
| `bun run typecheck` | Root - type check all               |
| `bun run package`   | `packages/extension` - create VSIX  |
| `bun run dev`       | `packages/demo` - start demo server |

## Key File Locations

- Core analyzer: `packages/core/src/analyzer.ts`
- Shared types: `packages/shared/src/types/index.ts`
- CLI entry: `packages/cli/src/index.ts`
- Extension: `packages/extension/src/extension.ts`
- Tests: `packages/core/test/`
