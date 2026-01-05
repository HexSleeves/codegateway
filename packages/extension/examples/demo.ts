/**
 * Demo file showcasing CodeGateway pattern detection
 * Open this file in VS Code with the extension installed to see it in action
 */

// Generic variable names - CodeGateway will flag these
const data = fetchSomething();
const result = processData(data);
const _temp = result.value;

// Empty catch block - Critical severity
async function _badErrorHandling() {
  try {
    await riskyOperation();
  } catch (_e) {
    // Empty catch - errors silently swallowed!
  }
}

// Swallowed error - error is caught but never used
async function _anotherBadExample() {
  try {
    await riskyOperation();
  } catch (_error) {
    console.log('Something went wrong'); // Generic message, error not logged
  }
}

// Missing error boundary - async without try-catch
async function _fetchData() {
  const response = await fetch('/api/users');
  const users = await response.json();
  return users;
}

// Hardcoded secret - Critical severity
const _API_KEY = 'sk_live_12345abcdefghijklmnop';
const _config = {
  secret: 'super_secret_password_123',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
};

// SQL concatenation - potential SQL injection
function _getUserByName(name: string) {
  const query = `SELECT * FROM users WHERE name = '${name}'`;
  return executeQuery(query);
}

// Unsafe eval usage
function _dangerous(userInput: string) {
  return eval(userInput);
}

// Magic numbers
function _calculateTimeout() {
  return 86400 * 7 + 3600; // What do these numbers mean?
}

// TODO without context
// TODO: fix this
// FIXME: broken

// Placeholder implementation
function _notYetImplemented() {
  throw new Error('not implemented');
}

// Overly complex function
function _complexLogic(a: boolean, b: boolean, c: boolean, d: boolean, e: number) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          for (let i = 0; i < e; i++) {
            if (i % 2 === 0) {
              switch (i) {
                case 0:
                  return 'zero';
                case 2:
                  return 'two';
                case 4:
                  return 'four';
                default:
                  if (a && b) {
                    return 'ab';
                  } else if (c || d) {
                    return 'cd';
                  }
              }
            }
          }
        }
      }
    }
  }
  return (a && b) || (c && d) ? 'yes' : 'no';
}

// Helper stubs for the demo
declare function fetchSomething(): any;
declare function processData(d: any): any;
declare function riskyOperation(): Promise<void>;
declare function executeQuery(q: string): any;
