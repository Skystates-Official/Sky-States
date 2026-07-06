# 📘 Sky States — Complete Project Documentation

> **Sky States** ek career-driven technology education platform hai jo Data Science & AI, Cybersecurity & Ethical Hacking, aur DevOps & Cloud Computing programs provide karta hai.
> Live Site: [https://skystates.us](https://skystates.us)

---

## 📁 Project Structure (Overview)

```
sky_states/
├── src/
│   ├── components/       # Reusable Astro UI components
│   ├── data/             # Static JSON data files (content source)
│   ├── db/               # SQLite database + auth logic
│   ├── layouts/          # Page layout wrappers
│   ├── lib/              # Business logic helpers (Stripe, email, pricing)
│   ├── middleware.js      # Cache headers + legacy URL redirects
│   ├── pages/            # All routes (Astro SSR pages + API endpoints)
│   └── styles/           # Global CSS
├── public/               # Static assets (images, favicon, etc.)
├── .env                  # Secret environment variables (DO NOT COMMIT)
├── .env.example          # Template for .env (safe to share)
├── astro.config.mjs      # Astro framework configuration
├── tailwind.config.mjs   # Tailwind CSS design tokens
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker Compose setup
├── data.db               # SQLite database file (auto-created at runtime)
└── package.json          # NPM dependencies and scripts
```

---

## 🛠️ Tech Stack

| Category       | Technology                        |
|----------------|-----------------------------------|
| Framework      | Astro v4 (SSR mode)               |
| Styling        | Tailwind CSS v3                   |
| Server Adapter | `@astrojs/node` (standalone mode) |
| Database       | SQLite3 (`data.db`)               |
| Payments       | Stripe (Checkout + Webhooks)      |
| Email          | Nodemailer + Hostinger SMTP       |
| Auth           | Session-based (bcryptjs hashing)  |
| Deployment     | Docker + Docker Compose           |

---

## 🌐 Website Pages (Saare Routes)

### Public Pages

| Page | Route | File | Description |
|------|--------|------|-------------|
| Home | `/` | `pages/index.astro` | Hero, Programs, Features, Certificates |
| About | `/about` | `pages/about.astro` | Company info, team, mission |
| Data Science Program | `/programs/data-science-ai` | `pages/programs/data-science-ai.astro` | Full DS & AI program detail |
| Cybersecurity Program | `/programs/cyber-security` | `pages/programs/cyber-security.astro` | Cybersecurity program detail |
| DevOps Program | `/programs/devops` | `pages/programs/devops.astro` | DevOps & Cloud program detail |
| Contact | `/contact-us` | `pages/contact-us.astro` | Contact form |
| FAQ | `/faq` | `pages/faq.astro` | Frequently asked questions |
| Reviews | `/reviews` | `pages/reviews.astro` | Student reviews & testimonials |
| Stories | `/stories` | `pages/stories.astro` | Student success stories |
| Placements | `/placements` | `pages/placements.astro` | Job placement records |
| Live Jobs | `/live-jobs` | `pages/live-jobs.astro` | Real-time job listings |
| Instructors | `/instructors` | `pages/instructors.astro` | Instructor profiles |
| Certifications | `/certifications` | `pages/certifications.astro` | Certification programs list |
| Microsoft Partnership | `/microsoft-partnership` | `pages/microsoft-partnership.astro` | MS partnership details |
| News | `/news` | `pages/news.astro` | Industry news feed |
| Projects | `/projects` | `pages/projects.astro` | Student project showcase |
| Career Hub | `/career-hub` | `pages/career-hub.astro` | Career resources |
| Career ROI | `/career-roi` | `pages/career-roi.astro` | ROI calculator |
| Resume Hub | `/resume-hub` | `pages/resume-hub.astro` | Resume templates & tips |
| DS Interview Q&A | `/free-data-science-interview-questions` | `pages/free-data-science-interview-questions.astro` | Free prep resources |
| Privacy Policy | `/privacy-policy` | `pages/privacy-policy.astro` | Legal privacy page |
| Refund Policy | `/refund-policy` | `pages/refund-policy.astro` | Refund terms |

### Checkout Pages

| Page | Route | File | Description |
|------|--------|------|-------------|
| Checkout | `/checkout` | `pages/checkout.astro` | Stripe payment page |
| Checkout Success | `/checkout/success` | `pages/checkout/` | Post-payment confirmation |

### Admin Pages

| Page | Route | File | Description |
|------|--------|------|-------------|
| Admin Dashboard | `/admin` | `pages/admin.astro` | Full CMS admin panel |

### Dynamic Routes

| Pattern | File | Description |
|---------|------|-------------|
| `/stories/[slug]` | `pages/stories/` | Individual story page |
| `/about/[slug]` | `pages/about/` | Individual about sub-pages |
| `/[...slug]` | `pages/[...slug].astro` | Generic dynamic CMS pages |

---

## 🔌 API Endpoints (Backend Routes)

### User Management

| Method | URL | File | Description |
|--------|-----|------|-------------|
| GET | `/api/users` | `api/users.js` | Saare users list karo |
| POST | `/api/users` | `api/users.js` | Naya admin user create karo |
| PUT | `/api/users` | `api/users.js` | User update karo |
| DELETE | `/api/users` | `api/users.js` | User delete karo |

### Content / CMS

| Method | URL | File | Description |
|--------|-----|------|-------------|
| GET/POST/PUT/DELETE | `/api/pages` | `api/pages.js` | Dynamic CMS pages manage karo |
| GET/POST/PUT/DELETE | `/api/cms` | `api/cms.js` | CMS content blocks |
| GET/POST/PUT | `/api/homepage` | `api/homepage.js` | Homepage JSON content update |
| GET/POST/PUT/DELETE | `/api/stories` | `api/stories.js` | Stories JSON manage karo |
| GET/POST/PUT/DELETE | `/api/jobs` | `api/jobs.js` | Job listings manage karo |
| GET/POST | `/api/media` | `api/media.js` | Media/image upload & library |

### Payments (Stripe)

| Method | URL | File | Description |
|--------|-----|------|-------------|
| POST | `/api/payments/create-checkout-session` | `api/payments/create-checkout-session.js` | Stripe checkout session banao |
| POST | `/api/payments/create-intent` | `api/payments/create-intent.js` | Stripe payment intent banao |
| POST | `/api/payments/webhook` | `api/payments/webhook.js` | Stripe webhook handler |
| POST | `/api/payments/confirm-free` | `api/payments/confirm-free.js` | Free/zero-cost order confirm karo |

### Coupons & Validation

| Method | URL | File | Description |
|--------|-----|------|-------------|
| GET/POST/PUT/DELETE | `/api/coupons` | `api/coupons.js` | Coupon codes manage karo |
| POST | `/api/validate-coupon` | `api/validate-coupon.js` | Coupon code validate karo |

### Misc

| Method | URL | File | Description |
|--------|-----|------|-------------|
| POST | `/api/emi-request` | `api/emi-request.js` | EMI request form submit |
| GET | `/site-check.json` | `pages/site-check.json.js` | Server health check |

---

## 🗄️ Database Schema (SQLite — `data.db`)

Database file: **`data.db`** (project root me automatically banta hai jab server start hota hai)

### `users` — Admin Accounts
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
username      TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL          -- bcrypt hashed
role          TEXT DEFAULT 'editor'  -- 'admin' | 'editor'
created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `pages` — CMS Dynamic Pages
```sql
id                INTEGER PRIMARY KEY AUTOINCREMENT
title             TEXT NOT NULL
slug              TEXT UNIQUE NOT NULL
parent_id         INTEGER (FK → pages.id)
meta_title        TEXT
meta_description  TEXT
canonical_url     TEXT
content_blocks    TEXT     -- JSON string (page blocks array)
status            TEXT DEFAULT 'draft'   -- 'draft' | 'published'
published_at      DATETIME
created_at        DATETIME
updated_at        DATETIME
```

### `media` — Media Library
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
filename   TEXT NOT NULL
path       TEXT UNIQUE NOT NULL
mime_type  TEXT NOT NULL
size       INTEGER NOT NULL
alt_text   TEXT
title      TEXT
caption    TEXT
created_at DATETIME
```

### `jobs` — Job Listings
```sql
id         TEXT PRIMARY KEY
title      TEXT NOT NULL
company    TEXT NOT NULL
location   TEXT NOT NULL
salary     TEXT
tags       TEXT    -- JSON array e.g. ["Python", "Remote"]
status     TEXT DEFAULT 'active'
created_at DATETIME
```

### `orders` — Payment Orders
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
order_ref       TEXT UNIQUE NOT NULL   -- e.g. "SS-20240706-XXXX"
customer_email  TEXT NOT NULL
customer_name   TEXT NOT NULL
course_name     TEXT NOT NULL
total_due       REAL NOT NULL
amount_paid     REAL DEFAULT 0
status          TEXT DEFAULT 'open'    -- 'open' | 'paid' | 'partial'
checkout_mode   TEXT                   -- 'full' | 'intro' | 'registration'
tier            TEXT                   -- 'normal' | '1on1'
coupon_code     TEXT
created_at      DATETIME
updated_at      DATETIME
```

### `order_payments` — Individual Payment Transactions
```sql
id                INTEGER PRIMARY KEY AUTOINCREMENT
order_ref         TEXT NOT NULL (FK → orders.order_ref)
stripe_session_id TEXT
amount            REAL NOT NULL
payment_type      TEXT DEFAULT 'full'
payment_method    TEXT
created_at        DATETIME
```

### `coupons` — Discount Codes
```sql
id               INTEGER PRIMARY KEY AUTOINCREMENT
code             TEXT UNIQUE NOT NULL
discount_amount  REAL NOT NULL
description      TEXT
active           INTEGER DEFAULT 1    -- 1=active, 0=inactive
max_uses         INTEGER              -- NULL = unlimited
used_count       INTEGER DEFAULT 0
expires_at       DATETIME
created_at       DATETIME
```

### `forms` — Form Submissions
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
form_name  TEXT NOT NULL
data       TEXT NOT NULL    -- JSON stringified submission data
created_at DATETIME
```

### `settings` — Global Key-Value Settings
```sql
key   TEXT PRIMARY KEY
value TEXT NOT NULL
```

### `audit_logs` — Admin Action Logs
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
user_id    INTEGER (FK → users.id)
action     TEXT NOT NULL
details    TEXT
ip_address TEXT
created_at DATETIME
```

### `email_log` — Email Deduplication Log
```sql
id           INTEGER PRIMARY KEY AUTOINCREMENT
reference_id TEXT NOT NULL
email_type   TEXT NOT NULL
recipient    TEXT NOT NULL
sent_at      DATETIME
UNIQUE(reference_id, email_type)   -- ek hi email ek baar bhejo
```

---

## 🔐 Environment Variables (`.env` file)

**File location:** `sky_states/.env` (project root me)

> ⚠️ **IMPORTANT:** `.env` file ko kabhi GitHub pe push mat karo! Real Stripe live keys hain ismein.

```env
# ─── Site URL ────────────────────────────────────────────────
SITE_URL=https://skystates.us

# ─── Stripe Payment Keys ─────────────────────────────────────
# Dashboard: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_...         # Server-side secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...    # Client-side publishable key

# ─── Stripe Webhook ──────────────────────────────────────────
# Webhook Endpoint URL: https://skystates.us/api/payments/webhook
# Events: checkout.session.completed, checkout.session.async_payment_succeeded
# Dashboard: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Admin Panel Auth ────────────────────────────────────────
SESSION_SECRET=your_long_random_secret_string
ADMIN_USERNAME=support@skystates.us
ADMIN_PASSWORD=your_secure_password

# ─── Email (Hostinger SMTP) ──────────────────────────────────
# hPanel → Emails → Manage → Configuration settings
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=support@skystates.us
SMTP_PASS=your_email_password
SMTP_FROM=Sky States <support@skystates.us>
SMTP_REPLY_TO=support@skystates.us
```

### Kahan se milenge ye keys?

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_PUBLISHABLE_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | https://dashboard.stripe.com/webhooks |
| `SESSION_SECRET` | Koi bhi random 32+ character string |
| `SMTP_*` | Hostinger hPanel → Emails → Manage |

---

## 📦 Static Data Files (`src/data/`)

| File | Used By | Kya store hai |
|------|---------|---------------|
| `homepage.json` | `index.astro` | hero, trust_bar, about, why_choose, programs_section, learning_paths, methodology, pricing, certificate |
| `programs.json` | Program pages | Program details, curriculum, pricing tiers |
| `about.json` | `about.astro` | Team, mission, company info |
| `faq.json` | `faq.astro` | FAQ questions and answers |
| `stories.json` | `stories.astro` | Student success stories |
| `jobs.json` | `live-jobs.astro` | Fallback static job listings |
| `coupon-config.json` | Checkout | Default coupon configuration |
| `employer-logos.js` | Homepage marquee | Employer logo list |
| `program-tools.js` | Program pages | Tools/tech logos per program |

---

## 🧩 Components (`src/components/`)

| Component | Description |
|-----------|-------------|
| `Header.astro` | Navbar (mobile + desktop, dropdowns) |
| `Footer.astro` | Site footer with links, social icons |
| `Logo.astro` | Sky States logo SVG |
| `EmployerLogoMarquee.astro` | Auto-scrolling employer logos |
| `ToolLogoMarquee.astro` | Auto-scrolling tech tool logos |
| `Breadcrumbs.astro` | Page breadcrumb navigation |
| `ZohoSalesIQ.astro` | Zoho live chat widget |
| `SiteCacheGuard.astro` | Cache busting script injector |

---

## ⚙️ Business Logic (`src/lib/`)

| File | Purpose |
|------|---------|
| `stripe.js` | Stripe client initialize karo |
| `stripe-checkout.js` | Checkout session parameters build karo |
| `pricing.js` | Total calculate karo (coupon, mode, tier) |
| `orders.js` | Order reference generate karo + DB operations |
| `checkout.js` | Checkout page helper functions |
| `coupons.js` | Coupon validation logic |
| `email.js` | Nodemailer se email send karo |
| `legacy-redirects.js` | Purani URLs ko naye URLs pe 301 redirect |

---

## 🚀 NPM Commands

```bash
npm run dev       # Development server (localhost:4321)
npm run build     # Production build (dist/ folder)
npm run preview   # Build preview karo
```

---

## 🐳 Docker Deployment

```bash
# Start karo
docker-compose up -d

# Logs dekho
docker-compose logs -f

# Stop karo
docker-compose down
```

---

## 💳 Payment Flow (Stripe)

```
User → /checkout
  ↓
POST /api/validate-coupon          (agar coupon hai)
  ↓
POST /api/payments/create-checkout-session
  ↓  (Stripe URL return hota hai)
User → Stripe Hosted Checkout
  ↓  (payment complete)
Stripe → POST /api/payments/webhook
  ↓  (order: 'open' → 'paid')
Confirmation email sent
  ↓
User → /checkout/success
```

### Checkout Modes

| Mode | Description |
|------|-------------|
| `full` | Poora program fee ek baar |
| `intro` | Intro/demo session fee |
| `registration` | Registration fee only |

### Tiers

| Tier | Description |
|------|-------------|
| `normal` | Batch classes |
| `1on1` | Personalised 1-on-1 classes |

---

## 👤 Admin Panel (`/admin`)

| Feature | Description |
|---------|-------------|
| User Management | Admin/Editor users create, edit, delete |
| CMS Pages | Dynamic pages with content blocks |
| Stories | Student success stories add/edit/delete |
| Jobs | Job listings manage karo |
| Media Library | Images upload aur manage |
| Coupons | Discount codes create/activate/deactivate |
| Orders | Payment orders view karo |
| Homepage Content | JSON-based sections edit karo |
| Audit Logs | Admin action history |

**Login Details:**
- URL: `https://skystates.us/admin`
- Username: Value of `ADMIN_USERNAME` in `.env`
- Password: Value of `ADMIN_PASSWORD` in `.env`
- Default (agar env nahi set): `admin` / `Xziant@123`

---

## 🔒 Auth & RBAC

- **Session-based auth** — Signed session cookie
- **Password hashing** — bcryptjs (10 salt rounds)
- **Roles:**
  - `admin` — Full access (users, content, orders, settings)
  - `editor` — Content only (pages, stories, jobs, media)

---

## 📝 Developer Notes

> **Never commit `.env`** — Ismein real Stripe live keys aur SMTP passwords hain

> **`data.db` file** — Production database hai, git mein commit mat karo

> **Stripe Webhook** — Dashboard pe register karo: `https://skystates.us/api/payments/webhook`

> **SSR Mode** — Project `output: 'server'` hai, matlab har page request pe server render hota hai, static nahi

> **Homepage content** — `src/data/homepage.json` edit karo ya admin panel se update karo

> **New page add karna** — `src/pages/` mein `.astro` file banao, route automatically ban jaayega
