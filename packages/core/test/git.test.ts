import { describe, expect, test } from 'bun:test';
import { getModifiedLineRanges, isLineModified, parseGitDiff } from '../src/git/diff-parser.js';

describe('Git Diff Parser', () => {
  describe('parseGitDiff', () => {
    test('should parse a simple added file', () => {
      const diff = `diff --git a/newfile.ts b/newfile.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/newfile.ts
@@ -0,0 +1,5 @@
+export function hello() {
+  console.log('Hello');
+}
+
+export const x = 1;
`;

      const result = parseGitDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('newfile.ts');
      expect(result[0]?.status).toBe('added');
      expect(result[0]?.addedLines).toEqual([1, 2, 3, 4, 5]);
      expect(result[0]?.removedLines).toEqual([]);
    });

    test('should parse a modified file', () => {
      const diff = `diff --git a/existing.ts b/existing.ts
index abc1234..def5678 100644
--- a/existing.ts
+++ b/existing.ts
@@ -1,4 +1,5 @@
 export function hello() {
-  console.log('Hello');
+  console.log('Hello World');
+  console.log('Added line');
 }
`;

      const result = parseGitDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('existing.ts');
      expect(result[0]?.status).toBe('modified');
      expect(result[0]?.addedLines).toEqual([2, 3]);
      expect(result[0]?.removedLines).toEqual([2]);
    });

    test('should parse multiple files', () => {
      const diff = `diff --git a/file1.ts b/file1.ts
index abc1234..def5678 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 const c = 3;
diff --git a/file2.ts b/file2.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/file2.ts
@@ -0,0 +1,2 @@
+export const x = 1;
+export const y = 2;
`;

      const result = parseGitDiff(diff);
      expect(result).toHaveLength(2);
      expect(result[0]?.path).toBe('file1.ts');
      expect(result[0]?.status).toBe('modified');
      expect(result[1]?.path).toBe('file2.ts');
      expect(result[1]?.status).toBe('added');
    });

    test('should parse deleted file', () => {
      const diff = `diff --git a/deleted.ts b/deleted.ts
deleted file mode 100644
index abc1234..0000000
--- a/deleted.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function gone() {
-  return 'deleted';
-}
`;

      const result = parseGitDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('deleted.ts');
      expect(result[0]?.status).toBe('deleted');
      expect(result[0]?.removedLines).toEqual([1, 2, 3]);
    });

    test('should parse renamed file', () => {
      const diff = `diff --git a/old-name.ts b/new-name.ts
similarity index 90%
rename from old-name.ts
rename to new-name.ts
index abc1234..def5678 100644
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 const c = 3;
`;

      const result = parseGitDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('new-name.ts');
      expect(result[0]?.oldPath).toBe('old-name.ts');
      expect(result[0]?.status).toBe('renamed');
    });

    test('should handle multiple hunks', () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc1234..def5678 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 const a = 1;
+const b = 2;
 const c = 3;
 const d = 4;
@@ -10,3 +11,4 @@
 const x = 10;
 const y = 11;
+const z = 12;
 const end = true;
`;

      const result = parseGitDiff(diff);
      expect(result).toHaveLength(1);
      expect(result[0]?.hunks).toHaveLength(2);
      expect(result[0]?.hunks[0]?.startLine).toBe(1);
      expect(result[0]?.hunks[1]?.startLine).toBe(11);
    });

    test('should return empty array for empty diff', () => {
      const result = parseGitDiff('');
      expect(result).toEqual([]);
    });
  });

  describe('getModifiedLineRanges', () => {
    test('should return ranges for added lines', () => {
      const diff = parseGitDiff(`diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,5 @@
 const a = 1;
+const b = 2;
+const c = 3;
 const d = 4;
`);

      const ranges = getModifiedLineRanges(diff[0]!);
      expect(ranges).toEqual([{ start: 2, end: 3 }]);
    });

    test('should merge adjacent ranges', () => {
      const diff = parseGitDiff(`diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,6 +1,8 @@
 const a = 1;
+const b = 2;
 const c = 3;
 const d = 4;
+const e = 5;
 const f = 6;
`);

      const ranges = getModifiedLineRanges(diff[0]!);
      // Lines 2 and 5 are added, but they should be merged since they're within 3 lines
      expect(ranges).toEqual([{ start: 2, end: 5 }]);
    });
  });

  describe('isLineModified', () => {
    test('should return true for lines in range', () => {
      const ranges = [
        { start: 5, end: 10 },
        { start: 20, end: 25 },
      ];

      expect(isLineModified(5, ranges)).toBe(true);
      expect(isLineModified(7, ranges)).toBe(true);
      expect(isLineModified(10, ranges)).toBe(true);
      expect(isLineModified(20, ranges)).toBe(true);
      expect(isLineModified(25, ranges)).toBe(true);
    });

    test('should return false for lines outside range', () => {
      const ranges = [
        { start: 5, end: 10 },
        { start: 20, end: 25 },
      ];

      expect(isLineModified(1, ranges)).toBe(false);
      expect(isLineModified(4, ranges)).toBe(false);
      expect(isLineModified(11, ranges)).toBe(false);
      expect(isLineModified(15, ranges)).toBe(false);
      expect(isLineModified(26, ranges)).toBe(false);
    });

    test('should return false for empty ranges', () => {
      expect(isLineModified(5, [])).toBe(false);
    });
  });
});
