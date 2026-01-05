# Troubleshooting Guide

Common issues and solutions for CodeGateway.

## Installation Issues

### Extension Won't Install

**Symptom:** VS Code shows error when installing extension.

**Solutions:**

1. **Check VS Code version:**
   ```
   Required: VS Code 1.85.0+
   Check: Help → About
   ```

2. **Try manual installation:**
   - Download `.vsix` from GitHub releases
   - Run: `code --install-extension codegateway-1.0.0.vsix`

3. **Clear extension cache:**
   ```bash
   # Close VS Code first
   rm -rf ~/.vscode/extensions/codegateway.*
   ```

### CLI Won't Install

**Symptom:** `npm install -g @codegateway/cli` fails.

**Solutions:**

1. **Use sudo (Linux/Mac):**
   ```bash
   sudo npm install -g @codegateway/cli
   ```

2. **Fix npm permissions:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Use npx instead:**
   ```bash
   npx @codegateway/cli analyze .
   ```

---

## Extension Not Working

### No Patterns Detected

**Symptom:** Extension loads but nothing is underlined.

**Solutions:**

1. **Check file type:**
   - Supported: `.ts`, `.tsx`, `.js`, `.jsx`
   - Check status bar for language mode

2. **Check severity filter:**
   ```json
   {
     "codegateway.minSeverity": "info"  // Show all
   }
   ```

3. **Check enabled patterns:**
   ```json
   {
     "codegateway.enabledPatterns": [
       // Make sure patterns are listed
     ]
   }
   ```

4. **Check excluded paths:**
   ```json
   {
     "codegateway.excludePaths": [
       // Make sure your file isn't excluded
     ]
   }
   ```

5. **Reload window:**
   - `Ctrl+Shift+P` → `Developer: Reload Window`

### Extension Not Activating

**Symptom:** CodeGateway commands not available.

**Solutions:**

1. **Check activation:**
   - Open a `.ts` or `.js` file
   - Extension activates on these file types

2. **Check Output panel:**
   - View → Output
   - Select "CodeGateway" from dropdown
   - Look for error messages

3. **Check extension is enabled:**
   - Extensions panel → Search "CodeGateway"
   - Ensure it says "Enabled"

### Decorations Not Showing

**Symptom:** Problems panel shows issues but no underlines.

**Solutions:**

1. **Enable inline hints:**
   ```json
   {
     "codegateway.showInlineHints": true
   }
   ```

2. **Check editor decorations:**
   ```json
   {
     "editor.renderValidationDecorations": "on"
   }
   ```

---

## Performance Issues

### Slow Analysis

**Symptom:** Analysis takes several seconds or freezes editor.

**Solutions:**

1. **Increase debounce:**
   ```json
   {
     "codegateway.debounceMs": 1000
   }
   ```

2. **Exclude large directories:**
   ```json
   {
     "codegateway.excludePaths": [
       "**/node_modules/**",
       "**/dist/**",
       "**/build/**",
       "**/*.min.js",
       "**/vendor/**"
     ]
   }
   ```

3. **Disable analyze on open:**
   ```json
   {
     "codegateway.analyzeOnOpen": false
   }
   ```

4. **Check file size:**
   - Very large files (10k+ lines) may be slow
   - Consider splitting large files

### High CPU Usage

**Symptom:** VS Code using excessive CPU.

**Solutions:**

1. **Check for analysis loops:**
   - Disable `analyzeOnSave` temporarily
   - See if CPU drops

2. **Increase debounce significantly:**
   ```json
   {
     "codegateway.debounceMs": 2000
   }
   ```

3. **Disable for current workspace:**
   - Extensions → CodeGateway → Disable (Workspace)

---

## Git Hook Issues

### Hook Not Running

**Symptom:** Commits go through without analysis.

**Solutions:**

1. **Check hook exists:**
   ```bash
   ls -la .git/hooks/pre-commit
   ```

2. **Check hook is executable:**
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

3. **Check hook content:**
   ```bash
   cat .git/hooks/pre-commit
   # Should contain "CodeGateway hook"
   ```

4. **Test hook manually:**
   ```bash
   .git/hooks/pre-commit
   ```

### Hook Blocks Everything

**Symptom:** Can't commit anything.

**Solutions:**

1. **Bypass for one commit:**
   ```bash
   git commit --no-verify -m "message"
   ```

2. **Check blocking settings:**
   ```json
   {
     "codegateway.blockOnCritical": false,
     "codegateway.blockOnWarning": false
   }
   ```
   Then reinstall hook.

3. **Remove hook:**
   ```bash
   rm .git/hooks/pre-commit
   ```

### "CLI not found" in Hook

**Symptom:** Hook fails with "codegateway: command not found".

**Solutions:**

1. **Install CLI globally:**
   ```bash
   npm install -g @codegateway/cli
   ```

2. **Check PATH in hook:**
   The hook tries `codegateway`, `bunx`, then `npx`.

3. **Edit hook to use npx:**
   ```bash
   # In .git/hooks/pre-commit
   CODEGATEWAY="npx @codegateway/cli"
   ```

---

## False Positives

### Pattern Incorrectly Detected

**Symptom:** CodeGateway flags valid code.

**Solutions:**

1. **Disable specific pattern:**
   ```json
   {
     "codegateway.enabledPatterns": [
       // Remove the problematic pattern
     ]
   }
   ```

2. **Exclude specific file:**
   ```json
   {
     "codegateway.excludePaths": [
       "**/path/to/file.ts"
     ]
   }
   ```

3. **Report false positive:**
   - [Open an issue](https://github.com/codegateway/codegateway/issues)
   - Include code sample and why it's a false positive

### Too Many Warnings

**Symptom:** Overwhelmed by pattern count.

**Solutions:**

1. **Increase severity threshold:**
   ```json
   {
     "codegateway.minSeverity": "warning"
   }
   ```

2. **Focus on critical only:**
   ```json
   {
     "codegateway.minSeverity": "critical"
   }
   ```

3. **Disable noisy patterns:**
   Common candidates: `magic_number`, `todo_without_context`

---

## Checkpoint Issues

### Checkpoint Not Opening

**Symptom:** Command runs but panel doesn't appear.

**Solutions:**

1. **Check for patterns:**
   - Checkpoint only opens if patterns are detected
   - Try on a file with known issues

2. **Check VS Code panels:**
   - The panel may have opened in a different column
   - Look for "CodeGateway Checkpoint" tab

### Can't Proceed from Checkpoint

**Symptom:** Proceed button disabled.

**Solutions:**

1. **Acknowledge critical patterns:**
   - All critical patterns must be checked
   - Look for unchecked items with red badges

2. **Wait for analysis:**
   - Button may be disabled while analysis runs
   - Wait a moment and try again

---

## Getting Help

### Debug Information

Collect this info when reporting issues:

```bash
# VS Code version
code --version

# Extension version
# Extensions panel → CodeGateway → Details

# Node version
node --version

# Operating system
uname -a  # Linux/Mac
winver    # Windows
```

### Logs

1. **VS Code Output:**
   - View → Output
   - Select "CodeGateway"
   - Copy relevant logs

2. **Developer Console:**
   - Help → Toggle Developer Tools
   - Console tab
   - Filter by "codegateway"

### Report an Issue

[Open an issue on GitHub](https://github.com/codegateway/codegateway/issues/new) with:

- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Debug information (above)
- Code sample (if relevant)

### Community

- [GitHub Discussions](https://github.com/codegateway/codegateway/discussions)
- [Discord Server](https://discord.gg/codegateway)
