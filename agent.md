# POS Transaction Web App — Agent Context (SD-01)

## Project Overview
**Problem**: Agents currently track sales on paper.
**Goal**: Build a web app to record POS transactions, replacing manual paper records.

## Core MVP Requirements
- **CRUD**: Full Create, Read, Update, Delete for sales/transactions
- **Totals**: Automatically calculate and display transaction totals, subtotals, etc.
- **Simple Auth**: Basic authentication (login) to protect the app
- **Deploy**: Application must be easily deployable and runnable

## Expected Deliverables
- Runnable repository (or deployed link)
- Complete source code
- High-quality README
- 2–3 minute demo video — **out of scope for this implementation**

## Current Project Status
- Next.js 15 + TypeScript + Prisma + SQLite app implemented
- Public landing at `/` for guests; sales book at `/sales` after login
- Seeded agent login, public signup at `/signup`, signed httpOnly session cookie
- Sale CRUD with line items and server-computed totals
- Personal accounts only see/edit/delete their own sales
- Organizations: created at sign-up, admin adds member accounts, members share the org ledger at `/sales` (Agent column restored)
- Members view all org sales but edit/delete only their own; the org admin can edit/delete any org sale
- Same visibility rules enforced in the REST API via per-token scoping
- Record sale (`/sales/new`) vs scan receipt (`/sales/scan` overlay then filled form)
- Optional receiver fields on each sale
- User settings at `/settings`: profile picture upload/remove, display name, password change
- Top bar shows the signed-in agent's profile picture and display name (initials fallback)
- Expenses at `/expenses`: record money going out (date, amount, note); same visibility rules as sales (own for solo, shared org ledger for members)
- Email via SMTP (optional): signup email verification with a 6-digit code, forgot-password reset codes, and org alert emails (new member added, member sign-in) to the company email; when SMTP is unset accounts are auto-verified and no emails are sent
- Emails are unique per context: one personal account per email and one account per email per org; the same email may exist across different contexts as separate accounts; company emails are unique across organizations
- Sales dashboard analytics: stat cards (revenue, expenses, net, count, average, items sold), a server-rendered SVG revenue-vs-expenses line chart with a side-by-side top-items panel, per-agent breakdown for orgs (incoming/outgoing/net), and top items; honors the date filter and visibility scope
- Profile images stored as BLOBs on the `User` row; served via `/api/me/avatar` (session cookie)
- Public REST API at `/api/v1` (bearer token) for other ledger clients
- Local run (`npm run db:setup && npm run dev`) and Docker Compose path
- README documents env, schema, totals, API, settings, and optional Railway/Render/Fly deploy
- Demo video not produced

## Key Constraints for MVP
- Keep scope minimal — focus only on core POS transaction recording
- Prioritize working end-to-end flow over advanced features
- Must support local development and one-command or simple deployment

## Instructions for AI Agents
When working on this project:
1. Always align changes with the MVP scope above.
2. Update this file and the main README when making significant progress or decisions.
3. Prefer simple, maintainable solutions that are easy to demo.
4. After code changes, ensure the app can be run locally with clear instructions.
5. Track progress toward the deliverables (code + README + deploy + demo).

## Decisions (locked)
- **Stack**: Next.js App Router, TypeScript, Prisma, SQLite
- **Auth**: Seeded agent from `AUTH_USERNAME` / `AUTH_PASSWORD`; agents can also register at `/signup` (personal or create-org admin); iron-session cookie
- **Email**: `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` (port `SMTP_PORT` 587, `SMTP_SECURE` false by default, `SMTP_FROM` optional); reset codes last 15 min, verification codes 60 min, 6-digit, single-use, max 5 attempts, prior codes invalidated on resend; login is never blocked — unverified accounts see a banner and verify at `/verify-email`
- **Persistence**: SQLite file (`DATABASE_URL=file:./dev.db` → `prisma/dev.db` locally, `/data/pos.db` in Docker)
- **Money**: Integer cents; totals recomputed on the server
- **Profile image**: Stored as a BLOB on the `User` row (no filesystem/volume); JPEG/PNG/WebP up to 2MB, served via `/api/me/avatar` for the signed-in session only
- **Deploy**: Docker Compose is the deploy artifact; a public URL is optional
- **Currency label**: `PHP` by default (`APP_CURRENCY`)
- **Receipt scan**: `/sales/scan` overlay, then review form; Gemini `gemini-3.7-flash`; photos not stored
- **Receiver**: optional name/company, account, contact, address
- **HTTP API**: `/api/v1` JSON + bearer tokens so other services can share the ledger
- **Sales isolation**: solo users scope to `createdById`; org members scope to `createdBy.organizationId` (view), and edits use `editScope` (org admin → whole org, others → own sales); out-of-scope access returns 404 "Sale not found."
- **Organizations**: single admin (`Organization.adminId`, unique) created at sign-up; members added only by the admin; no self-join, member removal, or org deletion in this pass
- **Expenses**: `spentAt`, `amountCents`, `note`, `createdBy`; reuses the sales scope helpers (view scope for listing, edit scope for delete — org admin can delete any org expense, others their own); amount must be > 0; note ≤ 200 chars
- **Analytics**: pure aggregation in `lib/analytics.ts` (no DB dependency, unit-tested); day-key bucketing in local time with zero-filled ranges (last 30 days when unfiltered); chart is hand-rolled SVG (no chart library)

## Out of scope
- Demo video
- Inventory, product catalog, barcodes
- Receipt archive, printers, PDF / multi-page receipts
- Multi-role auth, OAuth, SMS-based recovery
- Payments, change due, refunds
- Multi-store / offline sync
- Org self-join, member removal, org rename/delete, multiple admins
- Expense editing, categories, expense REST endpoints
- Chart interactivity (tooltips/legend toggle); analytics export

## Next Immediate Steps
- Record the optional 2–3 minute demo video if a course deliverable still requires it
- Optional: push the Docker image to Railway / Render / Fly with a volume

---
_Last updated: 2026-08-18_
