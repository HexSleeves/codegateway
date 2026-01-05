import type { CheckpointStatus, ComprehensionCheckpoint } from '@codegateway/shared';
import type * as vscode from 'vscode';

/**
 * Stored checkpoint record
 */
export interface StoredCheckpoint {
  id: string;
  type: 'pre_commit' | 'pre_push' | 'on_demand' | 'scheduled';
  file: string;
  status: CheckpointStatus;
  patternCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  skipReason?: string | undefined;
  completedAt: string; // ISO date string
  timeSpentMs?: number | undefined;
}

/**
 * Simple store for checkpoint history using VS Code's global state
 * Will be replaced with SQLite in Phase 5
 */
export class CheckpointStore {
  private static readonly STORAGE_KEY = 'codegateway.checkpoints';
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Save a checkpoint to storage
   */
  async save(checkpoint: StoredCheckpoint): Promise<void> {
    const checkpoints = await this.getAll();
    checkpoints.push(checkpoint);

    // Keep only last 1000 checkpoints
    const trimmed = checkpoints.slice(-1000);

    await this.context.globalState.update(CheckpointStore.STORAGE_KEY, trimmed);
  }

  /**
   * Get all stored checkpoints
   */
  async getAll(): Promise<StoredCheckpoint[]> {
    return this.context.globalState.get<StoredCheckpoint[]>(CheckpointStore.STORAGE_KEY, []);
  }

  /**
   * Get checkpoints for a specific file
   */
  async getByFile(filePath: string): Promise<StoredCheckpoint[]> {
    const all = await this.getAll();
    return all.filter((c) => c.file === filePath);
  }

  /**
   * Get checkpoints within a date range
   */
  async getByDateRange(start: Date, end: Date): Promise<StoredCheckpoint[]> {
    const all = await this.getAll();
    return all.filter((c) => {
      const date = new Date(c.completedAt);
      return date >= start && date <= end;
    });
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<CheckpointStats> {
    const all = await this.getAll();

    const total = all.length;
    const passed = all.filter((c) => c.status === 'passed').length;
    const failed = all.filter((c) => c.status === 'failed').length;
    const skipped = all.filter((c) => c.status === 'skipped').length;

    const passRate = total > 0 ? passed / total : 0;

    // Count patterns
    const totalPatterns = all.reduce((sum, c) => sum + c.patternCount, 0);
    const criticalPatterns = all.reduce((sum, c) => sum + c.criticalCount, 0);
    const warningPatterns = all.reduce((sum, c) => sum + c.warningCount, 0);
    const infoPatterns = all.reduce((sum, c) => sum + c.infoCount, 0);

    // Average time spent
    const checkpointsWithTime = all.filter((c) => c.timeSpentMs !== undefined);
    const avgTimeMs =
      checkpointsWithTime.length > 0
        ? checkpointsWithTime.reduce((sum, c) => sum + (c.timeSpentMs ?? 0), 0) /
          checkpointsWithTime.length
        : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate,
      totalPatterns,
      criticalPatterns,
      warningPatterns,
      infoPatterns,
      avgTimeMs,
    };
  }

  /**
   * Clear all stored checkpoints
   */
  async clear(): Promise<void> {
    await this.context.globalState.update(CheckpointStore.STORAGE_KEY, []);
  }

  /**
   * Create a StoredCheckpoint from a ComprehensionCheckpoint
   */
  static fromCheckpoint(
    checkpoint: ComprehensionCheckpoint,
    skipReason?: string,
  ): StoredCheckpoint {
    const criticalCount = checkpoint.patterns.filter((p) => p.severity === 'critical').length;
    const warningCount = checkpoint.patterns.filter((p) => p.severity === 'warning').length;
    const infoCount = checkpoint.patterns.filter((p) => p.severity === 'info').length;

    return {
      id: checkpoint.id,
      type: checkpoint.type,
      file: checkpoint.file,
      status: checkpoint.status,
      patternCount: checkpoint.patterns.length,
      criticalCount,
      warningCount,
      infoCount,
      skipReason,
      completedAt: checkpoint.completedAt?.toISOString() ?? new Date().toISOString(),
      timeSpentMs: checkpoint.timeSpentMs,
    };
  }
}

export interface CheckpointStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  totalPatterns: number;
  criticalPatterns: number;
  warningPatterns: number;
  infoPatterns: number;
  avgTimeMs: number;
}
