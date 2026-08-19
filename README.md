# Ledger — POS Transaction Web App

A small web app that replaces a paper sales book. Agents record point-of-sale transactions with line items; the app computes and stores subtotal, tax, and total. Other services can keep the same ledger through a versioned REST API.

This is the SD-01 capstone MVP: **CRUD**, **totals**, **simple auth**, **HTTP API**, and a **runnable / deployable** repo. A demo video is not included.

## Features

- Sign in with a seeded agent account, or create a new agent account
- Create, list, view, edit, and delete sales
- Personal accounts see only their own sales; organization members share one ledger
- Organizations: create one at sign-up, then the admin adds member accounts
- **Ledger switch** (org admins only): flip between the organization ledger and your own personal book from the top bar
- **Migrate entries** (org admins only): move sales/expenses between your personal and organization ledgers, all at once or a selected subset, in either direction
- **Sub-accounts** (added by an org admin): see only their own org entries; the admin sees the whole org ledger; sub-accounts cannot create organizations
- **Associated accounts**: a personal account sharing an email with an org sub-account lists the org and its username on `/settings`
- Expenses (`/expenses`): record money going out, shared across the org like the sales ledger
- Sales dashboard analytics: revenue, expenses, and net totals; a revenue-vs-expenses line chart; per-agent breakdown for orgs; best-selling items
- Multiple line items per sale (name, quantity, unit price)
- Server-side totals in integer cents
- Search by item, note, or agent; filter by date
- Scan a receipt photo on a separate page, then review and save
- Optional receiver (name/company, account number, contact, address)
- User settings (`/settings`): profile picture, display name, and password change
- Profile picture shown in the top bar
- Organizations at `/org`: shared ledger plus an admin who adds and removes member accounts, migrates entries between ledgers, and can delete the whole organization (password-confirmed; member records are reassigned to the admin, the admin keeps their account and becomes a personal account again)
- Personal accounts can create an organization from `/settings` (they become the org's **admin and first member immediately**) or join an existing one later from "Your organizations" (existing sales/expenses move into the shared ledger on join)
- Account deletion from `/settings`
- Signup email verification and org alert emails via optional SMTP: organization accounts are **blocked from the ledger until verified**; personal accounts are never blocked (banner + no password recovery until verified); a new organization email is verified with its own code before the admin can add members
- Forgot-password reset codes (valid 15 min) when the account's email is verified
- Account management: admins add/remove members and transfer admin; any user can delete their own account from `/settings`
- Emails are unique per context: one account per email within each org, one personal account per email, unique company emails
- REST API (`/api/v1`) so other services can read and write the same ledger (sales **and** expenses)
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

Both options require an email address. **Personal accounts** are never blocked from their ledger: when SMTP is configured they get a verification code email and a "verify your email" banner until confirmed, and an unverified personal account loses password recovery. **Organization accounts are enforced**: the creating admin (and any added member) is redirected to `/verify-email` and blocked from `/sales`, `/expenses`, `/org`, and the API until the emailed code is entered. When SMTP is unset, every new account is auto-verified and no emails are sent.

### Creating an organization from Settings

A personal account can create an organization from `/settings` → **Create an organization**. You become the org's **admin and its first member immediately**: your ledger switches to the org, so your existing sales/expenses are still visible and editable. A **Migrate existing entries?** checkbox moves everything you already recorded into the organization ledger at creation. The organization email is either your own address (same email) or a new address:

- **Same email** — verified right away if your account's email is verified; otherwise it becomes verified together with your account when you confirm your email.
- **New email** — a 6-digit code is emailed to it; the org shows "Email not verified" until it's confirmed. Until then the admin **cannot add members** and no member/login alerts are sent (the admin still uses their own ledger normally).

"Your organizations" lists every org you admin or that uses your email as its address, with verification status and a **Join** button. Joining moves your existing sales and expenses into the shared ledger. Once you belong to an org you can still keep a separate personal book: use the **ledger switch** in the top bar, and the **Migrate** controls on `/sales` and `/expenses` to move entries between ledgers. Your personal accounts cannot be created or controlled from the org side.

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

When SMTP is configured, a 6-digit code is emailed and accounts show a "verify your email" banner until confirmed (`/verify-email`, code valid 60 min). Organization accounts are **blocked from the ledger** until verified; personal accounts are not blocked but lose password recovery until verified. Organizations created with a **new email** send their own code to that address (verified from Settings → Your organizations or `/org`); until it's confirmed the admin can't add members and no alerts are sent. Forgot-password flow: `/forgot-password` → 6-digit reset code (valid 15 min, single-use, max 5 attempts) → enter the code and a new password inline on the same page (or `/reset-password?username=…`). Org admins also get alerts when a member is added or signs in. When SMTP is unset, every account is auto-verified and no emails are sent.

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

- **User** — agent account (`username`, `passwordHash`, optional `displayName` and avatar image bytes, optional `organizationId`, optional `createdByOrgId` marking an org-created sub-account); seeded on first setup, or created via `/signup`
- **Organization** — shared ledger (`name`, optional verified `email`, `adminId`, `members`); created at sign-up or from a personal account's Settings
- **Transaction** — `soldAt`, `note`, `taxRateBps`, stored cents totals, optional receiver fields, `createdBy`, and `ledgerOrgId` (null = the creator's personal ledger, otherwise the org ledger it belongs to)
- **TransactionLine** — `name`, `quantity`, `unitPriceCents`, `lineTotalCents`
- **Expense** — money going out (`spentAt`, `amountCents`, `note`, `createdBy`, `ledgerOrgId`); shares the same visibility rules as sales

Money is stored as integer cents. The server always recomputes totals on create/update; client-sent totals are ignored.

### Ledger visibility

- **Personal accounts** only see, edit, and delete their own sales.
- **Organization members** share the org's full ledger for viewing; only the **admin** can edit/delete any member's sale, while other members can only edit/delete their own.
- **Org admins** can also hold a separate **personal ledger**. The **ledger switch** in the top bar flips between the org and personal views; **Migrate** controls on `/sales` and `/expenses` move entries between the two (all, or a selected subset, in either direction).
- **Sub-accounts** (created by an org admin) have no personal ledger and no switch: they see only the org entries they recorded, never the admin's or other members' records. The admin still sees the whole org ledger including sub-account entries.
- **Expenses** follow the same rules: personal accounts see their own; org members share the org's expenses (delete is admin-only for other people's, otherwise your own); sub-accounts see only their own.
- **Unverified organization accounts** (created while SMTP is on) are blocked from the ledger until they verify their email; unverified personal accounts are only blocked from password recovery.
- The same rules apply to the REST API: each token is scoped to its user's visibility, and unverified org tokens get `403 Email not verified.` on ledger endpoints.

### Organization management

`/org` (org admins only) covers the org beyond the shared ledger:

- **Add member**: creates a sub-account that joins the org (see sub-account rules above).
- **Delete organization** (admins only): confirm with the admin's current password. The admin's own org entries move to their personal ledger; every member's sales/expenses are reassigned to the admin; member accounts and their tokens are deleted; the org is removed and the admin keeps a personal account.

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
- **Create an organization** (personal accounts only; sub-accounts cannot create organizations): become the admin and first member of a shared ledger immediately, with an optional "migrate existing entries" checkbox. See "Creating an organization from Settings".
- **Associated accounts** (personal accounts only): when a sub-account in an organization uses the same email, the org name and sub-account username are listed here read-only.
- **Your organizations**: orgs you admin or that use your email, with verification status and a Join action.
- **Delete the account** (confirm with the current password): a personal account's own sales/expenses are deleted with it; an org member's shared-ledger records are reassigned to the admin and their account is removed; the org admin can only delete their account after transferring admin to another member (if the admin is the only member, deleting deletes the whole org and its records). A personal account that created an org but hasn't joined it deletes the empty org along with the account.
- **Transfer admin** (org admins only): hand the organization to another member before deleting your account.

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
| `GET` | `/api/v1/expenses` | yes | List the expenses visible to the caller (`from`, `to` query params) |
| `GET` | `/api/v1/expenses/:id` | yes | One expense visible to the caller |
| `POST` | `/api/v1/expenses` | yes | Create an expense |
| `PATCH` | `/api/v1/expenses/:id` | yes | Replace an expense the caller may edit |
| `DELETE` | `/api/v1/expenses/:id` | yes | Delete an expense the caller may edit |

Send `Authorization: Bearer <token>` and `Content-Type: application/json`. Amounts in JSON are currency units (not cents). The server always recomputes totals. Each token can only read what the same visibility rules allow (own sales for personal accounts, the whole org ledger for members) and can only edit/delete sales it's allowed to edit (own sales, or any org sale for the org admin); anything else returns `404 Sale not found.` Organization tokens whose email is unverified get `403 Email not verified.` on all ledger endpoints. The same rules apply to expenses (`404 Expense not found.`).

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

### Create an expense

```bash
curl -sS http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "spentAt": "2026-08-18T09:00:00",
    "amount": 2500.00,
    "note": "Wholesale restock"
  }'
```

Response money field: `amount` (currency units); plus `id`, `spentAt`, `note`, `currency`, and `createdBy`.

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
24. Personal signup with SMTP on → verification email + banner, but the dashboard is still usable unverified; password reset (`/forgot-password`) sends nothing until the email is verified
25. Org signup with SMTP on → admin lands on `/verify-email` and `/sales` redirects back there until the code is entered; after verifying, the ledger and `/org` open up
26. A member added by the admin (SMTP on) is likewise blocked until they verify
27. `/settings` → delete a personal account with the current password → signed out, the account and its ledger are gone
28. Admin removes a member on `/org` → the member's sales/expenses are reassigned to the admin; the member can no longer sign in
29. Admin with members deletes their account → rejected until they transfer admin (settings) to another member; admin alone deletes their account → whole org + records removed
30. `POST /api/v1/expenses` creates an expense, it lists under `/api/v1/expenses` and shows in the dashboard; an unverified org token gets `403 Email not verified.`
31. Admin switches the top-bar ledger to **Personal** → `/sales` shows their personal book; switching back to the org shows the shared ledger
32. Admin uses **Migrate** on `/sales`/`/expenses`: move a selected entry, then move all remaining entries, to the other ledger; the entries follow the admin's switch and are gone from the original view
33. Admin adds a member; the sub-account signs in, sees only its own org entries, has **no ledger switch**, and `/settings` shows no "Create an organization"
34. A personal account whose email matches an org sub-account sees the org name + username under **Associated accounts** on `/settings`
35. Admin deletes the organization from `/org` (wrong password is rejected): sub-account gone, org gone, all records reassigned to the admin's personal ledger, admin is a personal account again

## Receipt scan

**Record sale** (`/sales/new`) is a blank form. **Scan receipt** (`/sales/scan`) opens an overlay to pick a JPEG/PNG; after a successful read, the sale form appears already filled. Totals are computed from the extracted lines. Review before saving.

Receiver fields (name/company, account number, contact, address) are optional on every sale.

Create a key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY`. The key stays on the server. Without it, the scan panel explains that it is not configured and you can still type the sale.

## Project notes

Decisions and MVP status live in [`agent.md`](./agent.md).
