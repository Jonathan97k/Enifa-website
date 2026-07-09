# Uniform Solution & General Dealers — Website

The public website + an owner admin portal at `/admin`. The owner logs in with
a username and password and can add, edit, or remove products and categories
directly from the live site — no developer needed for day-to-day updates.

## How it's built

- **Website + admin UI**: plain HTML/CSS/JS (`index.html`, `about.html`,
  `contact.html`, `app.js`, `styles.css`, `admin/`).
- **API**: Node.js + Express (`lib/app.js`, `routes/`, `models/`).
- **Database**: MongoDB — stores products, categories, site settings, and the
  owner's login (password is hashed, never stored in plain text).
- **Photos the owner uploads**: sent to Cloudinary and served from there.
  Photos already in this repo's `images/` folder keep working exactly as
  before — nothing needs to be re-uploaded.
- **Login**: a signed session cookie (JWT). Only she can add/edit/delete;
  everyone else can only view the site, same as before.

This app can run two ways — pick ONE:

| Option | Good for | Command |
|---|---|---|
| **A. Always-on server** (Render, Railway, a VPS) | Simplest to reason about, logs are easy to see | `npm start` |
| **B. Vercel** (serverless) | If you're already using Vercel for this repo | Just push to GitHub, Vercel builds automatically |

Both use the exact same code — `server.js` for option A, `api/index.js` for
option B (Vercel picks it up automatically because it lives in `/api`).

---

## One-time setup (do this once, ~20 minutes)

### 1. Create a free MongoDB Atlas database
1. Go to <https://www.mongodb.com/cloud/atlas/register> and create a free account.
2. Create a free "M0" cluster.
3. Database Access → add a user with a password (save it).
4. Network Access → allow access from anywhere (`0.0.0.0/0`) — simplest for a small site.
5. Database → Connect → Drivers → copy the connection string. It looks like:
   `mongodb+srv://user:password@cluster.mongodb.net/enifa?retryWrites=true&w=majority`

### 2. Create a free Cloudinary account (for new product photos)
1. Go to <https://cloudinary.com/users/register/free>.
2. On your Cloudinary dashboard, copy: **Cloud name**, **API Key**, **API Secret**.

### 3. Set your environment variables
Copy `.env.example` to `.env` (for local testing) and/or add the same values
in your host's dashboard (Render/Railway/Vercel all have an "Environment
Variables" settings page):

```
MONGODB_URI=...            (from step 1)
JWT_SECRET=...             (generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
CLOUDINARY_CLOUD_NAME=...  (from step 2)
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_USERNAME=...         (the owner's login username)
ADMIN_PASSWORD=...         (her initial password — she can change it later in /admin → Account)
```

**Never commit `.env` to GitHub** — `.gitignore` already excludes it.

### 4. Install dependencies and load the existing 53 products
```bash
npm install
npm run seed
```
This reads `data/products.json` (the current 8 categories / 53 products) into
MongoDB, and creates the owner's login from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
Safe to run again later — it won't duplicate data or overwrite an existing login.

---

## Option A — Always-on hosting (Render / Railway / a VPS)

1. Push this repo to GitHub as usual.
2. On Render.com (free tier works): New → Web Service → connect this repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Add the environment variables from step 3 above.
3. Also run `npm run seed` once against that environment (Render has a
   "Shell" tab for this, or run it locally against the same `MONGODB_URI`).
4. Done — visit `your-app.onrender.com/admin` to log in.

## Option B — Vercel

1. Push this repo to GitHub.
2. In Vercel, add the same environment variables (Project → Settings →
   Environment Variables).
3. Run `npm run seed` locally once, pointed at your real `MONGODB_URI`
   (Vercel doesn't give you a shell to run it there).
4. Redeploy. Visit `your-project.vercel.app/admin` to log in.

---

## Using the admin portal (for the owner)

1. Go to `/admin` on the live site.
2. Log in with the username/password set up above.
3. **Products** tab → "New Product" → fill in name, category, price, photos → Save.
   It appears on the live site immediately — no waiting, no developer needed.
4. **Categories** tab → same idea, for the big sections on the homepage.
5. **Site Settings** tab → business name, phone numbers, WhatsApp number, hours, etc.
6. **Account** tab → change your password any time.

## Local development
```bash
npm install
cp .env.example .env   # fill in your real values
npm run seed           # first time only
npm start
```
Visit `http://localhost:3000` and `http://localhost:3000/admin`.
