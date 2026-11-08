const fs = require('fs');
const asar = 'C:\\Users\\hany_\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';
const s = fs.readFileSync(asar).toString('latin1');

/** Read a JS string literal starting at `from` (escape aware). */
function readString(from) {
  const quote = s[from];
  let i = from + 1;
  let out = '';
  while (i < s.length) {
    const ch = s[i];
    if (ch === '\\') { out += s[i + 1] ?? ''; i += 2; continue; }
    if (ch === quote) return { text: out, start: from, end: i };
    out += ch;
    i += 1;
  }
  return null;
}

/** CSS string blocks in the archive. */
function allCssBlocks() {
  const out = [];
  const re = /const\s+css(?:\$\d+)?\s*=\s*"/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const q = s.indexOf('"', m.index);
    if (q === -1) continue;
    const st = readString(q);
    if (!st) continue;
    if (!st.text.includes('{')) continue;
    out.push(st.text);
    re.lastIndex = st.end;
  }
  return out;
}

const blocks = allCssBlocks();
console.log('CSS BLOCKS', blocks.length);
const target = blocks.find((b) => b.includes('.GRgSLq_row'));
if (!target) { console.log('!! GRgSLq block not found'); process.exit(0); }
console.log('BLOCK LEN', target.length);

const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
let r;
console.log('\n=== ALL GRgSLq RULES ===');
while ((r = ruleRe.exec(target)) !== null) {
  const sel = r[1].trim();
  if (!sel.includes('GRgSLq_')) continue;
  console.log(sel.replace(/[^\x20-\x7E]/g, ' '), '{', r[2].replace(/[^\x20-\x7E]/g, ' '), '}');
}

// semantic name map for the module that owns GRgSLq
const idx = s.indexOf('"GRgSLq_row"');
if (idx !== -1) {
  const back = s.lastIndexOf('{', idx);
  const close = s.indexOf('}', idx);
  console.log('\n=== SEMANTIC MAP ===');
  console.log(s.slice(back, close + 1).replace(/[^\x20-\x7E]/g, ' ').slice(0, 1200));
}
