/**
 * Tiny JSON-file "database".
 * Every collection (products, users, orders) lives in data/<name>.json.
 * Node runs our code on a single thread and we use synchronous file calls,
 * so two requests can never write the same file at the same moment.
 * Writes go to a temp file first and are then renamed, so a crash can't
 * leave a half-written (corrupt) JSON file behind.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read(name) {
  const file = filePath(name);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Could not read ${name}.json:`, err.message);
    throw new Error(`Data file ${name}.json is corrupted`);
  }
}

function write(name, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = filePath(name);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/** Next numeric id for a collection (max id + 1). */
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

module.exports = { read, write, nextId, DATA_DIR };
