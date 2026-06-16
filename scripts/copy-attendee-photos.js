const fs = require('fs');
const path = require('path');

const src = 'D:\\YCYW Other Work\\2026 Global IT Meeting\\参会人员照片';
const dst = path.resolve(__dirname, '..', 'frontend', 'public', 'attendees');

fs.mkdirSync(dst, { recursive: true });

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

const files = walk(src);
let count = 0;
for (const f of files) {
  const name = path.basename(f);
  fs.copyFileSync(f, path.join(dst, name));
  count++;
  console.log('copied:', name);
}
console.log(`Done. ${count} files copied to ${dst}`);
