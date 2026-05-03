// ==================================================
// Admin Portal — Uniform Solution
// ==================================================

(function () {
    'use strict';

    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    function esc(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function toast(msg, kind = '') {
        const el = document.createElement('div');
        el.className = 'toast ' + kind;
        const icon = kind === 'success' ? 'check-circle'
                   : kind === 'error'   ? 'exclamation-circle'
                   : 'info-circle';
        el.innerHTML = `<i class="fas fa-${icon}"></i><span>${esc(msg)}</span>`;
        $('#toasts').appendChild(el);
        setTimeout(() => {
            el.style.transition = 'opacity .3s, transform .3s';
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(() => el.remove(), 300);
        }, 3500);
    }

    // --------- State ---------
    const state = {
        categories: [],
        products: [],
        settings: {},
        editing: { category: null, product: null },
        imageState: { category: { keep: [], newFiles: [] }, product: { keep: [], newFiles: [] } },
        filter: ''
    };

    // --------- Navigation ---------
    $$('#nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.section;
            $$('#nav button').forEach(b => b.classList.toggle('active', b === btn));
            $$('.section').forEach(s => s.hidden = s.id !== 'section-' + target);
            if (target === 'git') { refreshGitStatus(); loadGitConfig(); }
        });
    });

    // --------- Load ---------
    async function loadAll() {
        const res = await fetch('/api/data', { cache: 'no-store' });
        const data = await res.json();
        state.categories = data.categories || [];
        state.products   = data.products   || [];
        state.settings   = data.settings   || {};
        render();
    }

    function render() {
        renderCategories();
        renderProducts();
        renderSettings();
        renderCounts();
        populateCategorySelects();
    }

    function renderCounts() {
        $('#countCategories').textContent = state.categories.length;
        $('#countProducts').textContent   = state.products.length;
    }

    function populateCategorySelects() {
        const opts = state.categories.map(c =>
            `<option value="${esc(c.id)}">${esc(c.icon || '')} ${esc(c.title)}</option>`
        ).join('');
        const sel = $('#prodCategorySelect');
        const keep = sel.value;
        sel.innerHTML = '<option value="" disabled selected>— Select a category —</option>' + opts;
        if (keep) sel.value = keep;

        const filter = $('#prodFilter');
        const fkeep = filter.value;
        filter.innerHTML = '<option value="">All categories</option>' + opts;
        if (fkeep) filter.value = fkeep;
    }

    // ==================================================
    // CATEGORIES
    // ==================================================
    function renderCategories() {
        const list = $('#list-categories');
        if (!state.categories.length) {
            list.innerHTML = `<div class="empty"><i class="fas fa-layer-group"></i><h3>No categories yet</h3><p>Add your first category above — products will file under it.</p></div>`;
            return;
        }
        list.innerHTML = state.categories.map(c => {
            const img = (c.images && c.images[0]) || '';
            const imgCount = (c.images || []).length;
            const prodCount = state.products.filter(p => p.categoryId === c.id).length;
            const media = img
                ? `<div class="item-media" style="background-image:url('${esc(imgUrl(img))}')">${imgCount > 1 ? `<span class="count-pill"><i class="fas fa-images"></i> ${imgCount}</span>` : ''}</div>`
                : `<div class="item-media"><span style="font-size:3rem;">${esc(c.icon || '🛍️')}</span></div>`;
            return `
                <div class="item" data-id="${esc(c.id)}">
                    ${media}
                    <div class="item-body">
                        <h4>${esc(c.icon || '')} ${esc(c.title)}</h4>
                        <div class="meta"><span class="pill"><i class="fas fa-box"></i> ${prodCount} product${prodCount === 1 ? '' : 's'}</span></div>
                        <div class="desc">${esc(c.description || '')}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm" data-edit-cat="${esc(c.id)}"><i class="fas fa-pen"></i> Edit</button>
                        <button class="btn btn-sm btn-danger" data-del-cat="${esc(c.id)}"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    $('#btnNewCategory').addEventListener('click', () => openCategoryForm(null));

    function openCategoryForm(cat) {
        const card = $('#formCard-category');
        card.hidden = false;
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const form = $('#form-category');
        form.reset();
        state.editing.category = cat ? cat.id : null;
        state.imageState.category = { keep: cat ? [...(cat.images || [])] : [], newFiles: [] };
        $('#catFormTitle').textContent = cat ? 'Edit category' : 'Add category';
        $('#catId').value = cat ? cat.id : '';
        if (cat) {
            form.title.value = cat.title || '';
            form.icon.value = cat.icon || '';
            form.description.value = cat.description || '';
        }
        renderImageManager('category', $('#catImgManager'));
    }
    function closeCategoryForm() {
        $('#formCard-category').hidden = true;
        state.editing.category = null;
    }

    $('#form-category').addEventListener('submit', async e => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const fd = new FormData();
            fd.append('title',       form.title.value.trim());
            fd.append('icon',        form.icon.value.trim());
            fd.append('description', form.description.value.trim());
            fd.append('existingImages', JSON.stringify(state.imageState.category.keep));
            for (const f of state.imageState.category.newFiles) fd.append('images', f);

            const editingId = state.editing.category;
            const url    = editingId ? `/api/categories/${encodeURIComponent(editingId)}` : '/api/categories';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Save failed');

            toast(editingId ? 'Category updated' : 'Category added', 'success');
            closeCategoryForm();
            await loadAll();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // ==================================================
    // PRODUCTS
    // ==================================================
    function renderProducts() {
        const list = $('#list-products');
        const filter = state.filter;
        const items = filter ? state.products.filter(p => p.categoryId === filter) : state.products;

        if (!items.length) {
            if (!state.categories.length) {
                list.innerHTML = `<div class="empty"><i class="fas fa-layer-group"></i><h3>Add categories first</h3><p>Products must belong to a category. Create one in the Categories tab.</p></div>`;
            } else {
                list.innerHTML = `<div class="empty"><i class="fas fa-box-open"></i><h3>No products${filter ? ' in this category' : ''} yet</h3><p>Click the "New Product" button above to add one.</p></div>`;
            }
            return;
        }

        list.innerHTML = items.map(p => {
            const img = (p.images && p.images[0]) || '';
            const imgCount = (p.images || []).length;
            const cat = state.categories.find(c => c.id === p.categoryId);
            const catLabel = cat ? `${cat.icon || ''} ${cat.title}` : '(uncategorized)';
            const media = img
                ? `<div class="item-media" style="background-image:url('${esc(imgUrl(img))}')">${imgCount > 1 ? `<span class="count-pill"><i class="fas fa-images"></i> ${imgCount}</span>` : ''}</div>`
                : `<div class="item-media"><i class="fas fa-box"></i></div>`;
            return `
                <div class="item" data-id="${esc(p.id)}">
                    ${media}
                    <div class="item-body">
                        <h4>${esc(p.name)}</h4>
                        <div class="meta"><span class="pill"><i class="fas fa-tag"></i> ${esc(catLabel)}</span></div>
                        <div class="desc">${esc(p.description || '')}</div>
                        ${p.price ? `<div class="price">${esc(p.price)}</div>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm" data-edit-prod="${esc(p.id)}"><i class="fas fa-pen"></i> Edit</button>
                        <button class="btn btn-sm btn-danger" data-del-prod="${esc(p.id)}"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    $('#btnNewProduct').addEventListener('click', () => {
        if (!state.categories.length) {
            toast('Add a category first — products must belong to one', 'error');
            return;
        }
        openProductForm(null);
    });

    $('#prodFilter').addEventListener('change', e => {
        state.filter = e.target.value;
        renderProducts();
    });

    function openProductForm(prod) {
        const card = $('#formCard-product');
        card.hidden = false;
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const form = $('#form-product');
        form.reset();
        state.editing.product = prod ? prod.id : null;
        state.imageState.product = { keep: prod ? [...(prod.images || [])] : [], newFiles: [] };
        $('#prodFormTitle').textContent = prod ? 'Edit product' : 'Add product';
        $('#prodId').value = prod ? prod.id : '';
        if (prod) {
            form.name.value        = prod.name || '';
            form.categoryId.value  = prod.categoryId || '';
            form.price.value       = prod.price || '';
            form.description.value = prod.description || '';
        }
        renderImageManager('product', $('#prodImgManager'));
    }
    function closeProductForm() {
        $('#formCard-product').hidden = true;
        state.editing.product = null;
    }

    $('#form-product').addEventListener('submit', async e => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const fd = new FormData();
            fd.append('name',        form.name.value.trim());
            fd.append('categoryId',  form.categoryId.value);
            fd.append('price',       form.price.value.trim());
            fd.append('description', form.description.value.trim());
            fd.append('existingImages', JSON.stringify(state.imageState.product.keep));
            for (const f of state.imageState.product.newFiles) fd.append('images', f);

            const editingId = state.editing.product;
            const url    = editingId ? `/api/products/${encodeURIComponent(editingId)}` : '/api/products';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Save failed');

            toast(editingId ? 'Product updated' : 'Product added', 'success');
            closeProductForm();
            await loadAll();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // ==================================================
    // IMAGE MANAGER (shared by category + product)
    // ==================================================
    // Resolve a relative "images/foo.jpg" path to an absolute "/images/foo.jpg"
    // so it works even though admin is served from /admin/.
    function imgUrl(src) {
        if (!src) return '';
        if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
        return '/' + src.replace(/^\/+/, '');
    }

    function renderImageManager(kind, container) {
        const s = state.imageState[kind];
        const items = [];
        s.keep.forEach((src, i) => items.push({ kind: 'keep', src: imgUrl(src), i }));
        s.newFiles.forEach((f, i) => items.push({ kind: 'new', src: URL.createObjectURL(f), i }));
        container.innerHTML = items.map(it => `
            <div class="img-tile ${it.kind === 'new' ? 'pending' : ''}" style="background-image:url('${esc(it.src)}')">
                <button type="button" class="remove" data-kind="${kind}" data-type="${it.kind}" data-index="${it.i}" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    document.addEventListener('click', e => {
        const rem = e.target.closest('.img-tile .remove');
        if (!rem) return;
        e.preventDefault();
        const kind = rem.dataset.kind;
        const type = rem.dataset.type;
        const idx  = parseInt(rem.dataset.index, 10);
        const s = state.imageState[kind];
        if (type === 'keep') s.keep.splice(idx, 1);
        else                 s.newFiles.splice(idx, 1);
        const container = kind === 'category' ? $('#catImgManager') : $('#prodImgManager');
        renderImageManager(kind, container);
    });

    function handleFileInput(input, kind) {
        const files = [...(input.files || [])];
        if (!files.length) return;
        state.imageState[kind].newFiles.push(...files);
        const container = kind === 'category' ? $('#catImgManager') : $('#prodImgManager');
        renderImageManager(kind, container);
        input.value = '';
    }

    $('#form-category').querySelector('input[type="file"]').addEventListener('change', e => handleFileInput(e.target, 'category'));
    $('#form-product').querySelector('input[type="file"]').addEventListener('change',  e => handleFileInput(e.target, 'product'));

    // ==================================================
    // DELETE (delegated)
    // ==================================================
    document.addEventListener('click', async e => {
        const delCat  = e.target.closest('[data-del-cat]');
        const delProd = e.target.closest('[data-del-prod]');
        const editCat  = e.target.closest('[data-edit-cat]');
        const editProd = e.target.closest('[data-edit-prod]');

        if (editCat) {
            const cat = state.categories.find(c => c.id === editCat.dataset.editCat);
            if (cat) openCategoryForm(cat);
            return;
        }
        if (editProd) {
            const p = state.products.find(x => x.id === editProd.dataset.editProd);
            if (p) openProductForm(p);
            return;
        }

        if (delCat) {
            const id = delCat.dataset.delCat;
            const used = state.products.filter(p => p.categoryId === id).length;
            const msg = used
                ? `Delete this category? ${used} product${used === 1 ? '' : 's'} will become uncategorized.`
                : 'Delete this category?';
            if (!confirm(msg)) return;
            delCat.disabled = true;
            try {
                const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Delete failed');
                toast('Category deleted', 'success');
                await loadAll();
            } catch (err) { toast(err.message, 'error'); delCat.disabled = false; }
            return;
        }

        if (delProd) {
            const id = delProd.dataset.delProd;
            if (!confirm('Delete this product?')) return;
            delProd.disabled = true;
            try {
                const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Delete failed');
                toast('Product deleted', 'success');
                await loadAll();
            } catch (err) { toast(err.message, 'error'); delProd.disabled = false; }
            return;
        }
    });

    // Close-form buttons (delegated)
    document.addEventListener('click', e => {
        const close = e.target.closest('[data-close-form]');
        if (!close) return;
        e.preventDefault();
        if (close.dataset.closeForm === 'category') closeCategoryForm();
        else if (close.dataset.closeForm === 'product') closeProductForm();
    });

    // ==================================================
    // SETTINGS
    // ==================================================
    function renderSettings() {
        const s = state.settings || {};
        const form = $('#form-settings');
        form.businessName.value     = s.businessName     || '';
        form.tagline.value          = s.tagline          || '';
        form.whatsappNumber.value   = s.whatsappNumber   || '';
        form.email.value            = s.email            || '';
        form.phones.value           = (s.phones || []).join('\n');
        form.location.value         = s.location         || '';
        form.hours.value            = s.hours            || '';
        form.heroHeadline.value     = s.heroHeadline     || '';
        form.heroSubheadline.value  = s.heroSubheadline  || '';
        form.aboutText.value        = s.aboutText        || '';
    }

    $('#form-settings').addEventListener('submit', async e => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        try {
            const payload = {
                businessName:    form.businessName.value.trim(),
                tagline:         form.tagline.value.trim(),
                whatsappNumber:  form.whatsappNumber.value.replace(/[^0-9]/g, ''),
                email:           form.email.value.trim(),
                phones:          form.phones.value.split('\n').map(s => s.trim()).filter(Boolean),
                location:        form.location.value.trim(),
                hours:           form.hours.value.trim(),
                heroHeadline:    form.heroHeadline.value.trim(),
                heroSubheadline: form.heroSubheadline.value.trim(),
                aboutText:       form.aboutText.value.trim()
            };
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Save failed');
            toast('Settings saved', 'success');
            state.settings = json;
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // ==================================================
    // GIT
    // ==================================================
    async function refreshGitStatus() {
        const el = $('#gitStatus');
        el.textContent = 'Fetching status...';
        try {
            const res = await fetch('/api/git/status');
            const json = await res.json();
            el.textContent = json.output || '(clean)';
        } catch (err) {
            el.textContent = 'Error: ' + err.message;
        }
    }
    $('#btnStatus').addEventListener('click', refreshGitStatus);

    // --------- Repair corrupt git index ---------
    const btnRepair = $('#btnRepair');
    if (btnRepair) {
        btnRepair.addEventListener('click', async () => {
            const el = $('#gitStatus');
            const original = btnRepair.innerHTML;
            btnRepair.disabled = true;
            btnRepair.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Repairing...';
            el.textContent = 'Repairing git index...';
            try {
                const res = await fetch('/api/git/repair', { method: 'POST' });
                const json = await res.json();
                el.textContent = json.output || (json.ok ? '✓ Repaired' : '✗ Repair failed');
            } catch (err) {
                el.textContent = 'Error: ' + err.message;
            } finally {
                btnRepair.disabled = false;
                btnRepair.innerHTML = original;
            }
        });
    }

    // --------- Repo settings (config) ---------
    async function loadGitConfig() {
        try {
            const res = await fetch('/api/git/config', { cache: 'no-store' });
            const cfg = await res.json();
            $('#cfgRepoUrl').value     = cfg.repoUrl     || '';
            $('#cfgProjectPath').value = cfg.projectPath || '';
            $('#cfgBranch').value      = cfg.branch      || 'main';
        } catch { /* ignore */ }
    }

    $('#btnSaveCfg').addEventListener('click', async () => {
        const btn = $('#btnSaveCfg');
        const out = $('#cfgOutput');
        const payload = {
            repoUrl:     $('#cfgRepoUrl').value.trim(),
            projectPath: $('#cfgProjectPath').value.trim(),
            branch:      $('#cfgBranch').value.trim() || 'main'
        };
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        out.style.display = 'block';
        out.textContent = 'Saving and configuring git remote...';
        try {
            const res = await fetch('/api/git/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            out.textContent = json.output || JSON.stringify(json, null, 2);
            toast(json.ok ? 'Settings saved' : 'Saved with warnings', json.ok ? 'success' : 'error');
            refreshGitStatus();
        } catch (err) {
            out.textContent = 'Error: ' + err.message;
            toast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    });

    $('#btnPush').addEventListener('click', async () => {
        const btn = $('#btnPush');
        const out = $('#gitOutput');
        const message = $('#commitMessage').value.trim() || 'content update';
        btn.disabled = true;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing & pushing...';
        out.textContent = `Starting...\n• Syncing public files to repo root\n• Staging changes\n• Committing: "${message}"\n• Pushing to origin (handles conflicts)\n\nPlease wait...`;
        try {
            const res = await fetch('/api/git/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const json = await res.json();
            out.textContent = json.output || '(no output)';
            if (json.ok) toast('Pushed to GitHub', 'success');
            else         toast('Push failed — see output', 'error');
            refreshGitStatus();
        } catch (err) {
            out.textContent = 'Error: ' + err.message;
            toast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // --------- Init ---------
    loadAll().catch(err => {
        console.error(err);
        toast('Failed to load data: ' + err.message, 'error');
    });
})();
