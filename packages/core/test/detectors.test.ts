import { describe, it, expect } from 'vitest';
import { Analyzer } from '../src/analyzer.js';
import { NamingPatternDetector } from '../src/detectors/naming.js';
import { ErrorHandlingDetector } from '../src/detectors/errorHandling.js';
import { SecurityDetector } from '../src/detectors/security.js';
import { CodeQualityDetector } from '../src/detectors/codeQuality.js';

describe('NamingPatternDetector', () => {
  const detector = new NamingPatternDetector();

  it('should detect generic variable names', async () => {
    const code = `
      const data = fetchData();
      const result = process(data);
      const temp = result.value;
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some(p => p.type === 'generic_variable_name')).toBe(true);
    expect(patterns.some(p => p.description.includes('data'))).toBe(true);
    expect(patterns.some(p => p.description.includes('result'))).toBe(true);
  });

  it('should allow loop variables', async () => {
    const code = `
      for (let i = 0; i < 10; i++) {
        console.log(i);
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    // 'i' should not be flagged in a for loop
    expect(patterns.filter(p => p.description.includes('"i"')).length).toBe(0);
  });

  it('should allow catch clause error variables', async () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
        console.error(e);
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    // 'e' should not be flagged in a catch clause
    expect(patterns.filter(p => p.description.includes('"e"')).length).toBe(0);
  });
});

describe('ErrorHandlingDetector', () => {
  const detector = new ErrorHandlingDetector();

  it('should detect empty catch blocks', async () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.some(p => p.type === 'empty_catch_block')).toBe(true);
    expect(patterns.find(p => p.type === 'empty_catch_block')?.severity).toBe('critical');
  });

  it('should detect swallowed errors', async () => {
    const code = `
      try {
        doSomething();
      } catch (error) {
        console.log('Something went wrong');
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.some(p => p.type === 'swallowed_error')).toBe(true);
  });

  it('should not flag when error is used', async () => {
    const code = `
      try {
        doSomething();
      } catch (error) {
        console.error('Operation failed:', error);
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.filter(p => p.type === 'swallowed_error').length).toBe(0);
  });

  it('should detect missing error boundaries in async functions', async () => {
    const code = `
      async function fetchData() {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.some(p => p.type === 'missing_error_boundary')).toBe(true);
  });
});

describe('SecurityDetector', () => {
  const detector = new SecurityDetector();

  it('should detect hardcoded API keys', async () => {
    const code = `
      const apiKey = "sk_live_12345abcdef";
      const config = { api_key: 'secret123' };
    `;

    const patterns = await detector.analyze(code, 'app.ts');

    expect(patterns.some(p => p.type === 'hardcoded_secret')).toBe(true);
    expect(patterns.find(p => p.type === 'hardcoded_secret')?.severity).toBe('critical');
  });

  it('should detect unsafe eval usage', async () => {
    const code = `
      const result = eval(userInput);
      const fn = new Function('x', userCode);
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.filter(p => p.type === 'unsafe_eval').length).toBeGreaterThanOrEqual(2);
  });

  it('should skip test files for secret detection', async () => {
    const code = `
      const apiKey = "test_api_key_123";
    `;

    const patterns = await detector.analyze(code, 'app.test.ts');

    expect(patterns.filter(p => p.type === 'hardcoded_secret').length).toBe(0);
  });
});

describe('CodeQualityDetector', () => {
  const detector = new CodeQualityDetector();

  it('should detect TODO without context', async () => {
    const code = `
      // TODO: fix
      // TODO: implement
      function doSomething() {
        return null;
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.some(p => p.type === 'todo_without_context')).toBe(true);
  });

  it('should not flag detailed TODOs', async () => {
    const code = `
      // TODO: Implement caching layer using Redis to improve performance
      // FIXME: This function has a race condition when called concurrently
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.filter(p => p.type === 'todo_without_context').length).toBe(0);
  });

  it('should detect placeholder implementations', async () => {
    const code = `
      function notImplemented() {
        throw new Error('not implemented');
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.some(p => p.type === 'placeholder_implementation')).toBe(true);
  });

  it('should detect overly complex functions', async () => {
    const code = `
      function complexFunction(a, b, c, d) {
        if (a) {
          if (b) {
            if (c) {
              return 1;
            } else {
              return 2;
            }
          } else if (d) {
            for (let i = 0; i < 10; i++) {
              if (i % 2 === 0) {
                switch(i) {
                  case 0: return 'zero';
                  case 2: return 'two';
                  case 4: return 'four';
                  default: return 'other';
                }
              }
            }
          }
        }
        return a && b || c && d ? 'yes' : 'no';
      }
    `;

    const patterns = await detector.analyze(code, 'test.ts');

    expect(patterns.some(p => p.type === 'overly_complex_function')).toBe(true);
  });
});

describe('Analyzer', () => {
  it('should analyze a file with multiple detectors', async () => {
    const analyzer = new Analyzer();

    const code = `
      async function fetchData() {
        const data = await fetch('/api');
        try {
          return data.json();
        } catch (e) {
        }
      }
    `;

    const result = await analyzer.analyzeFile(code, 'test.ts');

    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.language).toBe('typescript');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('should respect severity filter', async () => {
    const analyzer = new Analyzer();

    const code = `
      const data = fetchData();
      try { x(); } catch(e) {}
    `;

    // With critical severity filter
    const criticalResult = await analyzer.analyzeFile(code, 'test.ts', {
      minSeverity: 'critical',
    });

    // With info severity filter
    const infoResult = await analyzer.analyzeFile(code, 'test.ts', {
      minSeverity: 'info',
    });

    expect(criticalResult.patterns.length).toBeLessThanOrEqual(infoResult.patterns.length);
  });

  it('should exclude files matching patterns', async () => {
    const analyzer = new Analyzer({
      excludePaths: ['**/node_modules/**'],
    });

    const code = `const data = 1;`;

    const result = await analyzer.analyzeFile(code, '/project/node_modules/some-package/index.ts');

    expect(result.patterns.length).toBe(0);
  });
});
