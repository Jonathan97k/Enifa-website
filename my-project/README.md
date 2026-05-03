# Uniform Solution — Local Admin + Website

A single Node.js + Express application that hosts the **public website** and a **local admin portal** side-by-side. Both read and write the **same** JSON file (`data/products.json`), so whatever you see in the admin is exactly what visitors see on the site.

---

## What's inside

```
my-project/
├── server.js                   ← Express API + static hosting
├── package.json
├── .gitignore
├── README.md
├── data/
│   └── products.json           ← single source of truth
│       • settings   (WhatsApp, location, hours, hero text…)
│       • categories (id, title, icon, description, images[])
│       • products   (id, name, categoryId, price, description, images[])
└── public/
    ├── index.html              ← public website
    ├── app.js                  ← website rendering + routing
    ├── images/                 ← uploaded photos live here
    └── admin/
        ├── index.html          ← admin portal UI
        ├── admin.css
        └── admin.js
```

---

## Install

Requires **Node 18+**.

```bash
npm install
```

## Start

```bash
node server.js
```

```
  Website : http://localhost:3000
  Admin   : http://localhost:3000/admin
```

---

## How the website & admin stay in sync

The admin and the website are two faces of the same data:

| What the admin manages | Where it shows on the website |
|---|---|
| **Settings** → business name, tagline, WhatsApp, location, phones, hours, hero text, about text | Navbar, hero, contact, about, footer — everywhere |
| **Categories** → title, icon, description, image(s) | "What We Offer" grid on home page + hero badges + category detail view |
| **Products** → name, category, price, description, image(s) | Inside the category they're filed under (click a category card to see them) |

The admin's product form has a **Category dropdown populated from your Categories** — so naming stays consistent across the site with zero confusion.

---

## Using the admin

### Categories
- Click **New Category** → fill in Title, Icon (any emoji), Description.
- Upload **one or more images**. The first image is the cover; the rest appear in the card's photo gallery on the site (📷 badge shows total).
- Click **Save Category**.
- To edit: **Edit** button on the card. To delete: **Delete** button (products in that category become "uncategorized", not deleted).

### Products
- Click **New Product**.
- Pick the **Category** from the dropdown (this is the link to where it will appear).
- Fill in name, price, description, and upload image(s).
- Use the filter bar above the list to show only products in a given category.

### Site Settings
- WhatsApp number in international format **without the +** (e.g. `265983445704`). Every WhatsApp button on the site auto-updates.
- Phones: one number per line.
- Hero headline / subheadline / about text all propagate to the site immediately.

### Images
- Each form has a drag-style upload zone. You can add **multiple** images per entry.
- Existing images appear as thumbnails with a ✕ to remove them.
- New uploads appear with a green "new" badge until you click Save.
- Orphan image files are auto-deleted from `public/images/` when no longer referenced anywhere.

---

## How the public website uses the data

- On load, fetches **`/api/data`** (served from the same Express app).
- **Hero badges** and the **category grid** render from `categories`.
- When someone clicks a category card — or a hero badge, footer link, or "Our Specialties" tile — the URL changes to `#category=<id>` and the site shows that category's detail view: hero banner + all products filed under it.
- Each product card has a **Order on WhatsApp** button pre-filled with the product name.
- Multi-image products open a full-screen lightbox gallery (prev/next, thumbnails, Esc/arrow keys).
- The browser **Back** button works (hash routing).

Everything is driven by `data/products.json`, no page rebuild needed.

---

## Pushing to GitHub

> One-time setup: this folder must be a git repo with a remote and credentials that work without prompting (SSH key or Git Credential Manager / PAT).

```bash
git init
git remote add origin git@github.com:<you>/<repo>.git
git branch -M main
git add .
git commit -m "initial"
git push -u origin main
```

Then from the admin sidebar → **Push to GitHub**:
1. Click **Refresh status** to see what's changed.
2. (Optional) Edit the commit message.
3. Click **Push to GitHub**. The command's stdout/stderr appears in the Output panel.

The command run is:

```bash
git add . && git commit -m "<your message>" && git push
```

---

## API reference

All endpoints are JSON. Uploads are `multipart/form-data`.

| Method | Path                           | Purpose                               |
|--------|--------------------------------|---------------------------------------|
| GET    | `/api/data`                    | Everything (settings + categories + products). |
| GET    | `/api/settings`                | Just settings.                        |
| PUT    | `/api/settings`                | Save settings (JSON body).            |
| GET    | `/api/categories`              | List categories.                      |
| POST   | `/api/categories`              | Add category. Multipart: `title`, `icon`, `description`, `images[]`, `existingImages` (JSON array). |
| PUT    | `/api/categories/:id`          | Update category. Same multipart shape. |
| DELETE | `/api/categories/:id`          | Remove category (unfiles its products). |
| GET    | `/api/products?categoryId=...` | List products (optionally filtered).  |
| POST   | `/api/products`                | Add product. Multipart: `name`, `categoryId`, `price`, `description`, `images[]`, `existingImages`. |
| PUT    | `/api/products/:id`            | Update product.                       |
| DELETE | `/api/products/:id`            | Remove product.                       |
| GET    | `/api/git/status`              | `git status --short --branch`.        |
| POST   | `/api/git/push`                | Commit & push (JSON body: `message`). |

---

## Notes

- Max upload size: **10 MB** per image. Image MIME types only.
- Don't run two admin tabs simultaneously — writes are synchronous.
- The `public/images/` folder is tracked by git on purpose, so pushing uploads is part of the normal flow.
- You can hand-edit `data/products.json` if ever needed — the schema is plain JSON.
