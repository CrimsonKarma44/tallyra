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
- Seeded agent login, public signup at `/signup`, signed httpOnly session cookie
- Sale CRUD with line items and server-computed totals
- Record sale (`/sales/new`) vs scan receipt (`/sales/scan` overlay then filled form)
- Optional receiver fields on each sale
- Public REST API at `/api/v1` (bearer token) for other ledger clients
- Local run (`npm run db:setup && npm run dev`) and Docker Compose path
- README documents env, schema, totals, API, and optional Railway/Render/Fly deploy
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
- **Auth**: Seeded agent from `AUTH_USERNAME` / `AUTH_PASSWORD`; agents can also register at `/signup`; iron-session cookie
- **Persistence**: SQLite file (`DATABASE_URL=file:./dev.db` → `prisma/dev.db` locally, `/data/pos.db` in Docker)
- **Money**: Integer cents; totals recomputed on the server
- **Deploy**: Docker Compose is the deploy artifact; a public URL is optional
- **Currency label**: `PHP` by default (`APP_CURRENCY`)
- **Receipt scan**: `/sales/scan` overlay, then review form; Gemini `gemini-3.7-flash`; photos not stored
- **Receiver**: optional name/company, account, contact, address
- **HTTP API**: `/api/v1` JSON + bearer tokens so other services can share the ledger

## Out of scope
- Demo video
- Inventory, product catalog, barcodes
- Receipt archive, printers, PDF / multi-page receipts
- Multi-role auth, OAuth, password reset
- Payments, change due, refunds
- Multi-store / offline sync

## Next Immediate Steps
- Record the optional 2–3 minute demo video if a course deliverable still requires it
- Optional: push the Docker image to Railway / Render / Fly with a volume

---
_Last updated: 2026-08-18_
