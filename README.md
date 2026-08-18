# Ledger — POS Transaction Web App

A small web app that replaces a paper sales book. Agents record point-of-sale transactions with line items; the app computes and stores subtotal, tax, and total. Other services can keep the same ledger through a versioned REST API.

This is the SD-01 capstone MVP: **CRUD**, **totals**, **simple auth**, **HTTP API**, and a **runnable / deployable** repo. A demo video is not included.

## Features

- Sign in with a seeded agent account, or create a new agent account
- Create, list, view, edit, and delete sales
- Multiple line items per sale (name, quantity, unit price)
- Server-side totals in integer cents
- Search by item, note, or agent; filter by date
- Scan a receipt photo on a separate page, then review and save
- Optional receiver (name/company, account number, contact, address)
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

Open [http://localhost:3000](http://localhost:3000). Logged-out visitors see a welcome page. After sign-in, the sales book is at `/sales`.

Default seeded login (change these in `.env`), or create a new account at `/signup`:

| Field | Value |
|---|---|
| Username | `agent` |
| Password | `changeme` |

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

- **User** — agent account (`username`, `passwordHash`); seeded on first setup, or created via `/signup`
- **Transaction** — `soldAt`, `note`, `taxRateBps`, stored cents totals, optional receiver fields, `createdBy`
- **TransactionLine** — `name`, `quantity`, `unitPriceCents`, `lineTotalCents`

Money is stored as integer cents. The server always recomputes totals on create/update; client-sent totals are ignored.

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
| `POST` | `/api/v1/auth/signup` | no | Create an agent and return a token |
| `GET` | `/api/v1/me` | yes | Current token user |
| `GET` | `/api/v1/sales` | yes | List sales (`q`, `from`, `to` query params) |
| `GET` | `/api/v1/sales/:id` | yes | One sale |
| `POST` | `/api/v1/sales` | yes | Create a sale |
| `PATCH` | `/api/v1/sales/:id` | yes | Replace a sale |
| `DELETE` | `/api/v1/sales/:id` | yes | Delete a sale |

Send `Authorization: Bearer <token>` and `Content-Type: application/json`. Amounts in JSON are currency units (not cents). The server always recomputes totals.

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
| `npm test` | Totals unit tests |
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
14. `GET /api/v1/health` → `{ ok: true }`
15. Login via `/api/v1/auth/login`, create/list/update/delete a sale with the bearer token

## Receipt scan

**Record sale** (`/sales/new`) is a blank form. **Scan receipt** (`/sales/scan`) opens an overlay to pick a JPEG/PNG; after a successful read, the sale form appears already filled. Totals are computed from the extracted lines. Review before saving.

Receiver fields (name/company, account number, contact, address) are optional on every sale.

Create a key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY`. The key stays on the server. Without it, the scan panel explains that it is not configured and you can still type the sale.

## Project notes

Decisions and MVP status live in [`agent.md`](./agent.md).
