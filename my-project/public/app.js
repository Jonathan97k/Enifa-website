// ==================================================
// Uniform Solution — Public Website Script
// ==================================================
// - Loads data from /api/data (the same JSON the admin writes to)
// - Renders categories as clickable containers
// - Hash routing: #category=<id> opens category detail with all products
// - Hero badges link to categories
// - Lightbox for multi-image products
// - Contact/order form pre-fills WhatsApp

(function () {
    'use strict';

    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    function esc(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
    function waLink(number, msg) {
        return 'https://wa.me/' + encodeURIComponent(number || '') +
               '?text=' + encodeURIComponent(msg || '');
    }

    // --------- State ---------
    const state = {
        settings: {},
        categories: [],
        products: [],
        lightbox: { images: [], index: 0, title: '' }
    };

    // --------- Load ---------
    function hideLoader() {
        const l = $('#loader');
        if (l) l.classList.add('hide');
    }

    async function load() {
        let data = null;
        let fetchErr = '';

        try {
            // 1) Try fetching the JSON file (with 4s timeout)
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 4000);
                const res = await fetch('./data/products.json', {
                    cache: 'no-store',
                    signal: ctrl.signal
                });
                clearTimeout(t);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                data = await res.json();
            } catch (err) {
                fetchErr = err.message || String(err);
                console.warn('Fetch failed, trying inline fallback:', err);
            }

            // 2) Fallback: read inline JSON (works with file:// protocol)
            if (!data) {
                const el = document.getElementById('site-data');
                if (el) {
                    data = JSON.parse(el.textContent);
                } else {
                    throw new Error('No inline data found');
                }
            }

            state.settings   = data.settings   || {};
            state.categories = data.categories || [];
            state.products   = data.products   || [];
            renderAll();
            route();
        } catch (err) {
            console.error('Load error:', err);
            document.body.innerHTML = `
                <div style="padding:40px;text-align:center;font-family:sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#b91c1c;margin-bottom:12px;">Failed to load site data</h2>
                    <p style="color:#444;line-height:1.6;">
                        The site could not read <code>data/products.json</code>.<br><br>
                        <b>Local file:</b> Open this page using a local server (e.g. <code>npx serve</code> or VS Code Live Server).<br>
                        <b>Online:</b> Make sure <code>data/products.json</code> is uploaded with the site.<br><br>
                        <small style="color:#888;">Error: ${esc(err.message || String(err))}</small>
                    </p>
                </div>`;
        } finally {
            setTimeout(hideLoader, 400);
        }
    }

    // Global safety net: force-hide loader after 8 seconds no matter what
    setTimeout(hideLoader, 8000);

    // --------- Render ---------
    function renderAll() {
        renderSettings();
        renderHeroBadges();
        renderCategories();
        renderFeatured();
        renderAbout();
        renderContact();
        renderFooter();
        populateProductSelect();
    }

    function renderSettings() {
        const s = state.settings;
        if (s.heroHeadline) {
            const h1 = $('#heroH1');
            if (h1) h1.innerHTML = s.heroHeadline.replace(/Uniforms/i, '<span class="accent">Uniforms</span>');
        }
        const heroSub = $('#heroSub');
        if (heroSub) heroSub.textContent = s.heroSubheadline || s.tagline || '';

        const wa = waLink(s.whatsappNumber, `Hello, I'd like to know more about your products.`);
        [['#heroWaBtn', wa], ['#floatWa', wa], ['#helpWaBtn', wa], ['#mobileNavWa', wa]].forEach(([sel, href]) => {
            const el = $(sel); if (el) el.href = href;
        });
        const offer = $('#offerWaBtn');
        if (offer) offer.href = waLink(s.whatsappNumber, 'Hello! I would like to know about your special offers and bulk discounts.');

        // Mobile nav phone link
        const mobileNavPhone = $('#mobileNavPhone');
        if (mobileNavPhone) {
            const phones = (s.phones || []).filter(Boolean);
            if (phones[0]) {
                mobileNavPhone.href = 'tel:' + phones[0].replace(/\s/g, '');
            } else {
                mobileNavPhone.style.display = 'none';
            }
        }

        // Announcement bar
        const abHours = $('#abHours'); if (abHours && s.hours) abHours.textContent = s.hours;
        const abPhone = $('#abPhone');
        if (abPhone) {
            const phones = (s.phones || []).filter(Boolean);
            abPhone.textContent = phones[0] || s.whatsappNumber || '';
        }

        // Build hero slideshow
        initHeroCarousel();
    }

    function renderHeroBadges() { /* legacy badges removed — categories now in menu bar */ }

    // ===== Professional Hero Carousel =====
    function initHeroCarousel() {
        const slidesWrap = $('#heroSlides');
        const dotsWrap   = $('#heroDots');
        const infoTag    = $('#heroSlideTag');
        const infoName   = $('#heroSlideName');
        const progBar    = $('#heroProgressBar');
        const infoCard   = $('#heroInfoCard');
        const slideshow  = $('#heroSlideshow');
        if (!slidesWrap || !slideshow) return;

        // Collect images: products first, then categories, then placeholder
        const items = [];
        state.products.forEach(p => {
            if (p.images && p.images[0]) {
                items.push({ src: p.images[0], name: p.name, type: 'Product', price: p.price });
            }
        });
        state.categories.forEach(c => {
            if (c.images && c.images[0]) {
                items.push({ src: c.images[0], name: c.title, type: 'Category' });
            }
        });
        // If no images at all, show placeholder
        if (!items.length) {
            slideshow.classList.add('ready');
            return;
        }

        // Build slides and dots
        slidesWrap.innerHTML = items.map((item, i) => `
            <div class="hero-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                <img src="${esc(item.src)}" alt="${esc(item.name)}" loading="${i > 1 ? 'lazy' : 'eager'}">
            </div>
        `).join('');
        dotsWrap.innerHTML = items.map((_, i) => `
            <button class="hero-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>
        `).join('');
        slideshow.classList.add('ready');

        const DURATION = 5500;
        let idx = 0, timer = null, progressRaf = null, progressStart = 0;
        const slides = () => $$('.hero-slide');
        const dots   = () => $$('.hero-dot');

        function updateSlide(newIdx) {
            const s = slides(); const d = dots();
            if (!s[newIdx]) return;
            s.forEach(el => el.classList.remove('active'));
            d.forEach(el => el.classList.remove('active'));
            s[newIdx].classList.add('active');
            d[newIdx].classList.add('active');
            idx = newIdx;

            // Update info card
            const item = items[idx];
            if (infoTag && infoName && infoCard) {
                infoCard.classList.add('changing');
                setTimeout(() => {
                    infoTag.innerHTML = `<i class="fas fa-tag"></i> <span>${esc(item.type)}</span>`;
                    infoName.textContent = item.name + (item.price && item.price !== 'Price on Request' ? ' — ' + item.price : '');
                    infoCard.classList.remove('changing');
                }, 150);
            }
        }

        function startTimer() {
            stopTimer();
            progressStart = performance.now();
            tickProgress();
            timer = setTimeout(() => {
                updateSlide((idx + 1) % items.length);
                startTimer();
            }, DURATION);
        }
        function stopTimer() {
            clearTimeout(timer);
            cancelAnimationFrame(progressRaf);
            if (progBar) progBar.style.width = '0%';
        }
        function tickProgress(ts) {
            if (!progBar) return;
            const elapsed = (ts || performance.now()) - progressStart;
            const pct = Math.min(100, (elapsed / DURATION) * 100);
            progBar.style.width = pct + '%';
            if (pct < 100) progressRaf = requestAnimationFrame(tickProgress);
        }

        // Click dots
        dotsWrap.addEventListener('click', e => {
            const d = e.target.closest('.hero-dot');
            if (!d) return;
            const i = parseInt(d.dataset.index);
            if (i !== idx) { updateSlide(i); startTimer(); }
        });

        // Prev/Next
        $('#heroPrev')?.addEventListener('click', () => {
            updateSlide((idx - 1 + items.length) % items.length); startTimer();
        });
        $('#heroNext')?.addEventListener('click', () => {
            updateSlide((idx + 1) % items.length); startTimer();
        });

        // Pause on hover / touch
        slideshow.addEventListener('mouseenter', stopTimer);
        slideshow.addEventListener('mouseleave', startTimer);
        slideshow.addEventListener('touchstart', () => {
            slideshow.classList.add('touched');
            stopTimer();
        }, { passive: true });
        slideshow.addEventListener('touchend', () => startTimer(), { passive: true });

        // Swipe
        let touchStartX = 0;
        slideshow.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        slideshow.addEventListener('touchend', e => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
                if (diff > 0) updateSlide((idx + 1) % items.length);
                else updateSlide((idx - 1 + items.length) % items.length);
                startTimer();
            }
        }, { passive: true });

        // Set first info
        if (infoTag && infoName) {
            infoTag.innerHTML = `<i class="fas fa-tag"></i> <span>${esc(items[0].type)}</span>`;
            infoName.textContent = items[0].name + (items[0].price && items[0].price !== 'Price on Request' ? ' — ' + items[0].price : '');
        }

        startTimer();
    }

    function countProducts(catId) {
        return state.products.filter(p => p.categoryId === catId).length;
    }

    function renderCategories() {
        const grid = $('#catGrid');
        if (!state.categories.length) {
            grid.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><br>No categories yet. Add some from the <a href="/admin">admin portal</a>.</div>`;
            return;
        }
        grid.innerHTML = state.categories.map(c => {
            const images = (c.images || []).filter(Boolean);
            let thumb;
            if (images.length === 0) {
                thumb = `<div class="cat-strip-thumb">${esc(c.icon || '🛍️')}</div>`;
            } else if (images.length === 1) {
                thumb = `<div class="cat-strip-thumb" style="background-image:url('${esc(images[0])}')"></div>`;
            } else {
                const slides = images.map((src, i) =>
                    `<div class="ps-slide${i === 0 ? ' active' : ''}" style="background-image:url('${esc(src)}')"></div>`
                ).join('');
                thumb = `<div class="cat-strip-thumb product-slideshow" data-slides="${images.length}">${slides}</div>`;
            }
            return `
                <a class="cat-strip-card" href="#products" data-filter-cat="${esc(c.id)}">
                    ${thumb}
                    <h4>${esc(c.title)}</h4>
                    <div class="shop-now">Shop Now →</div>
                </a>
            `;
        }).join('');
        initSlideshows(grid);

        // Also populate category menu bar links dynamically
        const menuLinks = $('#catMenuLinks');
        if (menuLinks) {
            const base = `
                <a href="#home" data-nav="home">Home</a>
                <a href="#products" data-nav="products">Shop</a>
            `;
            const catLinks = state.categories.slice(0, 4).map(c => {
                let t = c.title;
                if (t.length > 12) t = t.split(/[\s&]+/)[0];
                return `<a href="#products" data-filter-cat="${esc(c.id)}">${esc(t)}</a>`;
            }).join('');
            menuLinks.innerHTML = base + catLinks + `
                <a href="#about" data-nav="about">About</a>
                <a href="#contact" data-nav="contact">Contact</a>
            `;
        }
    }

    // Click category strip card or menu link → filter featured products
    document.addEventListener('click', (e) => {
        const catLink = e.target.closest('[data-filter-cat]');
        if (catLink) {
            e.preventDefault();
            activeFilter = catLink.dataset.filterCat;
            renderFeatured();
            const target = $('#products');
            if (target) {
                const y = target.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    });

    // --------- Featured Products (Home Page) ---------
    let activeFilter = 'all';

    function renderFeatured() {
        const filterBar = $('#featuredFilter');
        const grid = $('#featuredGrid');
        if (!filterBar || !grid) return;

        // Render filter chips
        const chips = [
            `<button class="filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
                <i class="fas fa-th"></i> All <span class="chip-count">${state.products.length}</span>
            </button>`
        ];
        state.categories.forEach(c => {
            const count = countProducts(c.id);
            if (count === 0) return;
            chips.push(`
                <button class="filter-chip ${activeFilter === c.id ? 'active' : ''}" data-filter="${esc(c.id)}">
                    <span>${esc(c.icon || '')}</span> ${esc(c.title)} <span class="chip-count">${count}</span>
                </button>
            `);
        });
        filterBar.innerHTML = chips.join('');

        // Filter products
        const products = activeFilter === 'all'
            ? state.products
            : state.products.filter(p => p.categoryId === activeFilter);

        if (!products.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i><br>
                    <h3 style="color:var(--dark);margin-bottom:10px;">No products in this category yet</h3>
                    <p>Please check back soon or contact us directly.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(p => renderProductCard(p)).join('');
        updateCartButtons();
        initSlideshows(grid);
    }

    // Filter chip click handler
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip[data-filter]');
        if (!chip) return;
        activeFilter = chip.dataset.filter;
        renderFeatured();
        // Smooth scroll to keep user on products section
        const grid = $('#featuredGrid');
        if (grid) {
            const rect = grid.getBoundingClientRect();
            if (rect.top < 60) {
                window.scrollTo({ top: window.scrollY + rect.top - 100, behavior: 'smooth' });
            }
        }
    });

    function renderAbout() {
        const s = state.settings;
        $('#aboutP').textContent = s.aboutText || '';
        $('#aboutLoc').textContent = s.location || '—';
        const wrap = $('#specialties');
        wrap.innerHTML = state.categories.slice(0, 6).map(c =>
            `<a class="spec-item" href="#category=${esc(c.id)}"><span class="icon">${esc(c.icon || '🛍️')}</span><span>${esc(c.title)}</span></a>`
        ).join('');
    }

    function renderContact() {
        const s = state.settings;
        $('#cLoc').textContent = s.location || '—';
        const phones = (s.phones || []).filter(Boolean);
        $('#cPhones').innerHTML = phones.length ? phones.map(p => `<a href="tel:${esc(p.replace(/\s/g,''))}">${esc(p)}</a>`).join('<br>') : '—';
        $('#cWa').innerHTML     = s.whatsappNumber ? `<a href="${waLink(s.whatsappNumber,'')}" target="_blank">+${esc(s.whatsappNumber)}</a>` : '—';
        $('#cEmail').innerHTML   = s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : '—';
        $('#cHours').textContent = s.hours || '—';
    }

    function renderFooter() {
        const s = state.settings;
        const yr = $('#fYear'); if (yr) yr.textContent = new Date().getFullYear();
        const fwa = $('#fWa'); if (fwa) fwa.href = waLink(s.whatsappNumber, '');

        const phones = (s.phones || []).filter(Boolean);
        const setTxt = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt || '—'; };
        setTxt('#fPhone', phones[0] || '—');
        setTxt('#fWaNum', s.whatsappNumber ? `+${s.whatsappNumber}` : '—');
        setTxt('#fEmail', s.email);
        setTxt('#fLoc', s.location);
    }

    function populateProductSelect() {
        const select = $('#fProduct');
        select.innerHTML = '<option value="" disabled selected>Select a category</option>' +
            state.categories.map(c => `<option value="${esc(c.title)}">${esc(c.title)}</option>`).join('');
    }

    // --------- Contact form ---------
    $('#waForm').addEventListener('submit', e => {
        e.preventDefault();
        const name    = $('#fName').value.trim();
        const phone   = $('#fPhone').value.trim();
        const product = $('#fProduct').value;
        const msg     = $('#fMsg').value.trim();
        const text = `Hello ${state.settings.businessName || ''}!\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Product:* ${product}\n*Details:* ${msg}\n\nPlease assist me.`;
        window.open(waLink(state.settings.whatsappNumber, text), '_blank');
    });

    // --------- Navigation / Routing ---------
    function parseHash() {
        const hash = location.hash.replace(/^#/, '');
        if (hash.startsWith('category=')) {
            return { view: 'category', id: decodeURIComponent(hash.slice(9)) };
        }
        return { view: 'home', anchor: hash };
    }

    function route() {
        const r = parseHash();
        if (r.view === 'category') showCategory(r.id);
        else showHome(r.anchor);
    }

    function showHome(anchor) {
        $('#viewHome').classList.remove('hidden');
        $('#viewCategory').classList.remove('active');
        if (anchor) {
            // scroll to section with that id
            const el = document.getElementById(anchor);
            if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 40);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function showCategory(id) {
        const cat = state.categories.find(c => c.id === id);
        if (!cat) { location.hash = '#home'; return; }
        $('#viewHome').classList.add('hidden');
        $('#viewCategory').classList.add('active');

        $('#catBreadTitle').textContent = cat.title;
        $('#catDetailTitle').textContent = cat.title;
        $('#catDetailDesc').textContent = cat.description || '';
        $('#catDetailIcon').textContent = cat.icon || '🛍️';
        const heroBg = (cat.images && cat.images[0]) || '';
        $('#catHero').style.setProperty('--cat-hero-bg', heroBg ? `url('${heroBg}')` : 'none');

        const products = state.products.filter(p => p.categoryId === id);
        const grid = $('#catProducts');
        const waMsg = (pName) => waLink(state.settings.whatsappNumber, `Hello, I want to order *${pName}* (${cat.title}).`);

        if (!products.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i><br>
                    <h3 style="color:var(--dark);margin-bottom:10px;">No products listed in this category yet</h3>
                    <p>Contact us directly — we may still have what you're looking for.</p>
                    <a href="${waLink(state.settings.whatsappNumber, 'Hello, I am interested in ' + cat.title + '. Please send details.')}" target="_blank" class="btn btn-primary" style="margin-top:20px;"><i class="fab fa-whatsapp"></i> Inquire on WhatsApp</a>
                </div>
            `;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        grid.innerHTML = products.map(p => renderProductCard(p)).join('');
        updateCartButtons();
        initSlideshows(grid);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --------- Auto Slideshow (multi-image rotation for product/category cards) ---------
    const slideshowTimers = new WeakMap();
    function initSlideshows(root = document) {
        const nodes = root.querySelectorAll('.product-slideshow');
        nodes.forEach(node => {
            // Avoid double-init
            if (slideshowTimers.has(node)) {
                clearInterval(slideshowTimers.get(node));
            }
            const slides = node.querySelectorAll('.ps-slide');
            if (slides.length <= 1) return;
            let i = 0;
            const timer = setInterval(() => {
                slides[i].classList.remove('active');
                i = (i + 1) % slides.length;
                slides[i].classList.add('active');
            }, 2800);
            slideshowTimers.set(node, timer);
        });
    }

    // --------- Product Card Template ---------
    function isProductNew(p) {
        if (!p.createdAt) return false;
        const days = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 30; // "New" for 30 days
    }

    function renderProductCard(p) {
        const images = (p.images || []).filter(Boolean);
        const imgCount = images.length;
        let imgHtml;
        if (imgCount === 0) {
            imgHtml = `<div class="product-img"><i class="fas fa-box"></i></div>`;
        } else if (imgCount === 1) {
            imgHtml = `<div class="product-img clickable-img" data-pid="${esc(p.id)}" style="background-image:url('${esc(images[0])}')"></div>`;
        } else {
            const slides = images.map((src, i) =>
                `<div class="ps-slide${i === 0 ? ' active' : ''}" style="background-image:url('${esc(src)}')"></div>`
            ).join('');
            imgHtml = `
                <div class="product-img product-slideshow clickable-img" data-pid="${esc(p.id)}" data-slides="${imgCount}">
                    ${slides}
                    <span class="img-badge"><i class="fas fa-images"></i> ${imgCount}</span>
                </div>`;
        }
        const priceHtml = formatPriceDisplay(p.price);
        const inCart = Cart.has(p.id);
        const isNew = isProductNew(p);
        const isWish = Wishlist.has(p.id);
        return `
            <article class="product-card">
                ${isNew ? `<span class="prod-new">New</span>` : ''}
                <button class="prod-wishlist ${isWish ? 'active' : ''}" data-wish="${esc(p.id)}" aria-label="Add to wishlist">
                    <i class="${isWish ? 'fas' : 'far'} fa-heart"></i>
                </button>
                ${imgHtml}
                <div class="product-body">
                    <h4>${esc(p.name)}</h4>
                    ${p.description ? `<p class="p-desc">${esc(p.description)}</p>` : ''}
                    ${priceHtml}
                    <button class="btn-cart ${inCart ? 'in-cart' : ''}" data-add-cart="${esc(p.id)}">
                        <i class="fas ${inCart ? 'fa-check' : 'fa-cart-plus'}"></i>
                        <span>${inCart ? 'Added to Cart' : 'Add to Cart'}</span>
                    </button>
                </div>
            </article>
        `;
    }

    function formatPriceDisplay(price) {
        if (!price || /on request|poa|call/i.test(price)) {
            return `<div class="p-price on-request"><i class="fas fa-tag"></i> Price on Request</div>`;
        }
        // Extract numeric value to show with currency prefix
        const hasCurrency = /MK|USD|\$|MWK/i.test(price);
        if (hasCurrency) {
            return `<div class="p-price">${esc(price)}</div>`;
        }
        return `<div class="p-price"><span class="currency">MK</span>${esc(price)}</div>`;
    }

    function parsePrice(price) {
        if (!price) return 0;
        const m = String(price).match(/[\d,]+(\.\d+)?/);
        if (!m) return 0;
        return parseFloat(m[0].replace(/,/g, '')) || 0;
    }

    function updateCartButtons() {
        document.querySelectorAll('[data-add-cart]').forEach(btn => {
            const id = btn.dataset.addCart;
            const inCart = Cart.has(id);
            btn.classList.toggle('in-cart', inCart);
            btn.innerHTML = inCart
                ? '<i class="fas fa-check"></i><span>Added to Cart</span>'
                : '<i class="fas fa-cart-plus"></i><span>Add to Cart</span>';
        });
    }

    window.navigateHome = () => { location.hash = '#categories'; };

    window.addEventListener('hashchange', route);

    // --------- Lightbox ---------
    const LB = {
        el: $('#lightbox'),
        open(title, images, start = 0) {
            state.lightbox = { images, index: start, title };
            $('#lbTitle').textContent = title;
            this.render();
            this.el.classList.add('active');
            document.body.style.overflow = 'hidden';
        },
        close() { this.el.classList.remove('active'); document.body.style.overflow = ''; },
        show(i) {
            const { images } = state.lightbox;
            if (!images.length) return;
            if (i < 0) i = images.length - 1;
            if (i >= images.length) i = 0;
            state.lightbox.index = i;
            this.render();
        },
        render() {
            const { images, index, title } = state.lightbox;
            $('#lbImg').src = images[index];
            $('#lbImg').alt = title + ' image ' + (index + 1);
            $('#lbCount').textContent = (index + 1) + ' of ' + images.length;
            const single = images.length <= 1;
            $('#lbPrev').style.display = single ? 'none' : '';
            $('#lbNext').style.display = single ? 'none' : '';
            $('#lbThumbs').style.display = single ? 'none' : 'flex';
            $('#lbThumbs').innerHTML = images.map((src, i) =>
                `<div class="lightbox-thumb ${i === index ? 'active' : ''}" data-i="${i}" style="background-image:url('${esc(src)}')"></div>`
            ).join('');
        }
    };
    $('#lbClose').addEventListener('click', () => LB.close());
    $('#lbPrev').addEventListener('click',  () => LB.show(state.lightbox.index - 1));
    $('#lbNext').addEventListener('click',  () => LB.show(state.lightbox.index + 1));
    LB.el.addEventListener('click', e => { if (e.target === LB.el) LB.close(); });
    document.addEventListener('keydown', e => {
        if (!LB.el.classList.contains('active')) return;
        if (e.key === 'Escape') LB.close();
        else if (e.key === 'ArrowLeft')  LB.show(state.lightbox.index - 1);
        else if (e.key === 'ArrowRight') LB.show(state.lightbox.index + 1);
    });
    document.addEventListener('click', e => {
        const thumb = e.target.closest('.lightbox-thumb');
        if (thumb) LB.show(parseInt(thumb.dataset.i, 10));
        const pimg = e.target.closest('.clickable-img[data-pid]');
        if (pimg) {
            const p = state.products.find(x => x.id === pimg.dataset.pid);
            if (p && p.images && p.images.length) LB.open(p.name, p.images, 0);
        }
    });

    // --------- Wishlist ---------
    const WISH_KEY = 'us_wishlist_v1';
    const Wishlist = {
        ids: [],
        load() {
            try {
                this.ids = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
                if (!Array.isArray(this.ids)) this.ids = [];
            } catch { this.ids = []; }
        },
        save() { localStorage.setItem(WISH_KEY, JSON.stringify(this.ids)); },
        has(id) { return this.ids.includes(id); },
        toggle(id) {
            if (this.has(id)) this.ids = this.ids.filter(x => x !== id);
            else this.ids.push(id);
            this.save();
            this.updateBadge();
        },
        updateBadge() {
            const badge = $('#wishlistBadge');
            if (!badge) return;
            if (this.ids.length > 0) {
                badge.textContent = this.ids.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    };
    Wishlist.load();
    Wishlist.updateBadge();

    // Wishlist button click handler
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-wish]');
        if (!btn) return;
        e.preventDefault();
        const id = btn.dataset.wish;
        Wishlist.toggle(id);
        const icon = btn.querySelector('i');
        if (Wishlist.has(id)) {
            btn.classList.add('active');
            icon.classList.remove('far'); icon.classList.add('fas');
            showToast('Added to wishlist', 'success');
        } else {
            btn.classList.remove('active');
            icon.classList.remove('fas'); icon.classList.add('far');
        }
    });

    // Wishlist icon in header → scroll to products + filter saved items
    document.addEventListener('click', (e) => {
        const wb = e.target.closest('#wishlistBtn');
        if (!wb) return;
        if (!Wishlist.ids.length) {
            showToast('Your wishlist is empty', 'info');
            return;
        }
        // Filter the featured grid to show only wishlisted products
        const grid = $('#featuredGrid');
        if (!grid) return;
        const wishProducts = state.products.filter(p => Wishlist.has(p.id));
        grid.innerHTML = wishProducts.map(p => renderProductCard(p)).join('');
        updateCartButtons();
        const target = $('#products');
        if (target) {
            const y = target.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        // Show all chips as inactive
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    });

    // --------- Shopping Cart ---------
    const CART_KEY = 'us_cart_v1';
    const Cart = {
        items: [],
        load() {
            try {
                this.items = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
                if (!Array.isArray(this.items)) this.items = [];
            } catch { this.items = []; }
        },
        save() {
            localStorage.setItem(CART_KEY, JSON.stringify(this.items));
        },
        has(productId) {
            return this.items.some(i => i.id === productId);
        },
        find(productId) {
            return this.items.find(i => i.id === productId);
        },
        add(product) {
            const existing = this.find(product.id);
            if (existing) {
                existing.qty += 1;
            } else {
                this.items.push({
                    id: product.id,
                    name: product.name,
                    price: product.price || '',
                    image: (product.images && product.images[0]) || '',
                    qty: 1
                });
            }
            this.save();
            this.render();
            updateCartButtons();
            showToast(existing ? 'Quantity updated' : 'Added to cart', 'success');
        },
        remove(productId) {
            this.items = this.items.filter(i => i.id !== productId);
            this.save();
            this.render();
            updateCartButtons();
        },
        updateQty(productId, qty) {
            const item = this.find(productId);
            if (!item) return;
            item.qty = Math.max(1, parseInt(qty) || 1);
            this.save();
            this.render();
        },
        clear() {
            this.items = [];
            this.save();
            this.render();
            updateCartButtons();
        },
        itemCount() {
            return this.items.reduce((sum, i) => sum + i.qty, 0);
        },
        estimatedTotal() {
            let total = 0;
            let hasOnRequest = false;
            this.items.forEach(i => {
                const p = parsePrice(i.price);
                if (p > 0) total += p * i.qty;
                else hasOnRequest = true;
            });
            return { total, hasOnRequest };
        },
        render() {
            const badge = $('#cartBadge');
            const count = this.itemCount();
            badge.textContent = count;
            badge.classList.toggle('active', count > 0);
            badge.style.display = count > 0 ? 'flex' : 'none';
            // Sync mobile bottom-nav cart badge
            const mbnBadge = $('#mbnCartBadge');
            if (mbnBadge) {
                mbnBadge.textContent = count;
                mbnBadge.style.display = count > 0 ? 'flex' : 'none';
            }

            const body = $('#cartBody');
            const footer = $('#cartFooter');
            const countLabel = $('#cartCount');

            if (!this.items.length) {
                body.innerHTML = `
                    <div class="cart-empty">
                        <i class="fas fa-shopping-bag"></i>
                        <h4>Your cart is empty</h4>
                        <p>Browse our categories and add items to your cart.</p>
                    </div>
                `;
                footer.style.display = 'none';
                countLabel.textContent = '';
                return;
            }

            countLabel.textContent = `(${count})`;
            footer.style.display = 'block';

            body.innerHTML = this.items.map(item => {
                const priceHtml = /on request|poa|call/i.test(item.price) || !item.price || parsePrice(item.price) === 0
                    ? `<div class="ci-price on-request">Price on Request</div>`
                    : `<div class="ci-price">${esc(item.price)}${item.qty > 1 ? ` × ${item.qty}` : ''}</div>`;
                const imgStyle = item.image ? `style="background-image:url('${esc(item.image)}')"` : '';
                const imgInner = item.image ? '' : '<i class="fas fa-box"></i>';
                return `
                    <div class="cart-item">
                        <div class="cart-item-img" ${imgStyle}>${imgInner}</div>
                        <div class="cart-item-info">
                            <h5>${esc(item.name)}</h5>
                            ${priceHtml}
                            <div class="cart-qty">
                                <button data-qty-dec="${esc(item.id)}" aria-label="Decrease">−</button>
                                <span>${item.qty}</span>
                                <button data-qty-inc="${esc(item.id)}" aria-label="Increase">+</button>
                            </div>
                        </div>
                        <button class="cart-remove" data-remove="${esc(item.id)}" aria-label="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }).join('');

            const { total, hasOnRequest } = this.estimatedTotal();
            $('#cartItemsCount').textContent = count;
            $('#cartTotal').textContent = total > 0
                ? `MK ${total.toLocaleString()}${hasOnRequest ? ' + items on request' : ''}`
                : 'Price on Request';
        },
        open() {
            $('#cartDrawer').classList.add('active');
            $('#cartOverlay').classList.add('active');
            $('#cartDrawer').setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        },
        close() {
            $('#cartDrawer').classList.remove('active');
            $('#cartOverlay').classList.remove('active');
            $('#cartDrawer').setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        },
        checkout() {
            if (!this.items.length) return;
            const { total, hasOnRequest } = this.estimatedTotal();
            const lines = this.items.map((it, idx) => {
                const priceLine = parsePrice(it.price) > 0
                    ? `${it.price} (x${it.qty})`
                    : `Price on Request (x${it.qty})`;
                return `${idx + 1}. *${it.name}* — ${priceLine}`;
            });
            const totalLine = total > 0
                ? `\n*Estimated Total:* MK ${total.toLocaleString()}${hasOnRequest ? ' + items on request' : ''}`
                : '\n*Total:* To be confirmed';
            const msg = `Hello ${state.settings.businessName || 'Uniform Solution'}!\n\nI would like to order the following:\n\n${lines.join('\n')}\n${totalLine}\n\nPlease confirm availability and final pricing. Thank you!`;
            window.open(waLink(state.settings.whatsappNumber, msg), '_blank');
        }
    };

    // Toast notification
    function showToast(message, type = 'info') {
        let stack = $('#toastStack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'toastStack';
            stack.style.cssText = 'position:fixed;top:90px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
            document.body.appendChild(stack);
        }
        const toast = document.createElement('div');
        const colors = { success: '#22c55e', error: '#ef4444', info: '#0ea5e9' };
        toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;font-size:.9rem;box-shadow:0 10px 30px rgba(0,0,0,.2);transform:translateX(120%);transition:transform .3s;pointer-events:auto;display:flex;align-items:center;gap:10px;`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
        stack.appendChild(toast);
        setTimeout(() => toast.style.transform = 'translateX(0)', 20);
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Cart event wiring
    Cart.load();
    Cart.render();

    $('#cartBtn').addEventListener('click', () => Cart.open());
    // Mobile bottom-nav cart button
    const mbnCart = $('#mbnCartBtn');
    if (mbnCart) mbnCart.addEventListener('click', () => Cart.open());

    // Mobile bottom-nav active state on scroll
    const mbnItems = $$('.mbn-item[data-nav]');
    const sections = ['home', 'products', 'categories'].map(id => document.getElementById(id)).filter(Boolean);
    function updateMbnActive() {
        const scrollY = window.scrollY + 120;
        let active = 'home';
        sections.forEach(sec => { if (sec.offsetTop <= scrollY) active = sec.id; });
        mbnItems.forEach(it => it.classList.toggle('active', it.dataset.nav === active));
    }
    if (sections.length) {
        window.addEventListener('scroll', updateMbnActive, { passive: true });
        updateMbnActive();
    }

    // Wire WhatsApp link in bottom nav
    const mbnWa = $('#mbnWa');
    if (mbnWa) {
        const waNum = (window.SITE_DATA && window.SITE_DATA.settings && window.SITE_DATA.settings.whatsappNumber) || '265990162150';
        mbnWa.href = `https://wa.me/${waNum}`;
    }
    $('#cartClose').addEventListener('click', () => Cart.close());
    $('#cartOverlay').addEventListener('click', () => Cart.close());
    $('#btnCheckout').addEventListener('click', () => Cart.checkout());
    $('#btnClearCart').addEventListener('click', () => {
        if (confirm('Remove all items from cart?')) Cart.clear();
    });

    // Delegate cart interactions
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-add-cart]');
        if (addBtn) {
            const pid = addBtn.dataset.addCart;
            if (Cart.has(pid)) { Cart.open(); return; }
            const product = state.products.find(p => p.id === pid);
            if (product) Cart.add(product);
            return;
        }
        const rmBtn = e.target.closest('[data-remove]');
        if (rmBtn) { Cart.remove(rmBtn.dataset.remove); return; }
        const incBtn = e.target.closest('[data-qty-inc]');
        if (incBtn) {
            const item = Cart.find(incBtn.dataset.qtyInc);
            if (item) Cart.updateQty(item.id, item.qty + 1);
            return;
        }
        const decBtn = e.target.closest('[data-qty-dec]');
        if (decBtn) {
            const item = Cart.find(decBtn.dataset.qtyDec);
            if (item) Cart.updateQty(item.id, item.qty - 1);
            return;
        }
    });

    // ESC closes cart
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && $('#cartDrawer').classList.contains('active')) {
            Cart.close();
        }
    });

    // --------- Search ---------
    const searchForm = $('#searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = $('#searchInput').value.trim().toLowerCase();
            if (!q) { activeFilter = 'all'; renderFeatured(); return; }
            // Filter products client-side and render
            const grid = $('#featuredGrid');
            const filterBar = $('#featuredFilter');
            const matches = state.products.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
            filterBar.innerHTML = `
                <button class="filter-chip active" style="pointer-events:none;">
                    <i class="fas fa-search"></i> Results for "${esc(q)}" <span class="chip-count">${matches.length}</span>
                </button>
                <button class="filter-chip" data-filter="all"><i class="fas fa-times"></i> Clear</button>
            `;
            if (!matches.length) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i><br>
                        <h3 style="color:var(--dark);margin-bottom:10px;">No products found for "${esc(q)}"</h3>
                        <p>Try a different search term or browse by category.</p>
                    </div>
                `;
            } else {
                grid.innerHTML = matches.map(p => renderProductCard(p)).join('');
                updateCartButtons();
            }
            const target = $('#products');
            if (target) {
                const y = target.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    }

    // --------- Newsletter ---------
    const newsletterForm = $('#newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = $('#newsletterEmail').value.trim();
            if (!email) return;
            const msg = `Hello! Please subscribe me to your newsletter.\n\nEmail: ${email}`;
            window.open(waLink(state.settings.whatsappNumber, msg), '_blank');
            showToast('Thanks! Redirecting to WhatsApp...', 'success');
            newsletterForm.reset();
        });
    }

    // --------- All Categories button → scroll to categories (desktop) / toggle menu (mobile) ---------
    const catAllBtn = $('#catMenuAll');
    const catMenuLinks = $('#catMenuLinks');
    if (catAllBtn) {
        catAllBtn.addEventListener('click', () => {
            // Check if we're on mobile (catMenuLinks exists and is hidden by default on mobile)
            if (window.innerWidth <= 768 && catMenuLinks) {
                catMenuLinks.classList.toggle('active');
                catAllBtn.classList.toggle('active');
            } else {
                // Desktop: scroll to categories
                const target = $('#categories');
                if (target) {
                    const y = target.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
        });
    }

    // --------- Mobile Navigation (event-delegated for reliability) ---------
    function openMobileNav() {
        const drawer = $('#mobileNavDrawer');
        const overlay = $('#mobileNavOverlay');
        if (!drawer) { console.warn('[nav] drawer not found'); return; }
        drawer.classList.add('active');
        if (overlay) overlay.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
        const drawer = $('#mobileNavDrawer');
        const overlay = $('#mobileNavOverlay');
        if (drawer) {
            drawer.classList.remove('active');
            drawer.setAttribute('aria-hidden', 'true');
        }
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Single document-delegated handler — works even if elements are re-rendered
    document.addEventListener('click', (e) => {
        if (e.target.closest('#mobileMenuBtn')) {
            e.preventDefault();
            openMobileNav();
            return;
        }
        if (e.target.closest('#mobileNavClose') || e.target.closest('#mobileNavOverlay')) {
            e.preventDefault();
            closeMobileNav();
            return;
        }
        if (e.target.closest('.mobile-nav-link')) {
            // Allow link to navigate, then close drawer
            setTimeout(closeMobileNav, 50);
        }
    });

    // Close mobile nav on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const drawer = $('#mobileNavDrawer');
            if (drawer && drawer.classList.contains('active')) closeMobileNav();
        }
    });

    // Expose for debugging
    window.openMobileNav = openMobileNav;
    window.closeMobileNav = closeMobileNav;

    // --------- Back to top ---------
    const toTop = $('#toTop');
    window.addEventListener('scroll', () => {
        toTop.classList.toggle('active', window.scrollY > 600);
    });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // --------- Init ---------
    load();

    // Refresh when the admin tells us content changed (same-origin)
    window.addEventListener('focus', () => {
        // soft reload data if user comes back from admin tab
        load();
    });
})();
