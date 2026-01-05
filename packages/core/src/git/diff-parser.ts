/**
 * Git diff parser for CodeGateway
 * Parses unified diff format output from git diff
 */

import type { DiffLine, GitDiffHunk, GitFileDiff } from './types.js';

/**
 * Parse git diff output into structured format
 */
export function parseGitDiff(diffOutput: string): GitFileDiff[] {
  const files: GitFileDiff[] = [];
  const lines = diffOutput.split('\n');
  let currentFile: GitFileDiff | null = null;
  let currentHunk: GitDiffHunk | null = null;
  let newLineNumber = 0;
  let oldLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // New file diff starts with 'diff --git'
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }
      currentFile = parseFileDiffHeader(lines, i);
      currentHunk = null;
      continue;
    }

    // Skip diff metadata lines
    if (
      line.startsWith('index ') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('new file') ||
      line.startsWith('deleted file') ||
      line.startsWith('similarity') ||
      line.startsWith('rename from') ||
      line.startsWith('rename to')
    ) {
      continue;
    }

    // Hunk header: @@ -start,count +start,count @@
    if (line.startsWith('@@')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      const hunkInfo = parseHunkHeader(line);
      currentHunk = {
        startLine: hunkInfo.newStart,
        lineCount: hunkInfo.newCount,
        lines: [],
      };
      newLineNumber = hunkInfo.newStart;
      oldLineNumber = hunkInfo.oldStart;
      continue;
    }

    // Process diff content lines
    if (currentHunk && currentFile) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        // Added line
        const diffLine: DiffLine = {
          type: 'add',
          content: line.substring(1),
          newLineNumber,
        };
        currentHunk.lines.push(diffLine);
        currentFile.addedLines.push(newLineNumber);
        newLineNumber++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        // Removed line
        const diffLine: DiffLine = {
          type: 'remove',
          content: line.substring(1),
          oldLineNumber,
        };
        currentHunk.lines.push(diffLine);
        currentFile.removedLines.push(oldLineNumber);
        oldLineNumber++;
      } else if (line.startsWith(' ') || line === '') {
        // Context line
        const diffLine: DiffLine = {
          type: 'context',
          content: line.length > 0 ? line.substring(1) : '',
          newLineNumber,
          oldLineNumber,
        };
        currentHunk.lines.push(diffLine);
        newLineNumber++;
        oldLineNumber++;
      }
    }
  }

  // Don't forget the last file
  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  return files;
}

/**
 * Parse the file header from diff output
 */
function parseFileDiffHeader(lines: string[], startIndex: number): GitFileDiff {
  const diffLine = lines[startIndex];
  // diff --git a/path/to/file b/path/to/file
  const match = diffLine?.match(/^diff --git a\/(.*) b\/(.*)$/);

  let path = '';
  let oldPath: string | undefined;
  let status: GitFileDiff['status'] = 'modified';

  if (match) {
    oldPath = match[1];
    path = match[2] ?? '';
    if (oldPath !== path) {
      status = 'renamed';
    } else {
      oldPath = undefined;
    }
  }

  // Look ahead for status indicators
  for (let i = startIndex + 1; i < Math.min(startIndex + 10, lines.length); i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (line.startsWith('new file mode')) {
      status = 'added';
      oldPath = undefined;
      break;
    }
    if (line.startsWith('deleted file mode')) {
      status = 'deleted';
      oldPath = undefined;
      break;
    }
    if (line.startsWith('diff --git')) {
      break;
    }
  }

  return {
    path,
    oldPath,
    status,
    hunks: [],
    addedLines: [],
    removedLines: [],
  };
}

/**
 * Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
 */
function parseHunkHeader(line: string): {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
} {
  const match = new RegExp(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/).exec(line);

  if (!match) {
    return { oldStart: 1, oldCount: 0, newStart: 1, newCount: 0 };
  }

  return {
    oldStart: Number.parseInt(match[1] ?? '1', 10),
    oldCount: match[2] ? Number.parseInt(match[2], 10) : 1,
    newStart: Number.parseInt(match[3] ?? '1', 10),
    newCount: match[4] ? Number.parseInt(match[4], 10) : 1,
  };
}

/**
 * Get line ranges that were modified (for filtering analysis results)
 */
export function getModifiedLineRanges(diff: GitFileDiff): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  for (const hunk of diff.hunks) {
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    for (const line of hunk.lines) {
      if (line.type === 'add' && line.newLineNumber !== undefined) {
        rangeStart ??= line.newLineNumber;
        rangeEnd = line.newLineNumber;
      } else if (rangeStart !== null && rangeEnd !== null) {
        ranges.push({ start: rangeStart, end: rangeEnd });
        rangeStart = null;
        rangeEnd = null;
      }
    }

    if (rangeStart !== null && rangeEnd !== null) {
      ranges.push({ start: rangeStart, end: rangeEnd });
    }
  }

  // Merge adjacent ranges
  return mergeRanges(ranges);
}

/**
 * Merge overlapping or adjacent line ranges
 */
function mergeRanges(
  ranges: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return [];

  // Sort by start
  const sorted = [...ranges].sort((a, b) => a.start - b.start);

  const first = sorted[0];
  if (!first) return [];

  const merged: Array<{ start: number; end: number }> = [first];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged.at(-1);

    if (!current || !last) continue;

    // If overlapping or adjacent (within 3 lines), merge
    if (current.start <= last.end + 3) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Check if a line number falls within modified ranges
 */
export function isLineModified(
  lineNumber: number,
  ranges: Array<{ start: number; end: number }>,
): boolean {
  return ranges.some((r) => lineNumber >= r.start && lineNumber <= r.end);
}
