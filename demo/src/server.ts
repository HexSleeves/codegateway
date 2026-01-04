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
declare function fetchUsers(): any;`
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGateway Demo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #252526;
      padding: 12px 20px;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    header h1 {
      font-size: 18px;
      font-weight: 500;
      color: #569cd6;
    }
    header .tagline { color: #808080; font-size: 13px; }
    .toolbar { margin-left: auto; display: flex; gap: 8px; }
    button {
      background: #0e639c;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    button:hover { background: #1177bb; }
    button.secondary { background: #3c3c3c; }
    button.secondary:hover { background: #4c4c4c; }
    main { flex: 1; display: flex; overflow: hidden; }
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #3c3c3c;
    }
    .editor-header {
      background: #2d2d2d;
      padding: 8px 16px;
      font-size: 12px;
      color: #808080;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      justify-content: space-between;
    }
    #editor { flex: 1; }
    .results-container {
      width: 420px;
      display: flex;
      flex-direction: column;
      background: #252526;
    }
    .results-header {
      background: #2d2d2d;
      padding: 8px 16px;
      font-size: 12px;
      color: #808080;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      justify-content: space-between;
    }
    .results-list { flex: 1; overflow-y: auto; padding: 8px; }
    .pattern {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      border-left: 3px solid;
      background: #2d2d2d;
      cursor: pointer;
    }
    .pattern:hover { background: #333; }
    .pattern.critical { border-color: #f44336; }
    .pattern.warning { border-color: #ff9800; }
    .pattern.info { border-color: #2196f3; }
    .pattern-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .pattern-type {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(255,255,255,0.1);
      font-family: monospace;
    }
    .pattern-line { font-size: 11px; color: #808080; }
    .pattern-desc { font-size: 13px; margin-bottom: 4px; }
    .pattern-explanation { font-size: 12px; color: #a0a0a0; line-height: 1.4; }
    .pattern-suggestion { margin-top: 8px; font-size: 11px; color: #4ec9b0; }
    .summary {
      padding: 12px 16px;
      border-top: 1px solid #3c3c3c;
      display: flex;
      gap: 24px;
      background: #2d2d2d;
    }
    .summary-item { text-align: center; }
    .summary-count { font-size: 20px; font-weight: 600; }
    .summary-label { font-size: 11px; color: #808080; }
    .critical-count { color: #f44336; }
    .warning-count { color: #ff9800; }
    .info-count { color: #2196f3; }
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #808080;
    }
    .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
    .examples-bar {
      background: #2d2d2d;
      padding: 8px 16px;
      border-top: 1px solid #3c3c3c;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .example-btn { background: #3c3c3c; font-size: 12px; padding: 4px 10px; }
    .error-marker { background: rgba(244, 67, 54, 0.3); }
    .warning-marker { background: rgba(255, 152, 0, 0.2); }
    .info-marker { background: rgba(33, 150, 243, 0.15); }
  </style>
</head>
<body>
  <header>
    <h1>\u{1F512} CodeGateway</h1>
    <span class="tagline">AI Code Review Trust Layer</span>
    <div class="toolbar">
      <button onclick="analyze()" id="analyze-btn">\u25B6 Analyze</button>
      <button class="secondary" onclick="clearEditor()">Clear</button>
    </div>
  </header>
  <main>
    <div class="editor-container">
      <div class="editor-header">
        <span>input.ts</span>
        <span id="editor-status"></span>
      </div>
      <div id="editor"></div>
      <div class="examples-bar">
        <span style="color: #808080; font-size: 12px;">Examples:</span>
        <button class="example-btn" onclick="loadExample('generic')">Generic Names</button>
        <button class="example-btn" onclick="loadExample('errors')">Error Handling</button>
        <button class="example-btn" onclick="loadExample('security')">Security</button>
        <button class="example-btn" onclick="loadExample('quality')">Code Quality</button>
        <button class="example-btn" onclick="loadExample('full')">Full Demo</button>
      </div>
    </div>
    <div class="results-container">
      <div class="results-header">
        <span>Problems</span>
        <span id="timing"></span>
      </div>
      <div id="results" class="results-list">
        <div class="empty-state">
          <div class="icon">\u{1F50D}</div>
          <div>No problems detected</div>
        </div>
      </div>
      <div id="summary" class="summary" style="display: none;">
        <div class="summary-item">
          <div class="summary-count critical-count" id="critical-count">0</div>
          <div class="summary-label">Critical</div>
        </div>
        <div class="summary-item">
          <div class="summary-count warning-count" id="warning-count">0</div>
          <div class="summary-label">Warning</div>
        </div>
        <div class="summary-item">
          <div class="summary-count info-count" id="info-count">0</div>
          <div class="summary-label">Info</div>
        </div>
      </div>
    </div>
  </main>
  <script src="https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js"></script>
  <script>
    var editor, decorations = [], analyzeTimeout;
    var examples = EXAMPLES_PLACEHOLDER;
    
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
      editor = monaco.editor.create(document.getElementById('editor'), {
        value: '// Welcome to CodeGateway\\n// Write TypeScript/JavaScript code here\\n\\nconst data = fetchSomething();',
        language: 'typescript',
        theme: 'vs-dark',
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 }
      });
      editor.onDidChangeModelContent(function() {
        clearTimeout(analyzeTimeout);
        document.getElementById('editor-status').textContent = 'Analyzing...';
        analyzeTimeout = setTimeout(analyze, 800);
      });
      setTimeout(analyze, 500);
    });
    
    async function analyze() {
      var code = editor ? editor.getValue() : '';
      if (!code.trim()) {
        document.getElementById('results').innerHTML = '<div class="empty-state"><div class="icon">\u{1F50D}</div><div>No problems</div></div>';
        document.getElementById('summary').style.display = 'none';
        document.getElementById('editor-status').textContent = '';
        return;
      }
      try {
        var start = performance.now();
        var res = await fetch('/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code })
        });
        var data = await res.json();
        var ms = Math.round(performance.now() - start);
        document.getElementById('timing').textContent = ms + 'ms';
        document.getElementById('editor-status').textContent = data.patterns.length + ' problem(s)';
        
        if (data.patterns.length === 0) {
          document.getElementById('results').innerHTML = '<div class="empty-state"><div class="icon">\u2705</div><div>No problems!</div></div>';
          document.getElementById('summary').style.display = 'none';
          clearMarkers();
          return;
        }
        
        var html = '';
        var counts = { critical: 0, warning: 0, info: 0 };
        data.patterns.forEach(function(p) {
          counts[p.severity]++;
          html += '<div class="pattern ' + p.severity + '" onclick="goToLine(' + p.startLine + ')">';
          html += '<div class="pattern-header"><span class="pattern-type">' + p.type + '</span>';
          html += '<span class="pattern-line">Line ' + p.startLine + '</span></div>';
          html += '<div class="pattern-desc">' + escapeHtml(p.description) + '</div>';
          html += '<div class="pattern-explanation">' + escapeHtml(p.explanation) + '</div>';
          if (p.suggestion) html += '<div class="pattern-suggestion">\u27A4 ' + escapeHtml(p.suggestion) + '</div>';
          html += '</div>';
        });
        document.getElementById('results').innerHTML = html;
        document.getElementById('critical-count').textContent = counts.critical;
        document.getElementById('warning-count').textContent = counts.warning;
        document.getElementById('info-count').textContent = counts.info;
        document.getElementById('summary').style.display = 'flex';
        updateMarkers(data.patterns);
      } catch (e) {
        document.getElementById('results').innerHTML = '<div class="empty-state"><div class="icon">\u274C</div><div>Error</div></div>';
      }
    }
    
    function updateMarkers(patterns) {
      var model = editor.getModel();
      var markers = patterns.map(function(p) {
        return {
          severity: p.severity === 'critical' ? monaco.MarkerSeverity.Error : p.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
          startLineNumber: p.startLine,
          startColumn: 1,
          endLineNumber: p.endLine,
          endColumn: model.getLineMaxColumn(p.endLine),
          message: p.description,
          source: 'CodeGateway'
        };
      });
      monaco.editor.setModelMarkers(model, 'codegateway', markers);
    }
    
    function clearMarkers() {
      if (editor) monaco.editor.setModelMarkers(editor.getModel(), 'codegateway', []);
    }
    
    function goToLine(line) {
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.revealLineInCenter(line);
      editor.focus();
    }
    
    function loadExample(name) {
      if (editor && examples[name]) {
        editor.setValue(examples[name]);
      }
    }
    
    function clearEditor() {
      if (editor) {
        editor.setValue('');
        clearMarkers();
      }
    }
    
    function escapeHtml(t) {
      var d = document.createElement('div');
      d.textContent = t;
      return d.innerHTML;
    }
  </script>
</body>
</html>`;

const server = Bun.serve({
  port: Number(process.env.PORT) || 8080,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      // Inject examples as JSON
      const htmlWithExamples = html.replace(
        'EXAMPLES_PLACEHOLDER',
        JSON.stringify(examples)
      );
      return new Response(htmlWithExamples, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (req.method === "POST" && url.pathname === "/analyze") {
      try {
        const body = await req.json() as { code: string };
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
