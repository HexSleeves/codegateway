/**
 * Git-related types for CodeGateway
 */

import type { GitStatus } from '@codegateway/shared';

export interface GitDiffHunk {
  /** Starting line in the new version */
  startLine: number;
  /** Number of lines in the hunk */
  lineCount: number;
  /** The actual changed lines */
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  /** Line number in the new file (for 'add' and 'context') */
  newLineNumber?: number;
  /** Line number in the old file (for 'remove' and 'context') */
  oldLineNumber?: number;
}

export interface GitFileDiff {
  /** File path (relative to repo root) */
  path: string;
  /** Previous path if renamed */
  oldPath?: string | undefined;
  /** Type of change */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Hunks of changes */
  hunks: GitDiffHunk[];
  /** Added line numbers (1-indexed) */
  addedLines: number[];
  /** Removed line numbers from old file */
  removedLines: number[];
}

export interface GitFileStatus {
  path: string;
  status: GitStatus;
  /** Whether file is staged for commit */
  staged: boolean;
  /** Whether file has unstaged changes */
  modified: boolean;
}

export interface StagedFile {
  path: string;
  content: string;
  diff: GitFileDiff;
}

export interface GitRepoInfo {
  /** Root directory of the git repository */
  rootDir: string;
  /** Current branch name */
  branch: string;
  /** Whether there are uncommitted changes */
  isDirty: boolean;
  /** List of staged files */
  stagedFiles: GitFileStatus[];
}
