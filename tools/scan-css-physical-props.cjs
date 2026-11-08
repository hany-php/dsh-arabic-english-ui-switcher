const fs = require('fs');
const asar = 'C:\\Users\\hany_\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';
const s = fs.readFileSync(asar).toString('latin1');

// Find CSS-module maps: <name>_module_css_default = { "semantic": "hash", ... }
const mapRe = /([A-Za-z_$][\w$]*) = \{\s*"([^"]+)"\s*:\s*"([A-Za-z0-9_-]+)"/g;
const maps = [];
let m;
while ((m = mapRe.exec(s)) !== null) {
  const start = m.index;
  // capture the object literal
  const braceStart = s.indexOf('{', start);
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < braceStart + 20000 && i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = s.slice(braceStart, end + 1);
  const pairs = {};
  const pr = /"([^"]+)"\s*:\s*"([A-Za-z0-9_-]+)"/g;
  let p;
  while ((p = pr.exec(body)) !== null) pairs[p[1]] = p[2];
  const names = Object.keys(pairs);
  if (names.length < 4) continue;
  if (!names.some((n) => /tool|action|submit|model|footer|row|send/i.test(n))) continue;
  maps.push({ pairs });
}
console.log('MAPS', maps.length);

function rulesFor(hash) {
  const out = [];
  const needle = '.' + hash;
  let i = -1;
  while ((i = s.indexOf(needle, i + 1)) !== -1) {
    if (s[i + needle.length] !== '{' && s[i + needle.length] !== ',' && s[i + needle.length] !== ' ') continue;
    const close = s.indexOf('}', i);
    if (close === -1 || close - i > 900) continue;
    const body = s.slice(i + needle.length, close);
    if (!body.includes('{')) continue;
    out.push(body.replace(/[^\x20-\x7E]/g, ' '));
  }
  return out;
}

const interesting = [];
for (const { pairs } of maps) {
  for (const [name, hash] of Object.entries(pairs)) {
    if (!/toolbar|toolRow|actionRow|footer|submit|send|model|rowActions|headerActions/i.test(name)) continue;
    for (const body of rulesFor(hash)) {
      if (!/(margin-(left|right)\s*:\s*auto|justify-content|position\s*:\s*absolute|(^|[^-])left\s*:|(^|;)\s*right\s*:|inset)/.test(body)) continue;
      interesting.push('.' + hash + ' [' + name + '] ' + body);
    }
  }
}
console.log('RULES', interesting.length);
for (const r of [...new Set(interesting)].slice(0, 40)) console.log('-', r);
