# Pattern Reference

CodeGateway detects patterns commonly found in AI-generated code that may
indicate areas needing human review. This reference explains each pattern, why
it matters, and how to address it.

## Severity Levels

| Level | Icon | Description |
| ----- | ---- | ----------- |
| **Critical** | 🔴 | Should block commit - security risks or definite bugs |
| **Warning** | 🟡 | Needs attention - potential issues or code smells |
| **Info** | 🔵 | Suggestions - minor improvements |

---

## Naming Patterns

### `generic_variable_name`

**Severity:** Warning

**Description:** Variables with generic names like `data`, `result`, `temp`,
`item`, `value`, `obj`, `arr`.

**Why it matters:** Generic names make code harder to understand. AI tools
often use placeholder names that don't convey meaning.

**Example:**

```typescript
// ❌ Bad
const data = await fetchUsers();
const result = data.filter(item => item.active);

// ✅ Good
const users = await fetchUsers();
const activeUsers = users.filter(user => user.active);
```

**Exceptions:** Loop variables (`for (const item of items)`), catch clause parameters (`catch (error)`).

---

### `inconsistent_naming`

**Severity:** Info

**Description:** Mixed naming conventions in the same file (e.g., `camelCase`
and `snake_case`).

**Why it matters:** Inconsistent naming suggests code was assembled from different sources without review.

**Example:**

```typescript
// ❌ Bad - mixed conventions
const user_name = 'John';
const userAge = 25;
const user_email = 'john@example.com';

// ✅ Good - consistent camelCase
const userName = 'John';
const userAge = 25;
const userEmail = 'john@example.com';
```

---

## Error Handling Patterns

### `empty_catch_block`

**Severity:** Critical

**Description:** A `catch` block that contains no code or only comments.

**Why it matters:** Silently swallowing errors hides bugs and makes debugging
nearly impossible. This is one of the most common AI-generated anti-patterns.

**Example:**

```typescript
// ❌ Bad
try {
  await saveData();
} catch (error) {
  // TODO: handle error
}

// ✅ Good - log the error
try {
  await saveData();
} catch (error) {
  console.error('Failed to save data:', error);
  throw error; // or handle appropriately
}

// ✅ Good - intentional ignore with explanation
try {
  await saveData();
} catch (error) {
  // Intentionally ignored: saveData failure is non-critical
  // and we fall back to local storage below
}
```

---

### `swallowed_error`

**Severity:** Warning

**Description:** An error is caught but never used (logged, thrown, or returned).

**Why it matters:** The error information is lost, making it impossible to
diagnose issues.

**Example:**

```typescript
// ❌ Bad - error caught but not used
try {
  await riskyOperation();
} catch (error) {
  showNotification('Something went wrong');
}

// ✅ Good - error is logged
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  showNotification('Something went wrong');
}
```

---

### `missing_error_boundary`

**Severity:** Warning

**Description:** An `async` function that doesn't have try-catch for operations that could fail.

**Why it matters:** Unhandled promise rejections can crash your application or leave it in an inconsistent state.

**Example:**

```typescript
// ❌ Bad - no error handling
async function fetchUserData(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// ✅ Good - errors handled
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    throw error;
  }
}
```

---

### `generic_error_message`

**Severity:** Info

**Description:** Error messages like "Something went wrong" or "An error occurred"
that don't provide useful information.

**Why it matters:** Generic messages make debugging difficult and provide poor
user experience.

**Example:**

```typescript
// ❌ Bad
throw new Error('An error occurred');

// ✅ Good
throw new Error(`Failed to parse config file: ${filePath}`);
```

---

### `try_without_catch`

**Severity:** Info

**Description:** A `try...finally` block without a `catch` clause.

**Why it matters:** Errors will propagate to the caller. This may be intentional
for cleanup patterns, but should be verified.

**Example:**

```typescript
// ⚠️ Review this - is error propagation intentional?
try {
  const file = await openFile(path);
  return processFile(file);
} finally {
  await cleanup();
}

// Consider if you need to catch errors:
try {
  const file = await openFile(path);
  return processFile(file);
} catch (error) {
  console.error('File processing failed:', error);
  throw error;
} finally {
  await cleanup();
}
```

---

## Security Patterns

### `hardcoded_secret`

**Severity:** Critical

**Description:** API keys, passwords, tokens, or other secrets hardcoded in
source code.

**Why it matters:** Secrets in code get committed to version control and exposed.
This is a severe security vulnerability.

**Detected patterns:**

- `API_KEY = "..."`
- `password = "..."`
- `secret = "..."`
- `token = "..."`
- AWS access keys (`AKIA...`)
- JWT tokens (`eyJ...`)
- Private keys (`-----BEGIN...`)

**Example:**

```typescript
// ❌ Bad - never do this
const API_KEY = 'sk-1234567890abcdef';
const DATABASE_PASSWORD = 'super_secret_123';

// ✅ Good - use environment variables
const API_KEY = process.env.API_KEY;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

// ✅ Good - use a secrets manager
const API_KEY = await secretsManager.getSecret('api-key');
```

---

### `sql_concatenation`

**Severity:** Critical

**Description:** SQL queries built using string concatenation with variables.

**Why it matters:** SQL injection vulnerabilities allow attackers to execute
arbitrary database commands.

**Example:**

```typescript
// ❌ Bad - SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;
const query = 'SELECT * FROM users WHERE name = "' + userName + '"';

// ✅ Good - parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// ✅ Good - using an ORM
const user = await User.findById(userId);
```

---

### `unsafe_eval`

**Severity:** Critical

**Description:** Use of `eval()`, `new Function()`, or `setTimeout`/`setInterval` with string arguments.

**Why it matters:** Executing arbitrary code opens severe security vulnerabilities and makes code unpredictable.

**Example:**

```typescript
// ❌ Bad
eval(userInput);
new Function('return ' + expression)();
setTimeout('doSomething()', 1000);

// ✅ Good
JSON.parse(userInput); // for JSON data
setTimeout(doSomething, 1000); // function reference
setTimeout(() => doSomething(), 1000); // arrow function
```

---

### `insecure_random`

**Severity:** Warning

**Description:** Use of `Math.random()` in security-sensitive contexts (tokens, IDs, passwords).

**Why it matters:** `Math.random()` is not cryptographically secure. Attackers may be able to predict values.

**Example:**

```typescript
// ❌ Bad - predictable "random" token
const token = Math.random().toString(36).substring(2);

// ✅ Good - cryptographically secure
import { randomBytes } from 'crypto';
const token = randomBytes(32).toString('hex');

// ✅ Good - using uuid
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

---

## Code Quality Patterns

### `magic_number`

**Severity:** Info

**Description:** Numeric literals used without explanation.

**Why it matters:** Magic numbers make code hard to understand and maintain. What does `86400000` mean?

**Example:**

```typescript
// ❌ Bad
setTimeout(callback, 86400000);
if (age >= 18) { ... }

// ✅ Good - named constants
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
setTimeout(callback, ONE_DAY_MS);

const LEGAL_AGE = 18;
if (age >= LEGAL_AGE) { ... }
```

**Exceptions:** 0, 1, -1, 100 (percentages), and numbers in obvious contexts.

---

### `todo_without_context`

**Severity:** Info

**Description:** TODO/FIXME comments without explanation of what needs to be done.

**Why it matters:** Vague TODOs are often left by AI and never addressed because no one knows what they mean.

**Example:**

```typescript
// ❌ Bad
// TODO: fix this
// FIXME
// TODO: implement

// ✅ Good - actionable TODOs
// TODO(#123): Add retry logic for network failures
// FIXME: Race condition when multiple users edit simultaneously
// TODO(@john): Optimize query - currently O(n^2)
```

---

### `commented_out_code`

**Severity:** Info

**Description:** Blocks of commented-out code.

**Why it matters:** Dead code clutters the codebase. Use version control to preserve old code.

**Example:**

```typescript
// ❌ Bad
// function oldImplementation() {
//   return data.map(x => x * 2);
// }

// ✅ Good - delete it, git remembers
function newImplementation() {
  return data.map(x => x * 2 + 1);
}
```

---

### `overly_complex_function`

**Severity:** Warning

**Description:** Functions with high cyclomatic complexity (many branches, loops, conditions).

**Why it matters:** Complex functions are hard to understand, test, and maintain. AI often generates monolithic functions.

**Example:**

```typescript
// ❌ Bad - too many branches
function processOrder(order) {
  if (order.type === 'standard') {
    if (order.priority === 'high') {
      // ...
    } else if (order.priority === 'low') {
      // ...
    }
  } else if (order.type === 'express') {
    // ... many more branches
  }
}

// ✅ Good - split into smaller functions
function processOrder(order) {
  const processor = getProcessor(order.type);
  return processor.process(order);
}
```

---

### `placeholder_implementation`

**Severity:** Warning

**Description:** Functions that throw "not implemented" errors or contain only placeholder code.

**Why it matters:** AI often generates function stubs that look complete but don't actually work.

**Example:**

```typescript
// ❌ Bad
function calculateTax(amount: number): number {
  throw new Error('Not implemented');
}

function processPayment(payment: Payment): void {
  // TODO: implement payment processing
  console.log('Processing payment...');
}

// ✅ Good - actual implementation or clear interface
function calculateTax(amount: number): number {
  return amount * TAX_RATE;
}

// Or mark as abstract/interface if intentionally unimplemented
interface PaymentProcessor {
  processPayment(payment: Payment): Promise<void>;
}
```

---

## Disabling Patterns

To disable specific patterns, modify your VS Code settings:

```json
{
  "codegateway.enabledPatterns": [
    // Only include patterns you want to detect
    "empty_catch_block",
    "hardcoded_secret",
    "unsafe_eval"
  ]
}
```

Or adjust minimum severity:

```json
{
  "codegateway.minSeverity": "warning"  // Hides "info" patterns
}
```

## Next Steps

- [Configuration](./configuration.md) - Customize which patterns to detect
- [Git Integration](./git-integration.md) - Block commits with critical patterns
