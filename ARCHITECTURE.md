# CodeGateway Architecture

This document describes the architecture of CodeGateway, an AI code review trust layer.

## Package Overview

CodeGateway is a monorepo with four packages:

```
packages/
├── shared/      # Types, constants, utilities (shared across all packages)
├── core/        # Analysis engine and pattern detectors
├── cli/         # Command-line interface
└── extension/   # VS Code extension
```

## Package Dependencies

```
┌─────────────┐     ┌─────────────┐
│  extension  │────▶│    core     │
└─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│    cli      │────▶│   shared    │
└─────────────┘     └─────────────┘
```

---

## packages/shared

Shared types, constants, and utilities used across all packages.

```
src/
├── index.ts          # Main exports
├── config/
│   └── index.ts      # Config loading (loadConfig, findConfigFile, createDefaultConfigFile)
├── constants/
│   └── index.ts      # Shared constants (CONFIG_FILE_NAMES, DEFAULT_*, etc.)
├── types/
│   └── index.ts      # TypeScript types (DetectedPattern, Severity, PatternType, etc.)
└── utils/
    └── index.ts      # Utility functions (detectLanguage, matchesGlob, etc.)
```

### Key Exports

- **Types**: `DetectedPattern`, `Severity`, `PatternType`, `ResolvedConfig`, `SupportedLanguage`
- **Config**: `loadConfig()`, `findConfigFile()`, `createDefaultConfigFile()`
- **Constants**: `CONFIG_FILE_NAMES`, `DEFAULT_GENERIC_VARIABLE_NAMES`, `DEFAULT_SECRET_PATTERNS`
- **Utils**: `detectLanguage()`, `matchesGlob()`, `meetsSeverityThreshold()`, `compareSeverity()`

---

## packages/core

The analysis engine with pattern detectors.

```
src/
├── index.ts              # Main exports
├── analyzer.ts           # Main Analyzer class
├── detectors/
│   ├── index.ts          # Detector exports
│   ├── base.ts           # Detector interface and BaseDetector class
│   ├── utils.ts          # Shared detector utilities
│   ├── naming.ts         # NamingPatternDetector
│   ├── security.ts       # SecurityDetector
│   ├── errorHandling.ts  # ErrorHandlingDetector
│   └── codeQuality.ts    # CodeQualityDetector
├── git/
│   ├── index.ts          # Git exports
│   ├── types.ts          # Git-related types
│   ├── diff-parser.ts    # Parse git diff output
│   ├── git-service.ts    # GitService class
│   └── pre-commit-hook.ts # Hook generation
└── utils/
    └── patterns.ts       # Pattern processing utilities
```

### Analyzer

The `Analyzer` class orchestrates all detectors:

```typescript
const analyzer = new Analyzer();
const result = await analyzer.analyzeFile(content, filePath, options);
// result.patterns: DetectedPattern[]
```

### Detectors

Each detector implements the `Detector` interface:

```typescript
interface Detector {
  id: string;
  patterns: PatternType[];
  languages: SupportedLanguage[];
  analyze(content: string, filePath: string, settings?: DetectorSettings): Promise<DetectedPattern[]>;
}
```

| Detector | Patterns Detected |
|----------|-------------------|
| `NamingPatternDetector` | `generic_variable_name`, `inconsistent_naming` |
| `ErrorHandlingDetector` | `empty_catch_block`, `swallowed_error`, `missing_error_boundary`, `generic_error_message`, `try_without_catch` |
| `SecurityDetector` | `hardcoded_secret`, `sql_concatenation`, `unsafe_eval`, `insecure_random` |
| `CodeQualityDetector` | `magic_number`, `todo_without_context`, `commented_out_code`, `overly_complex_function`, `placeholder_implementation` |

### Shared Detector Utilities

`detectors/utils.ts` provides shared functions:

- `createProject()` - Create ts-morph Project with standard config
- `truncateCode()` - Truncate code snippets for display
- `getFunctionName()` - Get function name from AST node
- `isDescendantOf()` - Check AST node ancestry

---

## packages/cli

Command-line interface for analysis.

```
src/
├── index.ts              # Entry point, sets up commander
├── commands/
│   ├── analyze.ts        # analyze command
│   └── init.ts           # init command
└── utils/
    ├── files.ts          # File collection utilities
    └── output.ts         # Output formatting (console/JSON)
```

### Commands

| Command | Description |
|---------|-------------|
| `analyze [paths...]` | Analyze files for patterns |
| `init` | Create config file |

### CLI Flow

```
index.ts
    │
    ├── commands/analyze.ts
    │       │
    │       ├── utils/files.ts (collectFiles)
    │       ├── @codegateway/core (Analyzer)
    │       └── utils/output.ts (printPatterns, printSummary)
    │
    └── commands/init.ts
            │
            └── @codegateway/shared (createDefaultConfigFile)
```

---

## packages/extension

VS Code extension for real-time analysis.

```
src/
├── extension.ts          # Entry point (activate/deactivate)
├── analysis/
│   └── fileAnalyzer.ts   # FileAnalyzer class (debounced analysis)
├── commands/
│   ├── index.ts          # Main commands (analyzeFile, analyzeWorkspace, etc.)
│   └── git-commands.ts   # Git commands (installGitHook, analyzeStagedFiles, etc.)
├── core/
│   └── config.ts         # Config management (cached config loading)
├── storage/
│   ├── index.ts          # Storage exports
│   └── checkpoint-store.ts # Checkpoint history storage
├── ui/
│   ├── index.ts          # UI exports
│   ├── decorations.ts    # DecorationManager (inline underlines)
│   ├── diagnostics.ts    # DiagnosticsManager (Problems panel)
│   └── statusBar.ts      # StatusBarManager
├── utils/
│   ├── index.ts          # Utility exports
│   ├── constants.ts      # SUPPORTED_LANGUAGES
│   └── documents.ts      # Document helpers
└── webview/
    ├── index.ts          # Webview exports
    ├── checkpoint-panel.ts   # CheckpointPanel class
    ├── checkpoint-html.ts    # HTML template loader
    └── templates/
        ├── checkpoint.html   # Main checkpoint template
        └── pattern.html      # Pattern item template
```

### Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      extension.ts                           │
│  - activate() / deactivate()                                │
│  - Event listeners (onDidOpenTextDocument, etc.)            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  FileAnalyzer │    │   Commands    │    │      UI       │
│  - debounce   │    │  - analyze    │    │ - decorations │
│  - cache      │    │  - git hooks  │    │ - diagnostics │
│  - analyze    │    │  - checkpoint │    │ - status bar  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│ @codegateway  │    │   Webview     │
│    /core      │    │  - panel      │
│  (Analyzer)   │    │  - templates  │
└───────────────┘    └───────────────┘
```

### Key Classes

| Class | Responsibility |
|-------|----------------|
| `FileAnalyzer` | Debounced file analysis, caching, result distribution |
| `DiagnosticsManager` | VS Code Problems panel integration |
| `DecorationManager` | Inline editor decorations (underlines) |
| `StatusBarManager` | Status bar indicator |
| `CheckpointPanel` | Webview panel for comprehension checkpoints |
| `CheckpointStore` | Checkpoint history storage |

### Webview Templates

The checkpoint panel uses HTML templates:

- `templates/checkpoint.html` - Main checkpoint layout
- `templates/pattern.html` - Individual pattern card
- `checkpoint-html.ts` - Template loading and placeholder replacement

---

## Data Flow

### Analysis Flow

```
1. User opens/edits file
         │
         ▼
2. FileAnalyzer.analyzeDocument() [debounced]
         │
         ▼
3. core/Analyzer.analyzeFile()
         │
         ▼
4. Detectors run in parallel
   ├── NamingPatternDetector
   ├── SecurityDetector
   ├── ErrorHandlingDetector
   └── CodeQualityDetector
         │
         ▼
5. Results aggregated, filtered, sorted
         │
         ▼
6. UI updated
   ├── DiagnosticsManager → Problems panel
   ├── DecorationManager → Inline decorations
   └── StatusBarManager → Status bar
```

### Configuration Flow

```
1. Config file change detected
         │
         ▼
2. invalidateConfigCache()
         │
         ▼
3. getResolvedConfig() [re-loads from file]
         │
         ▼
4. All open documents re-analyzed
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| Runtime | Node.js / Bun |
| AST Parsing | ts-morph |
| CLI Framework | Commander |
| Bundler (extension) | Bun |
| Package Manager | Bun (workspaces) |
| Linting/Formatting | Biome |

---

## Adding a New Detector

1. Create `packages/core/src/detectors/myDetector.ts`:

```typescript
import { BaseDetector } from './base.js';
import { createProject } from './utils.js';

export class MyDetector extends BaseDetector {
  readonly id = 'my_detector';
  readonly patterns: PatternType[] = ['my_pattern'];
  readonly languages: SupportedLanguage[] = ['typescript', 'javascript'];

  private readonly project = createProject();

  async analyze(content: string, filePath: string): Promise<DetectedPattern[]> {
    // Implementation
  }
}
```

2. Export from `packages/core/src/detectors/index.ts`

3. Register in `packages/core/src/analyzer.ts`:

```typescript
private initializeDetectors(): void {
  this.detectors = [
    // ...existing
    new MyDetector(),
  ];
}
```

4. Add pattern type to `packages/shared/src/types/index.ts`

---

## Testing

```bash
# Run all tests
bun test

# Type check
bun run typecheck

# Lint
bun run check
```

---

## Building

```bash
# Build all packages
bun run build

# Build specific package
cd packages/core && bun run build

# Package extension
cd packages/extension && bun run package
```
