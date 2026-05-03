# Uniform Solution & General Dealers — Website

A static website for **Uniform Solution & General Dealers** (Area 49 Shire, Lilongwe, Malawi).
All visible products, categories, and business info are driven by a single file: `products.json`.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The website itself (layout, styles, and rendering logic). |
| `products.json` | **Edit this** to add, change, or remove products and categories. |
| `Images/` | Product and hero-slide images. Add new images here. |
| `README.md` | This file. |

---

## How to add / edit / remove products

Everything the visitor sees in the **"What We Offer"** and **"Featured Products"** sections comes from `products.json`. To make a change:

1. Open `products.json` (on GitHub: click the file → click the pencil ✏️ icon).
2. Edit the JSON (see examples below).
3. Save / **Commit changes**.
4. Within a minute, the live site updates automatically.

> Tip: Before committing, paste the JSON into <https://jsonlint.com> to check for typos. A missing comma or quote will break the page.

### Structure of `products.json`

```json
{
  "settings": {
    "whatsappNumber": "265983445704",
    "businessName": "Uniform Solution & General Dealers",
    "location": "Area 49 Shire, Shop #30, Lilongwe, Malawi",
    "phones": ["0983 445 704", "0990 162 150"],
    "hours": "Mon-Sat: 7:30 AM - 6:00 PM"
  },
  "categories": [ /* the 9 big cards under "What We Offer" */ ],
  "products":   [ /* the cards under "Featured Products"    */ ]
}
```

### Adding a new category (top "What We Offer" section)

Add a new object to the `categories` array:

```json
{
  "id": "caps-hats",
  "title": "Caps & Hats",
  "icon": "🧢",
  "description": "Branded and plain caps for schools, companies and events.",
  "images": [
    "Images/Caps 1.jpg",
    "Images/Caps 2.jpg"
  ]
}
```

Fields:
- `id` — a short unique slug (letters, numbers, dashes). Any value, just keep it unique.
- `title` — what visitors see.
- `icon` — an emoji used when no images are provided.
- `description` — 1–2 sentences.
- `images` *(optional)* — array of paths inside `Images/`. The first is the thumbnail; clicking the card opens all of them in a gallery. Use a single-item array for one photo. The legacy `"image": "..."` (string) field is also still supported.

### Adding a new featured product

Add a new object to the `products` array:

```json
{
  "id": "corporate-shirt",
  "name": "Corporate Shirt",
  "icon": "👔",
  "images": [
    "Images/Corporate Shirt 1.jpg",
    "Images/Corporate Shirt 2.jpg",
    "Images/Corporate Shirt 3.jpg"
  ],
  "description": "Tailored cotton shirts with optional logo embroidery.",
  "price": "From MWK 15,000"
}
```

Fields:
- `name` — product title.
- `images` *(optional)* — **array** of photo paths. The first one is the cover photo shown on the card; visitors who click the card see all of them in a full-screen gallery with prev/next arrows and thumbnails. Upload each photo to the `Images/` folder first.
- `image` *(optional, legacy)* — single photo path; still supported for back-compat. Use `images` instead for new entries.
- `icon` — emoji shown when there are no images.
- `description` — short description.
- `price` — e.g. `"Price on Request"` or `"From MWK 20,000"`.

> Cards with more than one image automatically show a **📷 N** badge and a "click to enlarge" cursor. Categories support the same `images` field.

### Removing a product or category

Delete its `{ ... }` block from the array (including the trailing comma).

### Reordering

The order items appear in `products.json` is the order they appear on the site. Cut & paste to rearrange.

---

## Changing the WhatsApp number or business info

Edit the `settings` block in `products.json`:

```json
"settings": {
  "whatsappNumber": "265983445704",
  ...
}
```

The `whatsappNumber` must be in international format **without the `+`** (Malawi = `265` + the number without the leading `0`). Example: `0983 445 704` → `265983445704`.

All WhatsApp buttons across the site (hero, cards, floating button, order form) will use this number automatically.

---

## Adding product images

1. Save your photo inside the `Images/` folder. Keep file names simple (e.g. `Corporate Shirt.jpg`).
2. Reference it from `products.json` using the path `Images/Corporate Shirt.jpg`.
3. Recommended size: 600–1000 px wide, under 300 KB for fast loading.

---

## Running locally (for testing)

Because the site fetches `products.json`, opening `index.html` directly with `file://` **will not work** in most browsers. Use any simple static server:

```bash
# with Python 3
python -m http.server 8000

# or with Node.js
npx serve .
```

Then open <http://localhost:8000>.

When deployed to GitHub Pages, Netlify, Vercel, or any static host, it just works.

---

## Deployment

This is a pure static site — no backend. Push to any static host:

- **GitHub Pages**: enable Pages on the `main` branch, root folder.
- **Netlify / Vercel / Cloudflare Pages**: connect the repo, no build command, publish directory = repo root.

Changes to `products.json` on the main branch trigger an automatic redeploy.
