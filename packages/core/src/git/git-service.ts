/**
 * Git service for CodeGateway
 * Provides git operations like status, diff, and staged file retrieval
 */

import { exec } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { GitStatus } from '@codegateway/shared';
import { parseGitDiff } from './diff-parser.js';
import type { GitFileDiff, GitFileStatus, GitRepoInfo, StagedFile } from './types.js';

const execAsync = promisify(exec);

/**
 * Service for interacting with git repositories
 */
export class GitService {
  private repoRoot: string | null = null;

  constructor(private readonly workingDir: string) {}

  /**
   * Check if the working directory is inside a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.getRepoRoot();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the root directory of the git repository
   */
  async getRepoRoot(): Promise<string> {
    if (this.repoRoot) {
      return this.repoRoot;
    }

    const { stdout } = await execAsync('git rev-parse --show-toplevel', {
      cwd: this.workingDir,
    });
    this.repoRoot = stdout.trim();
    return this.repoRoot;
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: this.workingDir,
    });
    return stdout.trim();
  }

  /**
   * Get repository info
   */
  async getRepoInfo(): Promise<GitRepoInfo> {
    const [rootDir, branch, stagedFiles, isDirty] = await Promise.all([
      this.getRepoRoot(),
      this.getCurrentBranch(),
      this.getStagedFiles(),
      this.hasUncommittedChanges(),
    ]);

    return {
      rootDir,
      branch,
      isDirty,
      stagedFiles,
    };
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: this.workingDir,
    });
    return stdout.trim().length > 0;
  }

  /**
   * Get list of staged files with their status
   */
  async getStagedFiles(): Promise<GitFileStatus[]> {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: this.workingDir,
    });

    const files: GitFileStatus[] = [];
    const lines = stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.substring(3).trim();

      // Handle renamed files (R  old -> new)
      const actualPath = filePath.includes(' -> ')
        ? (filePath.split(' -> ')[1] ?? filePath)
        : filePath;

      const staged = indexStatus !== ' ' && indexStatus !== '?';
      const modified = workTreeStatus !== ' ' && workTreeStatus !== '?';

      let status: GitStatus;
      if (indexStatus === '?' && workTreeStatus === '?') {
        status = 'untracked';
      } else if (staged) {
        status = 'staged';
      } else if (modified) {
        status = 'modified';
      } else {
        status = 'committed';
      }

      files.push({
        path: actualPath,
        status,
        staged,
        modified,
      });
    }

    return files;
  }

  /**
   * Get diff for staged changes
   */
  async getStagedDiff(): Promise<GitFileDiff[]> {
    const { stdout } = await execAsync('git diff --cached', {
      cwd: this.workingDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    });

    return parseGitDiff(stdout);
  }

  /**
   * Get diff for unstaged changes
   */
  async getUnstagedDiff(): Promise<GitFileDiff[]> {
    const { stdout } = await execAsync('git diff', {
      cwd: this.workingDir,
      maxBuffer: 10 * 1024 * 1024,
    });

    return parseGitDiff(stdout);
  }

  /**
   * Get diff for a specific file (staged)
   */
  async getFileDiff(filePath: string, staged = true): Promise<GitFileDiff | null> {
    const flag = staged ? '--cached' : '';
    const { stdout } = await execAsync(`git diff ${flag} -- "${filePath}"`, {
      cwd: this.workingDir,
    });

    const diffs = parseGitDiff(stdout);
    return diffs[0] ?? null;
  }

  /**
   * Get content of a staged file (from index)
   */
  async getStagedFileContent(filePath: string): Promise<string> {
    const { stdout } = await execAsync(`git show ":${filePath}"`, {
      cwd: this.workingDir,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  }

  /**
   * Get all staged files with their content and diffs
   */
  async getStagedFilesWithContent(): Promise<StagedFile[]> {
    const [stagedFileStatuses, diffs] = await Promise.all([
      this.getStagedFiles(),
      this.getStagedDiff(),
    ]);

    const stagedPaths = stagedFileStatuses.filter((f) => f.staged).map((f) => f.path);

    const result: StagedFile[] = [];

    for (const path of stagedPaths) {
      try {
        const content = await this.getStagedFileContent(path);
        const diff = diffs.find((d) => d.path === path) ?? {
          path,
          status: 'added' as const,
          hunks: [],
          addedLines: [],
          removedLines: [],
        };

        result.push({ path, content, diff });
      } catch (error) {
        // File might be deleted or binary
        console.warn(`Could not get content for ${path}:`, error);
      }
    }

    return result;
  }

  /**
   * Get the status of a specific file
   */
  async getFileStatus(filePath: string): Promise<GitFileStatus | null> {
    const files = await this.getStagedFiles();
    return files.find((f) => f.path === filePath) ?? null;
  }

  /**
   * Install a git hook
   */
  async installHook(hookName: string, content: string): Promise<void> {
    const repoRoot = await this.getRepoRoot();
    const hookPath = join(repoRoot, '.git', 'hooks', hookName);

    // Check if hook already exists
    let existingContent = '';
    try {
      const { readFile: readFileFs } = await import('node:fs/promises');
      existingContent = await readFileFs(hookPath, 'utf-8');
    } catch {
      // Hook doesn't exist yet
    }

    // If CodeGateway hook already installed, update it
    if (existingContent.includes('# CodeGateway hook')) {
      await this.writeHook(hookPath, content);
      return;
    }

    // If another hook exists, chain them
    if (existingContent.trim()) {
      const chainedContent = `${content}\n\n# Original hook\n${existingContent}`;
      await this.writeHook(hookPath, chainedContent);
      return;
    }

    await this.writeHook(hookPath, content);
  }

  /**
   * Uninstall a git hook (remove CodeGateway portion)
   */
  async uninstallHook(hookName: string): Promise<void> {
    const repoRoot = await this.getRepoRoot();
    const hookPath = join(repoRoot, '.git', 'hooks', hookName);

    try {
      const { readFile: readFileFs, writeFile, unlink } = await import('node:fs/promises');
      const content = await readFileFs(hookPath, 'utf-8');

      // Remove CodeGateway section
      const cgStart = content.indexOf('# CodeGateway hook');
      if (cgStart === -1) {
        return; // Not installed
      }

      const cgEnd = content.indexOf('# Original hook', cgStart);
      if (cgEnd !== -1) {
        // There was an original hook, restore it
        const originalHook = content.substring(cgEnd + '# Original hook\n'.length);
        await writeFile(hookPath, originalHook, { mode: 0o755 });
      } else {
        // Just our hook, remove the file
        await unlink(hookPath);
      }
    } catch {
      // Hook doesn't exist
    }
  }

  /**
   * Check if a hook is installed
   */
  async isHookInstalled(hookName: string): Promise<boolean> {
    const repoRoot = await this.getRepoRoot();
    const hookPath = join(repoRoot, '.git', 'hooks', hookName);

    try {
      const { readFile: readFileFs } = await import('node:fs/promises');
      const content = await readFileFs(hookPath, 'utf-8');
      return content.includes('# CodeGateway hook');
    } catch {
      return false;
    }
  }

  private async writeHook(hookPath: string, content: string): Promise<void> {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(hookPath, content, { mode: 0o755 });
  }
}
