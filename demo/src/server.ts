import { Analyzer } from "@codegateway/core";

const analyzer = new Analyzer();

const examples = {
  generic: `// Generic variable names that don't describe their purpose
const data = fetchUsers();
const result = processData(data);
const temp = result.value;
const item = items[0];
const obj = createObject();`,

  errors: `// Poor error handling patterns

// Empty catch block - errors silently swallowed
async function badExample1() {
  try {
    await riskyOperation();
  } catch (e) {
  }
}

// Swallowed error - caught but not used
async function badExample2() {
  try {
    await api.call();
  } catch (error) {
    console.log('Something went wrong');
  }
}

// Missing error boundary
async function noErrorHandling() {
  const response = await fetch('/api');
  return response.json();
}

// try without catch or finally - syntax error!
function badTry() {
  try {
    doSomething();
  }
}

// try...finally without catch (valid but flagged for review)
function cleanup() {
  try {
    acquireLock();
    doWork();
  } finally {
    releaseLock();
  }
}`,

  security: `// Security vulnerabilities

// Hardcoded secrets
const API_KEY = 'sk_live_12345abcdef';
const config = {
  password: 'super_secret_123',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.secret'
};

// SQL injection vulnerability
function getUserByName(name: string) {
  const query = \`SELECT * FROM users WHERE name = '\${name}'\`;
  return executeQuery(query);
}

// Unsafe eval
function dangerous(userInput: string) {
  return eval(userInput);
}

// new Function is also unsafe
function alsoDangerous(code: string) {
  const fn = new Function('x', code);
  return fn(42);
}`,

  quality: `// Code quality issues

// Magic numbers without explanation
function calculateTimeout() {
  return 86400 * 7 + 3600;
}

function paginate(page: number) {
  return items.slice(page * 25, (page + 1) * 25);
}

// TODOs without context
// TODO: fix this
// FIXME: broken

// Placeholder implementation
function notYetImplemented() {
  throw new Error('not implemented');
}

function emptyFunction() {
}

// Overly complex function (high cyclomatic complexity)
function complexLogic(a: boolean, b: boolean, c: boolean, d: boolean) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
              switch (i) {
                case 0: return 'zero';
                case 2: return 'two';
                case 4: return 'four';
                default:
                  if (a && b) return 'ab';
                  else if (c || d) return 'cd';
              }
            }
          }
        }
      }
    }
  }
  return a && b || c && d ? 'yes' : 'no';
}`,

  full: `// Full demo with multiple pattern types
import { fetchUsers, processUser } from './api';

// Generic names & hardcoded secret
const data = fetchUsers();
const API_KEY = 'sk_live_secret123';

// Poor error handling
async function processUserData(id: string) {
  try {
    const result = await fetch(\`/api/users/\${id}\`);
    const temp = await result.json();
    return temp;
  } catch (e) {
  }
}

// SQL injection
function findUser(name: string) {
  return query(\`SELECT * FROM users WHERE name = '\${name}'\`);
}

// TODO without context
// TODO: fix

// Magic numbers
function getPageSize() {
  return 25;
}

function calculateDelay() {
  return 86400000; // What is this?
}

// Placeholder
function notDone() {
  throw new Error('not implemented');
}

// Missing declarations for demo
declare function query(sql: string): any;
declare function fetchUsers(): any;`,
};

// Load HTML template at startup
const htmlTemplate = await Bun.file(import.meta.dir + "/index.html").text();

const server = Bun.serve({
  port: Number(process.env.PORT) || 8080,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      // Inject examples as JSON
      const htmlWithExamples = htmlTemplate.replace(
        "EXAMPLES_PLACEHOLDER",
        JSON.stringify(examples)
      );
      return new Response(htmlWithExamples, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (req.method === "POST" && url.pathname === "/analyze") {
      try {
        const body = (await req.json()) as { code: string };
        const result = await analyzer.analyzeFile(body.code, "input.ts", {
          minSeverity: "info",
        });
        return Response.json(result);
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🔒 CodeGateway Demo running at http://localhost:${server.port}`);
