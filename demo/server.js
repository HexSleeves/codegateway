const http = require('http');
const path = require('path');
const fs = require('fs');

const { Analyzer } = require('../packages/core/dist/index.js');

const analyzer = new Analyzer();

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGateway Demo</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
      min-height: 100vh;
    }
    h1 {
      color: #569cd6;
      margin: 0 0 20px 0;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr; }
    }
    .panel {
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      overflow: hidden;
    }
    .panel-header {
      background: #2d2d2d;
      padding: 12px 16px;
      font-weight: 600;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    textarea {
      width: 100%;
      height: 400px;
      border: none;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      padding: 16px;
      resize: vertical;
      outline: none;
    }
    button {
      background: #0e639c;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #1177bb;
    }
    .results {
      padding: 16px;
      max-height: 500px;
      overflow-y: auto;
    }
    .pattern {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      border-left: 3px solid;
    }
    .pattern.critical {
      background: rgba(244, 67, 54, 0.1);
      border-color: #f44336;
    }
    .pattern.warning {
      background: rgba(255, 152, 0, 0.1);
      border-color: #ff9800;
    }
    .pattern.info {
      background: rgba(33, 150, 243, 0.1);
      border-color: #2196f3;
    }
    .pattern-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .pattern-type {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255,255,255,0.1);
    }
    .pattern-line {
      font-size: 12px;
      color: #808080;
    }
    .pattern-desc {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .pattern-explanation {
      font-size: 13px;
      color: #a0a0a0;
    }
    .pattern-suggestion {
      margin-top: 8px;
      font-size: 12px;
      color: #4ec9b0;
    }
    .summary {
      padding: 16px;
      border-top: 1px solid #3c3c3c;
      display: flex;
      gap: 16px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-count {
      font-size: 24px;
      font-weight: bold;
    }
    .summary-label {
      font-size: 12px;
      color: #808080;
    }
    .critical-count { color: #f44336; }
    .warning-count { color: #ff9800; }
    .info-count { color: #2196f3; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #808080;
    }
    .empty-state .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .loading {
      text-align: center;
      padding: 40px;
    }
    .examples {
      margin-top: 20px;
    }
    .example-btn {
      background: #3c3c3c;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    .example-btn:hover {
      background: #4c4c4c;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 CodeGateway Demo</h1>
    <p style="color: #808080; margin-bottom: 20px;">AI Code Review Trust Layer - Detect patterns in your TypeScript/JavaScript code</p>

    <div class="main">
      <div class="panel">
        <div class="panel-header">
          <span>Code Input</span>
          <button onclick="analyze()">▶ Analyze</button>
        </div>
        <textarea id="code" placeholder="Paste your TypeScript or JavaScript code here..."></textarea>
        <div class="examples">
          <button class="example-btn" onclick="loadExample('generic')">🌟 Generic Names</button>
          <button class="example-btn" onclick="loadExample('errors')">⚠️ Error Handling</button>
          <button class="example-btn" onclick="loadExample('security')">🔐 Security</button>
          <button class="example-btn" onclick="loadExample('quality')">📊 Code Quality</button>
          <button class="example-btn" onclick="loadExample('full')">📝 Full Demo</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span>Analysis Results</span>
          <span id="timing"></span>
        </div>
        <div id="results" class="results">
          <div class="empty-state">
            <div class="icon">🔍</div>
            <div>Paste code and click Analyze</div>
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
    </div>
  </div>

  <script>
    const examples = {
      generic: \`// Generic variable names that don't describe their purpose
const data = fetchUsers();
const result = processData(data);
const temp = result.value;
const item = items[0];\`,

      errors: \`// Poor error handling patterns
async function fetchData() {
  try {
    await riskyOperation();
  } catch (e) {
    // Empty catch - errors silently swallowed!
  }
}

async function anotherExample() {
  try {
    await api.call();
  } catch (error) {
    console.log('Something went wrong'); // Error not used!
  }
}

// Missing error boundary
async function noErrorHandling() {
  const response = await fetch('/api');
  return response.json();
}\`,

      security: \`// Security vulnerabilities
const API_KEY = 'sk_live_12345abcdef';

function getUserByName(name) {
  const query = \\\`SELECT * FROM users WHERE name = '\${name}'\\\`;
  return executeQuery(query);
}

function dangerous(userInput) {
  return eval(userInput);
}\`,

      quality: \`// Code quality issues
function calculateTimeout() {
  return 86400 * 7 + 3600; // Magic numbers
}

// TODO: fix this
// FIXME: broken

function notYetImplemented() {
  throw new Error('not implemented');
}

function complexLogic(a, b, c, d) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          for (let i = 0; i < 10; i++) {
            if (i % 2) { return a && b || c; }
          }
        }
      }
    }
  }
  return null;
}\`,

      full: \`// Full demo with multiple pattern types
const data = fetchUsers();
const API_KEY = 'sk_live_secret123';

async function processUserData() {
  try {
    const result = await fetch('/api');
    const temp = await result.json();
    return temp;
  } catch (e) {
  }
}

function getUserByName(name) {
  return executeQuery(\\\`SELECT * FROM users WHERE name = '\${name}'\\\`);
}

// TODO: fix
function calculate() {
  return 86400 * 7;
}

function notDone() {
  throw new Error('not implemented');
}\`
    };

    function loadExample(name) {
      document.getElementById('code').value = examples[name];
      analyze();
    }

    async function analyze() {
      const code = document.getElementById('code').value;
      const resultsDiv = document.getElementById('results');
      const summaryDiv = document.getElementById('summary');
      const timingSpan = document.getElementById('timing');

      if (!code.trim()) {
        resultsDiv.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><div>Paste code and click Analyze</div></div>';
        summaryDiv.style.display = 'none';
        return;
      }

      resultsDiv.innerHTML = '<div class="loading">🔄 Analyzing...</div>';

      try {
        const start = performance.now();
        const response = await fetch('/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await response.json();
        const duration = Math.round(performance.now() - start);

        timingSpan.textContent = duration + 'ms';

        if (data.patterns.length === 0) {
          resultsDiv.innerHTML = '<div class="empty-state"><div class="icon">✅</div><div>No patterns detected!</div><div style="font-size: 14px; margin-top: 8px;">Your code looks good.</div></div>';
          summaryDiv.style.display = 'none';
          return;
        }

        let html = '';
        const counts = { critical: 0, warning: 0, info: 0 };

        for (const p of data.patterns) {
          counts[p.severity]++;
          html += \`
            <div class="pattern \${p.severity}">
              <div class="pattern-header">
                <span class="pattern-type">\${p.type}</span>
                <span class="pattern-line">Line \${p.startLine}</span>
              </div>
              <div class="pattern-desc">\${escapeHtml(p.description)}</div>
              <div class="pattern-explanation">\${escapeHtml(p.explanation)}</div>
              \${p.suggestion ? \`<div class="pattern-suggestion">➤ \${escapeHtml(p.suggestion)}</div>\` : ''}
            </div>
          \`;
        }

        resultsDiv.innerHTML = html;
        document.getElementById('critical-count').textContent = counts.critical;
        document.getElementById('warning-count').textContent = counts.warning;
        document.getElementById('info-count').textContent = counts.info;
        summaryDiv.style.display = 'flex';

      } catch (err) {
        resultsDiv.innerHTML = '<div class="empty-state"><div class="icon">❌</div><div>Analysis failed</div><div>' + escapeHtml(err.message) + '</div></div>';
        summaryDiv.style.display = 'none';
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Analyze on Ctrl+Enter
    document.getElementById('code').addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        analyze();
      }
    });
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && req.url === '/analyze') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { code } = JSON.parse(body);
        const result = await analyzer.analyzeFile(code, 'input.ts', { minSeverity: 'info' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`CodeGateway Demo running at http://localhost:${PORT}`);
});
