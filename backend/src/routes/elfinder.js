/**
 * elFinder Connector for Express.js
 * ----------------------------------
 * Implements the elFinder client–server protocol over the backend/uploads/ directory.
 * See: https://github.com/Studio-42/elFinder/wiki/Client-Server-API-2.1
 *
 * Supported commands:
 *   open, tree, parents, ls, file, upload, mkdir, mkfile,
 *   rename, rm, duplicate, paste, search, info, size, get, put
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { authRequired, adminRequired } = require('../middleware/auth');

// ─── Configuration ───
const ROOT_DIR = path.join(__dirname, '..', '..', 'uploads');
const ROOT_ALIAS = '文件管理';         // Display name for root volume
const VOLUME_ID = 'l1_';              // Volume ID prefix
const URL_PREFIX = '/uploads';         // Public URL prefix

// Ensure root exists
if (!fs.existsSync(ROOT_DIR)) fs.mkdirSync(ROOT_DIR, { recursive: true });

// Multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Auth middleware
router.use(authRequired, adminRequired);

// ─── Helper functions ───

/**
 * Encode a relative path to an elFinder hash.
 * elFinder hashes are volume_id + base64(path) with '/' replaced.
 */
function pathToHash(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  const encoded = Buffer.from(normalized, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return VOLUME_ID + encoded;
}

/**
 * Decode an elFinder hash back to a relative path.
 */
function hashToPath(hash) {
  if (!hash || !hash.startsWith(VOLUME_ID)) return '';
  const encoded = hash.slice(VOLUME_ID.length)
    .replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  const pad = (4 - (encoded.length % 4)) % 4;
  const padded = encoded + '='.repeat(pad);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/**
 * Get absolute path from hash, with safety checks.
 */
function hashToAbsPath(hash) {
  const rel = hashToPath(hash);
  const abs = path.resolve(ROOT_DIR, rel);
  // Security: prevent directory traversal
  if (!abs.startsWith(ROOT_DIR)) return null;
  return abs;
}

/**
 * Get MIME type based on file extension.
 */
function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.bmp': 'image/bmp', '.ico': 'image/x-icon',
    '.pdf': 'application/pdf', '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain', '.css': 'text/css', '.html': 'text/html',
    '.js': 'application/javascript', '.json': 'application/json',
    '.xml': 'text/xml', '.csv': 'text/csv',
    '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed', '.gz': 'application/gzip',
    '.tar': 'application/x-tar',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  };
  return mimes[ext] || 'application/octet-stream';
}

/**
 * Build elFinder file/directory info object.
 */
function statToInfo(absPath, relPath) {
  try {
    const stat = fs.statSync(absPath);
    const name = path.basename(absPath);
    const isDir = stat.isDirectory();

    const info = {
      hash: pathToHash(relPath),
      name: name,
      mime: isDir ? 'directory' : getMime(absPath),
      ts: Math.floor(stat.mtimeMs / 1000),
      size: isDir ? 0 : stat.size,
      read: 1,
      write: 1,
      locked: 0,
    };

    // Parent hash
    const parentRel = path.dirname(relPath).replace(/\\/g, '/');
    if (relPath === '' || relPath === '.' || relPath === '/') {
      // Root directory
      info.volumeid = VOLUME_ID;
      info.name = ROOT_ALIAS;
      info.isroot = 1;
    } else {
      info.phash = pathToHash(parentRel === '.' ? '' : parentRel);
    }

    // Directory: check if has subdirs
    if (isDir) {
      try {
        const children = fs.readdirSync(absPath);
        info.dirs = children.some((c) => {
          try {
            return fs.statSync(path.join(absPath, c)).isDirectory();
          } catch { return false; }
        }) ? 1 : 0;
      } catch { info.dirs = 0; }
    } else {
      // File URL for access
      const urlPath = relPath.replace(/\\/g, '/');
      info.url = urlPath ? `${URL_PREFIX}/${urlPath}` : `${URL_PREFIX}/${name}`;
      // Thumbnail: use the image URL itself as thumbnail for image files
      if (info.mime && info.mime.startsWith('image/')) {
        info.tmb = info.url;
      }
    }

    return info;
  } catch (e) {
    return null;
  }
}

/**
 * List children of a directory.
 */
function listDir(absPath, relPath) {
  const items = [];
  try {
    const children = fs.readdirSync(absPath);
    for (const child of children) {
      if (child.startsWith('.')) continue; // Skip hidden files
      const childAbs = path.join(absPath, child);
      const childRel = relPath ? `${relPath}/${child}` : child;
      const info = statToInfo(childAbs, childRel);
      if (info) items.push(info);
    }
  } catch (e) {
    console.error('[elfinder] listDir error:', e.message);
  }
  return items;
}

/**
 * Recursively collect all subdirectories (for tree).
 */
function getTree(absPath, relPath, depth = 1) {
  const result = [];
  if (depth <= 0) return result;
  try {
    const children = fs.readdirSync(absPath);
    for (const child of children) {
      if (child.startsWith('.')) continue;
      const childAbs = path.join(absPath, child);
      const childRel = relPath ? `${relPath}/${child}` : child;
      try {
        if (fs.statSync(childAbs).isDirectory()) {
          const info = statToInfo(childAbs, childRel);
          if (info) {
            result.push(info);
            if (depth > 1) {
              result.push(...getTree(childAbs, childRel, depth - 1));
            }
          }
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip */ }
  return result;
}

/**
 * Generate unique filename if conflict exists.
 */
function uniqueName(dir, name) {
  let target = path.join(dir, name);
  if (!fs.existsSync(target)) return name;
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let i = 1;
  while (fs.existsSync(target)) {
    const newName = `${base}(${i})${ext}`;
    target = path.join(dir, newName);
    i++;
  }
  return path.basename(target);
}

// ─── elFinder API endpoint ───
// All requests go through GET or POST to this single endpoint

router.get('/', handleRequest);
router.post('/', upload.array('upload[]', 20), handleRequest);

async function handleRequest(req, res) {
  const params = { ...req.query, ...req.body };
  const cmd = params.cmd;

  try {
    switch (cmd) {
      case 'open':
        return cmdOpen(params, res);
      case 'tree':
        return cmdTree(params, res);
      case 'parents':
        return cmdParents(params, res);
      case 'ls':
        return cmdLs(params, res);
      case 'file':
        return cmdFile(params, res);
      case 'upload':
        return cmdUpload(params, req, res);
      case 'mkdir':
        return cmdMkdir(params, res);
      case 'mkfile':
        return cmdMkfile(params, res);
      case 'rename':
        return cmdRename(params, res);
      case 'rm':
        return cmdRm(params, res);
      case 'duplicate':
        return cmdDuplicate(params, res);
      case 'paste':
        return cmdPaste(params, res);
      case 'search':
        return cmdSearch(params, res);
      case 'info':
        return cmdInfo(params, res);
      case 'size':
        return cmdSize(params, res);
      case 'get':
        return cmdGet(params, res);
      case 'put':
        return cmdPut(params, res);
      default:
        return res.json({ error: `Unknown command: ${cmd}` });
    }
  } catch (e) {
    console.error('[elfinder] Error:', e);
    return res.json({ error: e.message || 'Server error' });
  }
}

// ─── Command Handlers ───

/** open: Open a directory and return its contents */
function cmdOpen(params, res) {
  const init = params.init === '1' || params.init === 1;
  const target = params.target || '';

  let relPath = '';
  let absPath = ROOT_DIR;

  if (target && !init) {
    relPath = hashToPath(target);
    absPath = hashToAbsPath(target);
    if (!absPath || !fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
      return res.json({ error: 'Directory not found' });
    }
  }

  const cwd = statToInfo(absPath, relPath);
  const files = listDir(absPath, relPath);

  const result = {
    cwd: cwd,
    files: [cwd, ...files],
    options: {
      path: relPath || ROOT_ALIAS,
      url: URL_PREFIX + '/',
      separator: '/',
      disabled: [],
      copyOverwrite: 1,
      uploadOverwrite: 1,
      uploadMaxSize: '50M',
      archivers: { create: [], extract: [] },
    },
  };

  if (init) {
    result.api = '2.1';
    result.uplMaxSize = '50M';
    result.uplMaxFile = 20;
    // Include tree for init
    result.files.push(...getTree(ROOT_DIR, '', 2));
    // Deduplicate by hash
    const seen = new Set();
    result.files = result.files.filter((f) => {
      if (seen.has(f.hash)) return false;
      seen.add(f.hash);
      return true;
    });
  }

  return res.json(result);
}

/** tree: Get directory tree */
function cmdTree(params, res) {
  const target = params.target || '';
  const relPath = hashToPath(target);
  const absPath = hashToAbsPath(target) || ROOT_DIR;

  if (!fs.existsSync(absPath)) {
    return res.json({ error: 'Directory not found' });
  }

  const tree = getTree(absPath, relPath, 2);
  return res.json({ tree });
}

/** parents: Get parent directories up to root */
function cmdParents(params, res) {
  const target = params.target || '';
  const relPath = hashToPath(target);
  const tree = [];

  // Walk up from target to root, collecting dirs at each level
  let current = relPath;
  while (current && current !== '.' && current !== '/') {
    const parent = path.dirname(current).replace(/\\/g, '/');
    const parentAbs = path.resolve(ROOT_DIR, parent === '.' ? '' : parent);
    const parentRel = parent === '.' ? '' : parent;
    // Add subdirs of this parent
    tree.push(...getTree(parentAbs, parentRel, 1));
    current = parent;
  }

  return res.json({ tree });
}

/** ls: List file names in directory */
function cmdLs(params, res) {
  const target = params.target || '';
  const absPath = hashToAbsPath(target) || ROOT_DIR;

  if (!fs.existsSync(absPath)) {
    return res.json({ error: 'Directory not found' });
  }

  try {
    const children = fs.readdirSync(absPath).filter((n) => !n.startsWith('.'));
    const list = {};
    for (const child of children) {
      const relPath = hashToPath(target);
      const childRel = relPath ? `${relPath}/${child}` : child;
      list[pathToHash(childRel)] = child;
    }
    return res.json({ list });
  } catch (e) {
    return res.json({ error: e.message });
  }
}

/** file: Download a file */
function cmdFile(params, res) {
  const target = params.target || '';
  const absPath = hashToAbsPath(target);

  if (!absPath || !fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
    return res.status(404).json({ error: 'File not found' });
  }

  const download = params.download === '1';
  if (download) {
    return res.download(absPath);
  }
  return res.sendFile(absPath);
}

/** upload: Upload files to target directory */
function cmdUpload(params, req, res) {
  const target = params.target || '';
  const relPath = hashToPath(target);
  const absPath = hashToAbsPath(target) || ROOT_DIR;

  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    return res.json({ error: 'Target directory not found' });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.json({ error: 'No files uploaded' });
  }

  const added = [];
  for (const file of files) {
    const safeName = uniqueName(absPath, file.originalname);
    const target = path.join(absPath, safeName);
    fs.writeFileSync(target, file.buffer);

    const childRel = relPath ? `${relPath}/${safeName}` : safeName;
    const info = statToInfo(target, childRel);
    if (info) added.push(info);
  }

  return res.json({ added });
}

/** mkdir: Create a new directory */
function cmdMkdir(params, res) {
  const target = params.target || '';
  const name = params.name || '';
  const relPath = hashToPath(target);
  const absPath = hashToAbsPath(target) || ROOT_DIR;

  if (!name) return res.json({ error: 'Name is required' });
  if (!fs.existsSync(absPath)) return res.json({ error: 'Target not found' });

  const newDir = path.join(absPath, name);
  if (fs.existsSync(newDir)) return res.json({ error: 'Directory already exists' });

  fs.mkdirSync(newDir, { recursive: true });
  const newRel = relPath ? `${relPath}/${name}` : name;
  const info = statToInfo(newDir, newRel);

  return res.json({ added: [info], hashes: { [name]: info.hash } });
}

/** mkfile: Create an empty file */
function cmdMkfile(params, res) {
  const target = params.target || '';
  const name = params.name || '';
  const relPath = hashToPath(target);
  const absPath = hashToAbsPath(target) || ROOT_DIR;

  if (!name) return res.json({ error: 'Name is required' });

  const newFile = path.join(absPath, name);
  if (fs.existsSync(newFile)) return res.json({ error: 'File already exists' });

  fs.writeFileSync(newFile, '');
  const newRel = relPath ? `${relPath}/${name}` : name;
  const info = statToInfo(newFile, newRel);

  return res.json({ added: [info] });
}

/** rename: Rename a file or directory */
function cmdRename(params, res) {
  const target = params.target || '';
  const name = params.name || '';
  const absPath = hashToAbsPath(target);

  if (!absPath || !fs.existsSync(absPath)) return res.json({ error: 'Target not found' });
  if (!name) return res.json({ error: 'Name is required' });

  const relPath = hashToPath(target);
  const parentRel = path.dirname(relPath).replace(/\\/g, '/');
  const parentAbs = path.dirname(absPath);
  const newAbs = path.join(parentAbs, name);
  const newRel = parentRel === '.' ? name : `${parentRel}/${name}`;

  // Security check
  if (!newAbs.startsWith(ROOT_DIR)) return res.json({ error: 'Invalid path' });

  fs.renameSync(absPath, newAbs);

  const removedHash = pathToHash(relPath);
  const info = statToInfo(newAbs, newRel);

  return res.json({ added: [info], removed: [removedHash] });
}

/** rm: Remove files/directories */
function cmdRm(params, res) {
  let targets = params.targets || params['targets[]'] || [];
  if (typeof targets === 'string') targets = [targets];

  const removed = [];
  for (const target of targets) {
    const absPath = hashToAbsPath(target);
    if (!absPath || !fs.existsSync(absPath)) continue;

    // Security check
    if (absPath === ROOT_DIR) continue; // Never delete root

    if (fs.statSync(absPath).isDirectory()) {
      fs.rmSync(absPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(absPath);
    }
    removed.push(target);
  }

  return res.json({ removed });
}

/** duplicate: Duplicate a file or directory */
function cmdDuplicate(params, res) {
  let targets = params.targets || params['targets[]'] || [];
  if (typeof targets === 'string') targets = [targets];

  const added = [];
  for (const target of targets) {
    const absPath = hashToAbsPath(target);
    const relPath = hashToPath(target);
    if (!absPath || !fs.existsSync(absPath)) continue;

    const dir = path.dirname(absPath);
    const ext = path.extname(absPath);
    const base = path.basename(absPath, ext);
    const newName = uniqueName(dir, `${base} copy${ext}`);
    const newAbs = path.join(dir, newName);

    if (fs.statSync(absPath).isDirectory()) {
      copyDirSync(absPath, newAbs);
    } else {
      fs.copyFileSync(absPath, newAbs);
    }

    const parentRel = path.dirname(relPath).replace(/\\/g, '/');
    const newRel = parentRel === '.' ? newName : `${parentRel}/${newName}`;
    const info = statToInfo(newAbs, newRel);
    if (info) added.push(info);
  }

  return res.json({ added });
}

/** paste: Copy or move files */
function cmdPaste(params, res) {
  const dst = params.dst || '';
  let targets = params.targets || params['targets[]'] || [];
  if (typeof targets === 'string') targets = [targets];
  const cut = params.cut === '1' || params.cut === 1;

  const dstAbs = hashToAbsPath(dst);
  const dstRel = hashToPath(dst);
  if (!dstAbs || !fs.existsSync(dstAbs) || !fs.statSync(dstAbs).isDirectory()) {
    return res.json({ error: 'Destination not found' });
  }

  const added = [];
  const removed = [];

  for (const target of targets) {
    const srcAbs = hashToAbsPath(target);
    if (!srcAbs || !fs.existsSync(srcAbs)) continue;

    const name = uniqueName(dstAbs, path.basename(srcAbs));
    const newAbs = path.join(dstAbs, name);
    const newRel = dstRel ? `${dstRel}/${name}` : name;

    if (cut) {
      fs.renameSync(srcAbs, newAbs);
      removed.push(target);
    } else {
      if (fs.statSync(srcAbs).isDirectory()) {
        copyDirSync(srcAbs, newAbs);
      } else {
        fs.copyFileSync(srcAbs, newAbs);
      }
    }

    const info = statToInfo(newAbs, newRel);
    if (info) added.push(info);
  }

  return res.json({ added, removed });
}

/** search: Search files by name */
function cmdSearch(params, res) {
  const q = (params.q || '').toLowerCase();
  const target = params.target || '';
  const relPath = hashToPath(target);
  const absPath = hashToAbsPath(target) || ROOT_DIR;

  if (!q) return res.json({ files: [] });

  const results = [];
  searchDir(absPath, relPath, q, results, 100);

  return res.json({ files: results });
}

function searchDir(absPath, relPath, query, results, limit) {
  if (results.length >= limit) return;
  try {
    const children = fs.readdirSync(absPath);
    for (const child of children) {
      if (results.length >= limit) return;
      if (child.startsWith('.')) continue;
      const childAbs = path.join(absPath, child);
      const childRel = relPath ? `${relPath}/${child}` : child;

      if (child.toLowerCase().includes(query)) {
        const info = statToInfo(childAbs, childRel);
        if (info) results.push(info);
      }

      try {
        if (fs.statSync(childAbs).isDirectory()) {
          searchDir(childAbs, childRel, query, results, limit);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

/** info: Get info for specific targets */
function cmdInfo(params, res) {
  let targets = params.targets || params['targets[]'] || [];
  if (typeof targets === 'string') targets = [targets];

  const files = [];
  for (const target of targets) {
    const absPath = hashToAbsPath(target);
    const relPath = hashToPath(target);
    if (!absPath || !fs.existsSync(absPath)) continue;
    const info = statToInfo(absPath, relPath);
    if (info) files.push(info);
  }

  return res.json({ files });
}

/** size: Get size of targets */
function cmdSize(params, res) {
  let targets = params.targets || params['targets[]'] || [];
  if (typeof targets === 'string') targets = [targets];

  let totalSize = 0;
  let fileCnt = 0;
  let dirCnt = 0;

  for (const target of targets) {
    const absPath = hashToAbsPath(target);
    if (!absPath || !fs.existsSync(absPath)) continue;
    const s = calcSize(absPath);
    totalSize += s.size;
    fileCnt += s.files;
    dirCnt += s.dirs;
  }

  return res.json({ size: totalSize, fileCnt, dirCnt });
}

function calcSize(absPath) {
  let size = 0, files = 0, dirs = 0;
  try {
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      dirs++;
      const children = fs.readdirSync(absPath);
      for (const child of children) {
        const s = calcSize(path.join(absPath, child));
        size += s.size;
        files += s.files;
        dirs += s.dirs;
      }
    } else {
      size += stat.size;
      files++;
    }
  } catch { /* skip */ }
  return { size, files, dirs };
}

/** get: Get text file content */
function cmdGet(params, res) {
  const target = params.target || '';
  const absPath = hashToAbsPath(target);

  if (!absPath || !fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
    return res.json({ error: 'File not found' });
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  return res.json({ content });
}

/** put: Save text file content */
function cmdPut(params, res) {
  const target = params.target || '';
  const content = params.content || '';
  const absPath = hashToAbsPath(target);
  const relPath = hashToPath(target);

  if (!absPath || !fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
    return res.json({ error: 'File not found' });
  }

  fs.writeFileSync(absPath, content, 'utf-8');
  const info = statToInfo(absPath, relPath);

  return res.json({ changed: [info] });
}

// ─── Utility ───

/** Recursively copy a directory */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = router;
