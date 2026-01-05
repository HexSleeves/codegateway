/**
 * Pre-commit hook generator for CodeGateway
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read a hook template file
 */
function readHookTemplate(name: string): string {
  // __dirname works in CommonJS
  const hookPath = join(__dirname, 'hooks', `${name}.sh`);
  return readFileSync(hookPath, 'utf-8');
}

export interface PreCommitHookOptions {
  /** Block commit on critical issues */
  blockOnCritical?: boolean;
  /** Block commit on warnings */
  blockOnWarning?: boolean;
  /** Show checkpoint UI */
  showCheckpoint?: boolean;
  /** Minimum severity to report */
  minSeverity?: 'info' | 'warning' | 'critical';
}

/**
 * Generate the pre-commit hook script content
 */
export function generatePreCommitHook(options: PreCommitHookOptions = {}): string {
  const {
    blockOnCritical = true,
    blockOnWarning = false,
    showCheckpoint = true,
    minSeverity = 'warning',
  } = options;

  let template = readHookTemplate('pre-commit');

  // Replace placeholders
  template = template.replace('{{BLOCK_ON_CRITICAL}}', blockOnCritical ? '1' : '0');
  template = template.replace('{{BLOCK_ON_WARNING}}', blockOnWarning ? '1' : '0');
  template = template.replace('{{SHOW_CHECKPOINT}}', showCheckpoint ? '1' : '0');
  template = template.replace('{{MIN_SEVERITY}}', minSeverity);

  return template;
}

export interface PrePushHookOptions {
  /** Block push on critical issues */
  blockOnCritical?: boolean;
  /** Minimum severity to report */
  minSeverity?: 'info' | 'warning' | 'critical';
}

/**
 * Generate the pre-push hook script content
 */
export function generatePrePushHook(options: PrePushHookOptions = {}): string {
  const { blockOnCritical = true, minSeverity = 'critical' } = options;

  let template = readHookTemplate('pre-push');

  // Replace placeholders
  template = template.replace('{{BLOCK_ON_CRITICAL}}', blockOnCritical ? '1' : '0');
  template = template.replace('{{MIN_SEVERITY}}', minSeverity);

  return template;
}
