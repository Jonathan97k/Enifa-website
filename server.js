/**
 * Uniform Solution — Local Admin Portal + Website Server
 * -------------------------------------------------------
 * - Public website:  http://localhost:3000/
 * - Admin portal:    http://localhost:3000/admin
 * - Data file:       data/products.json   (single source of truth)
 * - Images:          public/images/
 *
 * The website and admin share the exact same schema, so categories and
 * products stay in perfect sync.
 */

const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const { exec } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR   = __dirname;
const DATA_DIR   = path.join(ROOT_DIR, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'products.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// ---------- Ensure folders/files exist ----------
for (const dir of [DATA_DIR, PUBLIC_DIR, IMAGES_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        settings: { businessName: '', whatsappNumber: '', phones: [], location: '', hours: '' },
        categories: [],
        products: []
    }, null, 2));
}

// ---------- Middleware ----------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use('/data', express.static(DATA_DIR));
app.use('/images', express.static(IMAGES_DIR));

// ---------- Multer ----------
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
    filename: (_req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
        const base = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40) || 'image';
        const unique = Date.now() + '-' + crypto.randomBytes(3).toString('hex');
        cb(null, `${base}-${unique}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\//.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image uploads are allowed'));
    }
});

// ---------- Data helpers ----------
function readData() {
    try {
        const raw  = fs.readFileSync(DATA_FILE, 'utf8');
        const json = JSON.parse(raw);
        json.settings   = json.settings   || {};
        json.categories = Array.isArray(json.categories) ? json.categories : [];
        json.products   = Array.isArray(json.products)   ? json.products   : [];
        return json;
    } catch (err) {
        console.error('Failed to read products.json:', err);
        return { settings: {}, categories: [], products: [] };
    }
}
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function newId(prefix = 'i') {
    return prefix + '-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex');
}
function slugify(s) {
    return String(s || '').toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
        || ('item-' + Date.now().toString(36));
}
function ensureUniqueId(id, list) {
    let base = id || newId();
    let candidate = base;
    let n = 2;
    while (list.some(x => x.id === candidate)) {
        candidate = `${base}-${n++}`;
    }
    return candidate;
}
function parseJsonField(v, fallback) {
    if (v == null || v === '') return fallback;
    if (Array.isArray(v) || typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return fallback; }
}
// Collect all image paths currently in use
function allUsedImages(data) {
    const set = new Set();
    for (const c of data.categories) (c.images || []).forEach(p => set.add(p));
    for (const p of data.products)   (p.images || []).forEach(x => set.add(x));
    return set;
}
// Delete image files that are no longer referenced anywhere
function cleanupOrphanImages(oldImages, data) {
    const used = allUsedImages(data);
    for (const img of (oldImages || [])) {
        if (img && img.startsWith('/images/') && !used.has(img)) {
            const file = path.join(IMAGES_DIR, path.basename(img));
            fs.promises.unlink(file).catch(() => {});
        }
    }
}

// ---------- API: data ----------
app.get('/api/data', (_req, res) => res.json(readData()));

// ---------- API: settings ----------
app.get('/api/settings', (_req, res) => res.json(readData().settings));
app.put('/api/settings', (req, res) => {
    const data = readData();
    const body = req.body || {};
    data.settings = {
        businessName:   String(body.businessName   ?? data.settings.businessName   ?? '').trim(),
        tagline:        String(body.tagline        ?? data.settings.tagline        ?? '').trim(),
        whatsappNumber: String(body.whatsappNumber ?? data.settings.whatsappNumber ?? '').replace(/[^0-9]/g, ''),
        phones:         Array.isArray(body.phones) ? body.phones.map(String) : (data.settings.phones || []),
        email:          String(body.email          ?? data.settings.email          ?? '').trim(),
        location:       String(body.location       ?? data.settings.location       ?? '').trim(),
        hours:          String(body.hours          ?? data.settings.hours          ?? '').trim(),
        heroHeadline:   String(body.heroHeadline   ?? data.settings.heroHeadline   ?? '').trim(),
        heroSubheadline:String(body.heroSubheadline?? data.settings.heroSubheadline?? '').trim(),
        aboutText:      String(body.aboutText      ?? data.settings.aboutText      ?? '').trim()
    };
    writeData(data);
    res.json(data.settings);
});

// ---------- API: categories ----------
app.get('/api/categories', (_req, res) => res.json(readData().categories));

app.post('/api/categories', upload.array('images', 10), (req, res) => {
    const body = req.body || {};
    if (!body.title) return res.status(400).json({ error: 'Title is required' });
    const data = readData();
    const newImgs = (req.files || []).map(f => '/images/' + f.filename);
    const keepImgs = parseJsonField(body.existingImages, []);

    const cat = {
        id:          ensureUniqueId(slugify(body.id || body.title), data.categories),
        title:       String(body.title).trim(),
        icon:        String(body.icon || '🛍️').trim(),
        description: String(body.description || '').trim(),
        images:      [...keepImgs, ...newImgs]
    };
    data.categories.push(cat);
    writeData(data);
    res.status(201).json(cat);
});

app.put('/api/categories/:id', upload.array('images', 10), (req, res) => {
    const data = readData();
    const idx  = data.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Category not found' });

    const body = req.body || {};
    const current = data.categories[idx];
    const oldImages = current.images || [];
    const keepImgs = parseJsonField(body.existingImages, oldImages);
    const newImgs  = (req.files || []).map(f => 'images/' + f.filename);

    const updated = {
        ...current,
        title:       body.title       != null ? String(body.title).trim()       : current.title,
        icon:        body.icon        != null ? String(body.icon).trim()        : current.icon,
        description: body.description != null ? String(body.description).trim() : current.description,
        images:      [...keepImgs, ...newImgs]
    };
    data.categories[idx] = updated;
    writeData(data);
    cleanupOrphanImages(oldImages, data);
    res.json(updated);
});

app.delete('/api/categories/:id', (req, res) => {
    const data = readData();
    const idx  = data.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Category not found' });

    // Move products from deleted category to "uncategorized" (null)
    data.products.forEach(p => { if (p.categoryId === req.params.id) p.categoryId = null; });

    const [removed] = data.categories.splice(idx, 1);
    writeData(data);
    cleanupOrphanImages(removed.images || [], data);
    res.json({ ok: true, removed });
});

// ---------- API: products ----------
app.get('/api/products', (req, res) => {
    let list = readData().products;
    if (req.query.categoryId) list = list.filter(p => p.categoryId === req.query.categoryId);
    res.json(list);
});

app.post('/api/products', upload.array('images', 10), (req, res) => {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'Product name is required' });
    const data = readData();

    const newImgs  = (req.files || []).map(f => 'images/' + f.filename);
    const keepImgs = parseJsonField(body.existingImages, []);
    const categoryId = body.categoryId || null;
    if (categoryId && !data.categories.some(c => c.id === categoryId)) {
        return res.status(400).json({ error: 'Unknown category' });
    }

    const product = {
        id:          ensureUniqueId(slugify('p-' + (body.name || '')), data.products),
        name:        String(body.name).trim(),
        categoryId:  categoryId,
        description: String(body.description || '').trim(),
        price:       String(body.price || '').trim(),
        images:      [...keepImgs, ...newImgs],
        createdAt:   new Date().toISOString()
    };
    data.products.unshift(product);
    writeData(data);
    res.status(201).json(product);
});

app.put('/api/products/:id', upload.array('images', 10), (req, res) => {
    const data = readData();
    const idx  = data.products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    const body = req.body || {};
    const current = data.products[idx];
    const oldImages = current.images || [];
    const newImgs  = (req.files || []).map(f => 'images/' + f.filename);
    const keepImgs = parseJsonField(body.existingImages, oldImages);
    const categoryId = body.categoryId !== undefined ? (body.categoryId || null) : current.categoryId;
    if (categoryId && !data.categories.some(c => c.id === categoryId)) {
        return res.status(400).json({ error: 'Unknown category' });
    }

    const updated = {
        ...current,
        name:        body.name        != null ? String(body.name).trim()        : current.name,
        categoryId:  categoryId,
        description: body.description != null ? String(body.description).trim() : current.description,
        price:       body.price       != null ? String(body.price).trim()       : current.price,
        images:      [...keepImgs, ...newImgs]
    };
    data.products[idx] = updated;
    writeData(data);
    cleanupOrphanImages(oldImages, data);
    res.json(updated);
});

app.delete('/api/products/:id', (req, res) => {
    const data = readData();
    const idx  = data.products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    const [removed] = data.products.splice(idx, 1);
    writeData(data);
    cleanupOrphanImages(removed.images || [], data);
    res.json({ ok: true, removed });
});

// ---------- API: git ----------
// Detect actual git repo root (may be parent of my-project)
function findGitRoot() {
    try {
        const out = require('child_process')
            .execSync('git rev-parse --show-toplevel', { cwd: ROOT_DIR })
            .toString().trim();
        return out || ROOT_DIR;
    } catch { return ROOT_DIR; }
}

function copyDirSync(src, dst) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDirSync(s, d);
        else fs.copyFileSync(s, d);
    }
}

function run(cmd, cwd) {
    return new Promise((resolve) => {
        exec(cmd, { cwd, timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            resolve({
                ok: !err,
                code: err ? err.code : 0,
                stdout: (stdout || '').trim(),
                stderr: (stderr || '').trim(),
                error: err ? err.message : null
            });
        });
    });
}

app.get('/api/git/status', async (_req, res) => {
    const gitRoot = findGitRoot();
    const r = await run('git status --short --branch', gitRoot);
    res.json({ ok: r.ok, output: (r.stdout || r.stderr || '(clean)') + `\n\nRepo: ${gitRoot}` });
});

app.post('/api/git/push', async (req, res) => {
    const msg = (req.body && req.body.message ? String(req.body.message) : 'content update')
        .replace(/"/g, '\\"');
    const gitRoot = findGitRoot();
    const log = [];
    const step = (label) => log.push(`\n━━━ ${label} ━━━`);
    const info = (line) => log.push(line);

    try {
        step('Step 1/6: Sync public files → repo root');

        // Only sync if git root is different from server dir (i.e., parent repo setup)
        if (path.resolve(gitRoot) !== path.resolve(ROOT_DIR)) {
            const syncFiles = ['index.html', 'app.js'];
            for (const f of syncFiles) {
                const src = path.join(PUBLIC_DIR, f);
                const dst = path.join(gitRoot, f);
                if (fs.existsSync(src)) {
                    fs.copyFileSync(src, dst);
                    info(`  ✓ ${f}`);
                }
            }
            // Sync data/products.json
            const srcData = path.join(DATA_DIR, 'products.json');
            const dstDataRoot = path.join(gitRoot, 'data', 'products.json');
            const dstDataPublic = path.join(PUBLIC_DIR, 'data', 'products.json');
            fs.mkdirSync(path.dirname(dstDataRoot), { recursive: true });
            fs.mkdirSync(path.dirname(dstDataPublic), { recursive: true });
            fs.copyFileSync(srcData, dstDataRoot);
            fs.copyFileSync(srcData, dstDataPublic);
            info('  ✓ data/products.json (root + public)');

            // Sync images and admin folders
            copyDirSync(path.join(PUBLIC_DIR, 'images'), path.join(gitRoot, 'images'));
            info('  ✓ images/');
            copyDirSync(path.join(PUBLIC_DIR, 'admin'), path.join(gitRoot, 'admin'));
            info('  ✓ admin/');
        } else {
            info('  (git root == project dir, no sync needed)');
        }

        step('Step 2/6: Check git status');
        const st = await run('git status --short', gitRoot);
        info(st.stdout || '(working tree clean)');

        if (!st.stdout) {
            info('\n✓ Nothing to push. Working tree is already clean.');
            return res.json({ ok: true, output: log.join('\n') });
        }

        step('Step 3/6: Verify remote is configured');
        const remote = await run('git remote get-url origin', gitRoot);
        if (!remote.ok) {
            info('✗ No remote "origin" configured. Please set it:');
            info('  git remote add origin <URL>');
            return res.json({ ok: false, output: log.join('\n') });
        }
        info(`  remote: ${remote.stdout}`);

        step('Step 4/6: Stage all changes');
        const add = await run('git add -A', gitRoot);
        if (!add.ok) {
            info('✗ git add failed: ' + (add.stderr || add.error));
            return res.json({ ok: false, output: log.join('\n') });
        }
        info('  ✓ staged');

        step('Step 5/6: Commit');
        const commit = await run(`git commit -m "${msg}"`, gitRoot);
        if (!commit.ok) {
            // Check if it's because nothing to commit
            if (/nothing to commit/i.test(commit.stdout + commit.stderr)) {
                info('  (nothing to commit — tree clean after staging)');
            } else {
                info('✗ commit failed:');
                info(commit.stdout || '');
                info(commit.stderr || '');
                return res.json({ ok: false, output: log.join('\n') });
            }
        } else {
            info(commit.stdout.split('\n')[0] || '  ✓ committed');
        }

        step('Step 6/6: Push to origin');
        // Determine current branch
        const branch = await run('git rev-parse --abbrev-ref HEAD', gitRoot);
        const branchName = branch.stdout || 'main';
        let push = await run(`git push origin ${branchName}`, gitRoot);

        // If push rejected because remote is ahead, pull + retry
        if (!push.ok && /rejected|fetch first|non-fast-forward/i.test(push.stderr)) {
            info('  ⚠ Remote is ahead. Pulling with rebase...');
            const pull = await run(`git pull --rebase origin ${branchName}`, gitRoot);
            info(pull.stdout || pull.stderr || '');
            if (!pull.ok) {
                info('✗ Pull failed. Resolve conflicts manually then push again.');
                return res.json({ ok: false, output: log.join('\n') });
            }
            info('  ✓ pulled, retrying push...');
            push = await run(`git push origin ${branchName}`, gitRoot);
        }

        if (!push.ok) {
            info('✗ Push failed:');
            info(push.stdout || '');
            info(push.stderr || push.error || '');
            info('\nCommon fixes:');
            info('  • Check internet connection');
            info('  • Verify GitHub credentials (may need Personal Access Token)');
            info('  • Run: git push origin ' + branchName + '  manually in terminal');
            return res.json({ ok: false, output: log.join('\n') });
        }

        info(push.stdout || '');
        info(push.stderr || '');
        info(`\n✅ Successfully pushed to origin/${branchName}`);
        res.json({ ok: true, output: log.join('\n') });
    } catch (err) {
        info('\n✗ Unexpected error: ' + err.message);
        res.json({ ok: false, output: log.join('\n') });
    }
});

// ---------- Admin shortcut ----------
app.get('/admin', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html')));

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
    console.log(`\n  Uniform Solution — local server`);
    console.log(`  Website : http://localhost:${PORT}`);
    console.log(`  Admin   : http://localhost:${PORT}/admin\n`);
});
