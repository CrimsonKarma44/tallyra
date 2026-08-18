# Ledger — POS Transaction Web App

A small web app that replaces a paper sales book. Agents record point-of-sale transactions with line items; the app computes and stores subtotal, tax, and total. Other services can keep the same ledger through a versioned REST API.

This is the SD-01 capstone MVP: **CRUD**, **totals**, **simple auth**, **HTTP API**, and a **runnable / deployable** repo. A demo video is not included.

## Features

- Sign in with a seeded agent account, or create a new agent account
- Create, list, view, edit, and delete sales
- Personal accounts see only their own sales; organization members share one ledger
- Organizations: create one at sign-up, then the admin adds member accounts
- Expenses (`/expenses`): record money going out, shared across the org like the sales ledger
- Sales dashboard analytics: revenue, expenses, and net totals; a revenue-vs-expenses line chart; per-agent breakdown for orgs; best-selling items
- Multiple line items per sale (name, quantity, unit price)
- Server-side totals in integer cents
- Search by item, note, or agent; filter by date
- Scan a receipt photo on a separate page, then review and save
- Optional receiver (name/company, account number, contact, address)
- User settings (`/settings`): profile picture, display name, and password change
- Profile picture shown in the top bar
- Organizations at `/org`: shared ledger plus an admin who adds member accounts
- Signup email verification, forgot-password reset, and org alert emails via optional SMTP (auto-verified when SMTP is unset)
- Emails are unique per context: one account per email within each org, one personal account per email, unique company emails
- REST API (`/api/v1`) so other services can read and write the same ledger
- SQLite file storage (no external database)

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite
- iron-session cookie auth
- Docker Compose for one-command deploy

## Quick start (local)

Requires Node 22+.

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Logged-out visitors see a welcome page. After sign-in, the Sales dashboard is at `/sales`.

Default seeded login (change these in `.env`), or create a new account at `/signup`:

| Field | Value |
|---|---|
| Username | `agent` |
| Password | `changeme` |

### Sign-up options

At `/signup` you pick an account type:

- **Personal** — your own private sales book (each agent sees only their own sales).
- **Create an organization** — you become the org's **admin** and its first member. Every member shares one ledger at `/sales`, and the list shows who recorded each sale (Agent column). The admin adds member accounts from the **Organization** page (`/org`); members can view all org sales but only edit/delete their own.

Both options require an email address. When SMTP is configured, the account must be verified by the emailed code before the banner clears.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma SQLite path. Local default: `file:./dev.db` (file at `prisma/dev.db`) |
| `AUTH_USERNAME` | Seeded agent username |
| `AUTH_PASSWORD` | Seeded agent password (re-hashed on each seed) |
| `SESSION_SECRET` | Cookie signing key, **at least 32 characters** |
| `APP_CURRENCY` | Display currency, default `PHP` |
| `GEMINI_API_KEY` | Gemini key for receipt scan. Optional; manual entry works without it |
| `GEMINI_MODEL` | Vision model, default `gemini-3.7-flash` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | SMTP for reset/verification/alert emails. Unset → accounts auto-verified, no emails |
| `SMTP_PORT` | Default `587` (STARTTLS) |
| `SMTP_SECURE` | `false` for STARTTLS, `true` for implicit TLS (465) |
| `SMTP_FROM` | Sender address; defaults to `SMTP_USER` |

When SMTP is configured, sign-up requires a verifiable email: a 6-digit code is emailed and accounts show a "verify your email" banner until confirmed (`/verify-email`, code valid 60 min). Forgot-password flow: `/forgot-password` → 6-digit reset code (valid 15 min, single-use, max 5 attempts) → `/reset-password`. Org admins also get alerts when a member is added or signs in.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The app listens on [http://localhost:3000](http://localhost:3000). Sales persist in the `pos-data` volume at `/data/pos.db`.

## Optional public host

Use the same Dockerfile on Railway, Render, or Fly. Attach a persistent disk at `/data` and set:

```
DATABASE_URL=file:/data/pos.db
AUTH_USERNAME=...
AUTH_PASSWORD=...
SESSION_SECRET=...   # 32+ random characters
APP_CURRENCY=PHP
```

## Data model

- **User** — agent account (`username`, `passwordHash`, optional `displayName` and avatar image bytes, optional `organizationId`); seeded on first setup, or created via `/signup`
- **Organization** — shared ledger (`name`, `adminId`, `members`); created at sign-up, members added by the admin
- **Transaction** — `soldAt`, `note`, `taxRateBps`, stored cents totals, optional receiver fields, `createdBy`
- **TransactionLine** — `name`, `quantity`, `unitPriceCents`, `lineTotalCents`
- **Expense** — money going out (`spentAt`, `amountCents`, `note`, `createdBy`); shares the same visibility rules as sales

Money is stored as integer cents. The server always recomputes totals on create/update; client-sent totals are ignored.

### Ledger visibility

- **Personal accounts** only see, edit, and delete their own sales.
- **Organization members** share the org's full ledger for viewing; only the **admin** can edit/delete any member's sale, while other members can only edit/delete their own.
- **Expenses** follow the same rules: personal accounts see their own; org members share the org's expenses (delete is admin-only for other people's, otherwise your own).
- The same rules apply to the REST API: each token is scoped to its user's visibility.

### Analytics

The sales dashboard (`/sales`) computes analytics from the ledger in the caller's visibility scope (own data for personal accounts, the whole org for members) and the current date filter:

- **Stat cards**: Revenue, Expenses, Net, Sales count, Average per sale, Items sold
- **Revenue vs expenses** line chart (last 30 days by default, or the chosen date range)
- **By agent** (organizations only): incoming (sales), outgoing (expenses), and net for each member
- **Top items**: the five best-selling items by quantity

Expenses are recorded on `/expenses` (date, amount, note); totals are shown per listed row and aggregate into the dashboard analytics.

### User settings

`/settings` (requires sign-in) lets an agent:
- Upload a **profile picture** (JPEG, PNG, or WebP, up to 2MB). The image is stored as a BLOB on the user row and shown in the top bar; remove it anytime.
- Set a **display name** (shown in the top bar; blank falls back to the username).
- **Change the password** (verify the current password first; minimum 8 characters).

### Totals

```
lineTotal = quantity × unitPrice
subtotal  = sum(lineTotal)
tax       = round(subtotal × taxRate)
total     = subtotal + tax
```

Tax rate is entered as a percent (e.g. `12`) and stored as basis points (`1200`). Default tax is `0`.

## HTTP API

Base URL: `http://localhost:3000/api/v1`

Other services authenticate with a bearer token from login (or signup). Tokens are HMAC-signed with `SESSION_SECRET` and last **7 days**. CORS is open on these routes.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/health` | no | Liveness |
| `POST` | `/api/v1/auth/login` | no | `{ username, password }` → `{ token, userId, username }` |
| `POST` | `/api/v1/auth/signup` | no | Create an agent and return a token (`email` is required) |
| `GET` | `/api/v1/me` | yes | Current token user |
| `GET` | `/api/v1/sales` | yes | List the sales visible to the caller (`q`, `from`, `to` query params) |
| `GET` | `/api/v1/sales/:id` | yes | One sale visible to the caller |
| `POST` | `/api/v1/sales` | yes | Create a sale |
| `PATCH` | `/api/v1/sales/:id` | yes | Replace a sale the caller may edit |
| `DELETE` | `/api/v1/sales/:id` | yes | Delete a sale the caller may edit |

Send `Authorization: Bearer <token>` and `Content-Type: application/json`. Amounts in JSON are currency units (not cents). The server always recomputes totals. Each token can only read what the same visibility rules allow (own sales for personal accounts, the whole org ledger for members) and can only edit/delete sales it's allowed to edit (own sales, or any org sale for the org admin); anything else returns `404 Sale not found.`

### Create a sale

```bash
TOKEN=$(curl -sS http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"agent","password":"changeme"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

curl -sS http://localhost:3000/api/v1/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "soldAt": "2026-08-18T11:05:00",
    "taxRate": 12,
    "note": "API restock",
    "receiverName": "Acme Store",
    "receiverAccount": "ACC-1001",
    "lines": [
      { "name": "Rice 5kg", "quantity": 2, "unitPrice": 285 },
      { "name": "Cooking oil 1L", "quantity": 1, "unitPrice": 95 }
    ]
  }'
```

Response money fields: `subtotal`, `tax`, `total`, and each line’s `unitPrice` / `lineTotal`. Receiver is `{ name, account, contact, address }` (null when omitted).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run db:setup` | Apply migrations and seed |
| `npm test` | Unit tests |
| `npm run verify` | Tests + typecheck + lint |
| `npm run build` / `npm start` | Production build |

## Verification checklist

1. Visit `/` while logged out → welcome landing (Sign in / Create account)
2. Visit `/sales` while logged out → redirected to `/login`
3. Wrong password → error, stay on login
4. Create an account at `/signup` → signed in as the new agent
5. Duplicate username or mismatched passwords → error, stay on signup
6. Default credentials → sales list at `/sales`
7. Record a two-line sale → list shows computed total
8. Edit quantity → stored total updates
9. Delete sale → gone from the list
10. Scan receipt (`/sales/scan`) opens an overlay; after a successful read the form is filled
11. Save a sale with or without receiver fields
12. Scan without a key → overlay error; Record sale still works
13. Log out → landing at `/`
14. `/settings` uploads a profile picture → it appears in the top bar; a bad file type is rejected
15. Set a display name → top bar shows it; change the password with the current password
16. Create an org at `/signup` → admin lands on `/sales`; `/org` shows the org and lets the admin add a member
17. A member added by the admin signs in → both admin and member see all org sales; a member editing another member's sale gets a read-only view; the admin can edit/delete any org sale
18. Personal accounts still can't see each other's sales (web and API)
19. `GET /api/v1/health` → `{ ok: true }`
20. Login via `/api/v1/auth/login`, create/list/update/delete a sale with the bearer token
21. Record an expense at `/expenses` → the sales dashboard Revenue/Expenses/Net cards update; a solo user never sees another user's expenses
22. Sales dashboard shows the revenue-vs-expenses chart and stat cards; an org member sees the per-agent breakdown; a solo user does not
23. Filter by date → cards, chart, by-agent table, and top items reflect the chosen range

## Receipt scan

**Record sale** (`/sales/new`) is a blank form. **Scan receipt** (`/sales/scan`) opens an overlay to pick a JPEG/PNG; after a successful read, the sale form appears already filled. Totals are computed from the extracted lines. Review before saving.

Receiver fields (name/company, account number, contact, address) are optional on every sale.

Create a key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY`. The key stays on the server. Without it, the scan panel explains that it is not configured and you can still type the sale.

## Project notes

Decisions and MVP status live in [`agent.md`](./agent.md).
