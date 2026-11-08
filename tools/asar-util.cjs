#!/usr/bin/env node
/**
 * Minimal read-only asar inspector.
 *
 * Native tools (grep/glob/Get-ChildItem) cannot see inside an asar archive, and
 * the shipped client bundles we need to inspect live there. This script parses
 * the asar header directly (8-byte pickle + JSON header) so we can list files
 * and extract one file without loading the 300 MB archive into a single string.
 *
 * Usage:
 *   node tools/asar-util.cjs list  [substring-filter]
 *   node tools/asar-util.cjs read  <archive-relative-path> [out-file]
 *   node tools/asar-util.cjs grep  <archive-relative-dir> <literal-substring>
 *
 * Set DSH_ASAR to override the default archive path.
 */
const fs = require('fs');
const path = require('path');

const ASAR =
  process.env.DSH_ASAR ||
  'C:\\Users\\hany_\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';

/**
 * Asar layout: [u32 pickleSize][u32 headerPickleSize][u32 jsonLength][json][data].
 * The JSON header starts at byte 16 and the file-data area at 16 + jsonLength.
 */
function readHeader(fd) {
  const first = Buffer.alloc(16);
  fs.readSync(fd, first, 0, 16, 0);
  const jsonLength = first.readUInt32LE(12);
  const header = Buffer.alloc(jsonLength);
  fs.readSync(fd, header, 0, jsonLength, 16);
  return { dataStart: 16 + jsonLength, json: JSON.parse(header.toString('utf8')) };
}

/** Flatten the asar tree into [{path, size, offset?}] (offset = file data position). */
function listFiles(root) {
  const out = [];
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const p = prefix ? `${prefix}/${name}` : name;
      if (entry.files) walk(entry, p);
      else if (entry.link) out.push({ path: p, link: entry.link });
      else out.push({ path: p, size: entry.size || 0, offset: entry.offset != null ? Number(entry.offset) : undefined, unpacked: !!entry.unpacked });
    }
  };
  walk(root, '');
  return out;
}

function fileData(fd, json, relPath) {
  const node = relPath.split('/').filter(Boolean).reduce((n, part) => {
    if (!n || !n.files) return null;
    return n.files[part];
  }, json);
  if (!node) throw new Error(`not found in archive: ${relPath}`);
  if (node.link) throw new Error(`symlink entry, follow manually: ${node.link}`);
  if (node.files) throw new Error(`directory, not a file: ${relPath}`);
  if (node.unpacked) {
    const unpacked = ASAR + '.unpacked/' + relPath.split('/').join(path.sep);
    return fs.readFileSync(unpacked);
  }
  const buf = Buffer.alloc(node.size);
  const { dataStart } = readHeader(fd);
  fs.readSync(fd, buf, 0, node.size, dataStart + Number(node.offset));
  return buf;
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const fd = fs.openSync(ASAR, 'r');
  const { json } = readHeader(fd);
  if (cmd === 'list') {
    const filter = args[0];
    const files = listFiles(json).filter((f) => !filter || f.path.includes(filter));
    for (const f of files) console.log(`${String(f.size ?? '-').padStart(10)}  ${f.path}${f.unpacked ? '  (unpacked)' : ''}`);
    console.error(`# ${files.length} file(s)`);
  } else if (cmd === 'read') {
    const rel = args[0];
    const out = args[1];
    const buf = fileData(fd, json, rel);
    if (out) fs.writeFileSync(out, buf);
    else process.stdout.write(buf);
  } else if (cmd === 'grep') {
    const dir = args[0];
    const needle = args[1];
    if (!dir || !needle) throw new Error('usage: grep <dir> <literal>');
    const files = listFiles(json).filter((f) => f.path.startsWith(dir) && !f.unpacked);
    let hits = 0;
    for (const f of files) {
      let buf;
      try {
        buf = fileData(fd, json, f.path);
      } catch {
        continue;
      }
      const text = buf.toString('utf8');
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (line.includes(needle)) {
          hits += 1;
          const at = line.indexOf(needle);
          console.log(`${f.path}:${i + 1}: ${line.slice(Math.max(0, at - 160), at + 240)}`);
        }
      });
    }
    console.error(`# ${hits} hit(s) in ${files.length} file(s)`);
  } else {
    console.error('usage: node tools/asar-util.cjs list|read|grep ...');
    process.exit(2);
  }
}

if (require.main === module) main();
module.exports = { ASAR, listFiles, fileData, readHeader };
