import * as fs from 'node:fs';
import { matchesGlob } from '@codegateway/shared';
import { glob } from 'glob';

export async function collectFiles(paths: string[], excludePatterns: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const path of paths) {
    const stat = fs.statSync(path, { throwIfNoEntry: false });
    if (stat?.isDirectory()) {
      const found = await glob(`${path}/**/*.{ts,tsx,js,jsx}`, {
        ignore: excludePatterns,
      });
      files.push(...found);
    } else if (stat?.isFile()) {
      files.push(path);
    }
  }

  return files.filter((f) => !matchesGlob(f, excludePatterns));
}

export function readFileContent(file: string): string {
  return fs.readFileSync(file, 'utf-8');
}
