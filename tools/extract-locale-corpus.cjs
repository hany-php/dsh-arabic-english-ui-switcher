const fs = require('fs');
const asar = 'C:\\Users\\hany_\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';
const s = fs.readFileSync(asar).toString('latin1');

const seeds = [
  'Choose the default permission mode for new sessions', 'Only affects conversation content',
  'When to Collapse Work Details', 'Show coding view', 'Open configuration file',
  'Built-in plugins', 'Agent presets', 'Edit shortcuts', 'View and edit available shortcuts and input actions',
  'About plugins', 'Install a third-party plugin', 'Installed plugins', 'Experimental plugins',
  'No plugins are installed yet', 'Add plugin', 'Restart DSH to apply the change',
  'New Session', 'New session', 'Create a new session', 'Search sessions', 'Archive session',
  'Rename workspace', 'Delete workspace', 'Pin session', 'Unpin session',
  'Analyzing the request', 'Reading files', 'Running commands', 'Calling tools',
  'Waiting for your action', 'Coordinating subagents', 'View full image', 'Image preview',
  'Sign in to DeepSeek', 'Sign out', 'API key', 'Base URL', 'Default model',
  'Write a message', 'Send message', 'Stop generating', 'Plan mode', 'Permission mode',
  'Attach files', 'Upload file', 'Download', 'Open in app', 'Copy message', 'Edit message',
  'Reasoning', 'Thinking', 'Completed', 'Failed', 'Retry', 'Refresh', 'Dismiss',
  'Open settings', 'Configure plugins', 'Show more', 'Show less', 'Expand all', 'Collapse all',
  'Change directory', 'Working directory', 'Select workspace', 'No workspace',
  'Trajectory', 'Context window', 'Token usage', 'Cost', 'Balance',
  'Keyboard shortcuts', 'Font size', 'Code font size', 'Terminal font size',
  'Text font', 'Code font', 'Terminal font', 'Appearance', 'Light', 'Dark', 'System',
];

function objAt(startIdx) {
  let depth = 0;
  for (let i = startIdx; i < startIdx + 60000 && i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return { text: s.slice(startIdx, i + 1), end: i }; }
  }
  return null;
}
function clean(str) { return str.replace(/[^\x20-\x7E\n\t]/g, ' '); }
function parseDict(text) {
  const out = {};
  const re = /["']([^"'\n]{1,120})["']\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) out[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  return out;
}
function looksLikeDict(d) {
  const entries = Object.entries(d);
  if (entries.length < 4) return false;
  const keysOk = entries.filter(([k]) => /^[a-zA-Z][\w.$-]*$/.test(k)).length / entries.length;
  const valsOk = entries.filter(([, v]) => v.length >= 1 && v.length <= 300).length / entries.length;
  return keysOk > 0.8 && valsOk > 0.9;
}

const dicts = new Map(); // abs -> {dict}
for (const seed of seeds) {
  let idx = -1;
  while ((idx = s.indexOf(seed, idx + 1)) !== -1) {
    const from = Math.max(0, idx - 8000);
    const back = s.slice(from, idx);
    const eq = back.lastIndexOf('= {');
    if (eq === -1) continue;
    const start = from + eq + 2;
    const o = objAt(start);
    if (!o) continue;
    if (dicts.has(start)) break;
    const d = parseDict(o.text);
    if (!looksLikeDict(d)) continue;
    dicts.set(start, d);
  }
}

// merge: english text -> arabic (empty) with key examples
const byText = new Map();
for (const d of dicts.values()) {
  for (const [k, v] of Object.entries(d)) {
    const t = v.trim();
    if (!t) continue;
    if (!/[A-Za-z]/.test(t)) continue;
    if (!byText.has(t)) byText.set(t, { keys: new Set(), dicts: 0 });
    byText.get(t).keys.add(k);
  }
}
const strings = [...byText.keys()].filter((t) => /[A-Za-z]/.test(t)).sort();
console.log('DICTS', dicts.size, 'UNIQUE_EN_STRINGS', strings.length);
fs.writeFileSync('harvested-en.json', JSON.stringify(strings, null, 1));
console.log('saved harvested-en.json');
