---
document_type: prompt_requirements_document
version: 1.0.0
created: 2026-01-02
project_codename: codegateway
target_ai: claude-opus
human_author: jake
last_updated: 2026-01-05
---

# CodeGateway - AI Code Review Trust Layer

## Executive Summary

**Product Vision:** A developer tool that sits between AI code generation and version control, ensuring developers actually understand AI-generated code before it enters the codebase—without killing velocity.

**One-Line Pitch:** "Spell-check for AI-assisted coding" - automatically detects AI-generated patterns, prompts comprehension verification, and tracks the relationship between AI code and production incidents.

**Target Users:**

- Individual developers who use GitHub Copilot, Cursor, or other AI coding assistants
- Engineering managers concerned about code quality and maintainability
- Security-conscious teams (fintech, healthcare, enterprise)

**Core Problem:**

- 66% of developers say AI solutions are "almost right, but not quite"
- AI-co-authored PRs contain 1.7x more issues (logic errors, readability problems, security vulnerabilities)
- METR study: experienced developers 19% slower with AI tools, yet believed they were 20% faster
- Developers merge code they don't understand, creating technical debt and skill atrophy
- No existing tool verifies *comprehension*, only *correctness*

**Business Model:** Freemium

- Free: VS Code extension, local analysis, personal metrics
- Team ($15/seat/month): Cloud sync, team dashboard, trend analytics
- Enterprise ($30/seat/month): SSO, audit logs, custom policies, incident integration

**Key Differentiator:** Not another linter or SAST tool. The only tool focused on *human understanding* of AI-generated code, not just code quality.

---

## Problem Deep Dive

### Research Findings

| Source | Finding |
| ------ | ------- |
| GitClear 2024 Report | AI-assisted code has 1.7x more issues than human-written code |
| METR Study 2024 | Experienced developers 19% slower with AI tools (yet believed 20% faster) |
| Stack Overflow Survey 2024 | 66% cite "almost right but not quite" as top AI frustration |
| Snyk Security Report | 40% of AI-generated code contains security vulnerabilities |

### Root Causes

1. **Comprehension gap** - Developers accept code they don't fully understand
2. **Velocity pressure** - AI promises speed, so developers skip careful review
3. **Pattern matching** - AI generates plausible-looking but subtly wrong code
4. **Skill atrophy** - Over-reliance reduces developer's own capabilities

### Existing Solutions Gaps

| Tool | Gap |
| ---- | --- |
| SonarQube / CodeClimate | Not AI-aware, can't distinguish AI from human code |
| GitHub Copilot | Generates code but doesn't verify understanding |
| Snyk / Semgrep | Security-focused only, no comprehension layer |
| PR review tools | Too late in the process, already committed |

---

## Solution Approach

### Philosophy

- **Shift left on comprehension** - Catch understanding gaps before commit, not in PR review
- **Trust but verify** - Don't block AI usage, just ensure it's understood
- **Non-blocking by default** - Developers can skip checks, but it's tracked
- **Learn from incidents** - Correlate production issues back to AI patterns

### Intervention Points

| Point | Trigger | Action |
| ----- | ------- | ------ |
| Pre-commit | Developer stages files with AI-detected patterns | Show comprehension checkpoint |
| Pre-push | Developer pushes commits with skipped checkpoints | Summary warning |
| CI pipeline | PR opened with flagged code | Add PR comment with analysis |

---

## Pattern Detection

### Pattern Categories

#### Naming Patterns

- `generic_variable_name` - Variables like data, result, temp, item
- `inconsistent_naming` - Mixed conventions in same scope

#### Error Handling

- `empty_catch_block` - catch (e) {}
- `swallowed_error` - catch without logging/rethrowing
- `missing_error_boundary` - Async without try-catch
- `generic_error_message` - "An error occurred"
- `try_without_catch` - try...finally without catch (or bare try)

#### Security

- `hardcoded_secret` - API keys, passwords in code
- `sql_concatenation` - String building for SQL
- `unsafe_eval` - eval(), new Function()
- `insecure_random` - Math.random() for security
- `missing_input_validation` - User input not validated

#### Code Quality

- `copy_paste_pattern` - Duplicated code blocks
- `magic_number` - Unexplained numeric literals
- `todo_without_context` - TODO without explanation
- `commented_out_code` - Large blocks of commented code
- `overly_complex_function` - High cyclomatic complexity

#### AI-Specific Patterns

- `placeholder_implementation` - NotImplementedError, pass, TODO
- `incomplete_edge_case` - Missing null checks, boundary conditions
- `mock_data_in_production` - Hardcoded test data
- `framework_version_mismatch` - Using deprecated APIs
- `unnecessary_abstraction` - Over-engineered for simple task
- `context_mismatch` - Code that doesn't fit the project style

---

## Architecture

```bash
┌─────────────────────────────────────────────────────────────────┐
│                      VS CODE EXTENSION                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pattern    │  │     Git      │  │  Checkpoint  │          │
│  │   Detector   │  │    Hooks     │  │   Manager    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴───────┐          │
│  │                   Core Engine                     │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │          │
│  │  │ts-morph │  │tree-sit │  │ Custom  │          │          │
│  │  │ (TS/JS) │  │  (multi)│  │ Rules   │          │          │
│  │  └─────────┘  └─────────┘  └─────────┘          │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │                   UI Layer                       │           │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌───────┐ │           │
│  │  │Inline  │  │Problems│  │Webview │  │Status │ │           │
│  │  │Decor.  │  │ Panel  │  │Checkpt │  │  Bar  │ │           │
│  │  └────────┘  └────────┘  └────────┘  └───────┘ │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │              Local Storage (SQLite)              │           │
│  └─────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ Optional Cloud Sync
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD BACKEND (Optional)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Auth    │  │ Metrics  │  │  Teams   │  │ Incidents│        │
│  │ (Clerk)  │  │  Sync    │  │  Mgmt    │  │ Correlate│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Extension

- **Platform:** VS Code Extension API
- **Language:** TypeScript 5.x (strict mode)
- **Bundler:** Bun
- **Analysis:** ts-morph (TypeScript), tree-sitter (multi-language)
- **Storage:** sql.js (SQLite in WASM)

### Cloud Backend (Optional)

- **Runtime:** Bun
- **Framework:** Fastify
- **ORM:** Drizzle
- **Auth:** Clerk
- **Database:** PostgreSQL (Neon), Redis (Upstash)

### Web Dashboard

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Charts:** Recharts

### Build System

- **Package Manager:** Bun
- **Monorepo:** Bun workspaces + Turborepo
- **Testing:** Bun test runner

---

## Project Structure

```bash
codegateway/
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── core/             # Analysis engine and detectors
│   ├── extension/        # VS Code extension
│   ├── cli/              # CLI for CI integration
│   ├── api/              # Cloud backend (future)
│   └── dashboard/        # Web dashboard (future)
├── demo/                 # Web demo with Monaco Editor
├── package.json
├── turbo.json
└── bunfig.toml
```

---

## Implementation Phases

### Phase 1: Extension Foundation (Weeks 1-2)

- VS Code extension scaffold
- Basic TypeScript file parsing with ts-morph
- Simple pattern detector: generic variable names
- Inline decorations and Problems panel
- Extension configuration schema
- Basic test infrastructure

### Phase 2: Core Pattern Detectors (Weeks 3-4)

- Error handling detectors
- Security detectors
- Code quality detectors
- AI-specific detectors
- Severity configuration

### Phase 3: Git Integration (Weeks 5-6)

- Git diff analysis
- Pre-commit hook installation
- Staging area analysis
- Checkpoint webview UI
- Skip functionality with optional reason

### Phase 4: Question Generation (Weeks 7-8)

- Rule-based question templates
- Code-context questions
- Multiple choice and free-text types
- LLM-based generation (optional)

### Phase 5: Metrics & Dashboard (Weeks 9-10)

- SQLite storage for metrics
- Local dashboard webview
- Charts and trends
- Export to JSON

### Phase 6: Multi-Language Support (Weeks 11-12)

- Tree-sitter integration
- Python pattern detectors
- Rust pattern detectors
- Go pattern detectors

### Phase 7: Cloud Sync & Team Dashboard (Weeks 13-15)

- Cloud API
- Authentication with Clerk
- Team management
- Web dashboard

### Phase 8: CI Integration & Polish (Weeks 16-18)

- CLI for CI pipelines
- GitHub Action
- SARIF output format
- Documentation
- Marketplace publication

---

## Constraints

### Technical

- Local-first: all analysis runs on developer's machine
- No code sent to cloud (only aggregated metrics, opt-in)
- Works offline (core functionality)
- <500ms analysis time for files up to 1000 lines
- <50MB extension size

### Privacy

- Source code analyzed in-memory, never persisted to cloud
- Cloud sync only sends pattern counts, no code snippets
- No personally identifiable information transmitted

### UX

- Non-blocking by default
- Match VS Code's native look and feel
- Keyboard accessible
- Clear escape hatches

---

## Success Metrics

### MVP Complete When

- Extension installs and activates without errors
- Detects 15+ pattern types in TypeScript/JavaScript
- Checkpoint flow works for pre-commit
- Local metrics tracked and displayed
- Tests pass with >80% coverage

### Adoption Targets

| Timeframe | Installs | WAU | Paying Teams |
| --------- | -------- | --- | ------------ |
| Month 1 | 500 | 100 | - |
| Month 3 | 5,000 | 1,000 | 10 |
| Month 6 | 25,000 | 5,000 | 50 |

---

## Severity Levels

| Level | Icon | Description | Examples |
| ----- | ---- | ----------- | -------- |
| Critical | 🔴 | Should block commit | Empty catch, hardcoded secrets, unsafe eval |
| Warning | 🟡 | Needs attention | Generic names, missing error boundaries |
| Info | 🔵 | Suggestions | Magic numbers, TODOs, minor style |

---

## Commands

| Command | Description |
| ------- | ----------- |
| `codegateway.analyzeFile` | Analyze current file |
| `codegateway.analyzeWorkspace` | Analyze all files |
| `codegateway.clearDiagnostics` | Clear all diagnostics |
| `codegateway.showDashboard` | Open local dashboard |
| `codegateway.triggerCheckpoint` | Manual checkpoint |
| `codegateway.installGitHook` | Install pre-commit hook |

---

## Configuration

```json
{
  "codegateway.enabledPatterns": ["*"],
  "codegateway.minSeverity": "info",
  "codegateway.analyzeOnSave": true,
  "codegateway.analyzeOnOpen": true,
  "codegateway.showInlineHints": true,
  "codegateway.excludePaths": ["**/node_modules/**"],
  "codegateway.checkpointTrigger": "pre_commit",
  "codegateway.allowSkip": true,
  "codegateway.skipRequiresReason": false
}
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-01-04*
