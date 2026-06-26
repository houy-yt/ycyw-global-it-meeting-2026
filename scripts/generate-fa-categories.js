/**
 * Generate FA categories JSON from @fortawesome/fontawesome-free metadata.
 *
 * Reads:
 *   - metadata/categories.yml   → official FA category → icon-name mapping
 *   - metadata/icon-families.json → unicode + free styles for each icon
 *
 * Outputs:
 *   - frontend/src/data/fa-categories.json
 */

const fs = require('fs');
const path = require('path');

const META_DIR = path.resolve(
  __dirname,
  '../frontend/node_modules/@fortawesome/fontawesome-free/metadata',
);
const OUT_FILE = path.resolve(__dirname, '../frontend/src/data/fa-categories.json');

// ── Simple YAML parser for categories.yml ──
// The file has a very regular structure:
//   category_key:
//     icons:
//       - icon-name
//       ...
//     label: Category Label
function parseCategoriesYaml(text) {
  const categories = [];
  let current = null;
  const lines = text.split('\n');

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');

    // Top-level key (no leading whitespace, ends with ":")
    if (/^[a-z0-9]/.test(line) && line.endsWith(':')) {
      if (current) categories.push(current);
      current = { key: line.slice(0, -1).trim(), label: '', icons: [] };
      continue;
    }

    if (!current) continue;

    // "  label: Something"
    const labelMatch = line.match(/^\s+label:\s*(.+)/);
    if (labelMatch) {
      current.label = labelMatch[1].trim();
      continue;
    }

    // "    - icon-name" or "    - 'n'"
    const itemMatch = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/);
    if (itemMatch) {
      current.icons.push(itemMatch[1].trim());
    }
  }
  if (current) categories.push(current);
  return categories;
}

// ── Main ──
const yamlText = fs.readFileSync(path.join(META_DIR, 'categories.yml'), 'utf8');
const categories = parseCategoriesYaml(yamlText);

console.log(`Parsed ${categories.length} categories from categories.yml`);

// Load icon families to get unicode & free styles
const iconFamilies = JSON.parse(
  fs.readFileSync(path.join(META_DIR, 'icon-families.json'), 'utf8'),
);

// Build a quick lookup: iconName → { unicode, freeStyles: ['solid','regular','brands'] }
const iconMeta = {};
for (const [name, data] of Object.entries(iconFamilies)) {
  const freeStyles = [];
  if (data.familyStylesByLicense && data.familyStylesByLicense.free) {
    for (const entry of data.familyStylesByLicense.free) {
      // entry: { family: 'classic', style: 'solid' } etc.
      if (entry.style) freeStyles.push(entry.style);
    }
  }
  if (freeStyles.length > 0) {
    iconMeta[name] = {
      unicode: data.unicode || '',
      styles: freeStyles,
    };
  }
}

console.log(`Loaded ${Object.keys(iconMeta).length} free icons from icon-families.json`);

// Build output: only include icons that exist in the free set
const output = [];
let totalIconEntries = 0;

for (const cat of categories) {
  const icons = [];
  for (const iconName of cat.icons) {
    const meta = iconMeta[iconName];
    if (meta) {
      icons.push({
        name: iconName,
        unicode: meta.unicode,
        styles: meta.styles,
      });
    }
  }
  if (icons.length > 0) {
    output.push({
      key: cat.key,
      label: cat.label,
      icons,
    });
    totalIconEntries += icons.length;
  }
}

// Ensure output directory exists
const outDir = path.dirname(OUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log(
  `\nGenerated ${OUT_FILE}\n  ${output.length} categories, ${totalIconEntries} icon entries (some icons appear in multiple categories)`,
);
