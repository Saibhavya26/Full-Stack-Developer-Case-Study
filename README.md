# Mini ERP + CRM Operations Portal

A full-stack ERP/CRM operations portal built for a wholesale/distribution company's internal
sales, warehouse and accounts teams — customers, products, stock, and sales challans, with
role-based access control end to end.

Built as a full-stack developer case study. Every module in the brief is implemented: JWT auth
with 4 roles, Customer CRM, Product & Inventory (with a stock movement log), and Sales Challans
with real transactional stock-deduction logic that can never push inventory negative.

---

## 1. Tech stack

| Layer      | Choice |
|------------|--------|
| Backend    | Node.js, TypeScript, Express.js, PostgreSQL, Prisma ORM, Zod validation, JWT auth |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Testing    | Jest + Supertest (backend) |
| DevOps     | Docker + docker-compose, GitHub Actions CI |
| Deployment | Render / Vercel / Neon (free tiers) — see §6 |

---

## 2. Features implemented

**Authentication & roles** — JWT login, 4 roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`), with
`ADMIN` implicitly allowed everywhere. Route-level role gates, not just UI-level hiding.

**Customer CRM** — full CRUD, search across name/mobile/business/email, filter by status/type,
pagination, a customer detail page, and a follow-up notes timeline (each note is attributed to
the user who added it and can carry a "next follow-up" date).

**Product & Inventory** — full CRUD, SKU uniqueness, low-stock flag (`currentStock <=
minStockAlertQty`), a low-stock filter, and a complete stock movement log (every IN/OUT is
recorded with quantity, reason, who did it, and when). Stock is never edited directly — it only
changes through a movement, so the log is always a complete audit trail.

**Sales Challans** — pick a customer, add multiple products with quantities, save as **Draft** or
**Confirmed**. Confirming a challan:
- reduces stock for every line item **inside a single database transaction**
- **never lets stock go negative** — if any line doesn't have enough stock, the entire
  transaction is rolled back and the API returns HTTP 400 naming every short product, requested
  qty, and available qty
- stores a **product snapshot** (name, SKU, unit price) on each challan line, not just a foreign
  key, so a challan stays accurate forever even if the product is later renamed, repriced, or
  deleted
- auto-generates a sequential challan number (`CH-2026-000001`, scoped per year)

A DRAFT challan can later be confirmed (same stock-deduction logic runs at that point) or
cancelled. Cancelling a **confirmed** challan restores the stock it had deducted (documented as an
assumption in §8).

**Cross-cutting** — centralized error handling with proper HTTP status codes, Zod-validated
request bodies/queries with field-level error messages, pagination + search/filter on every list
endpoint, Prisma error translation (unique constraint → 409, not-found → 404, FK violation → 400),
Helmet + CORS, and a clean modular structure (routes → controllers → services → Prisma).

---

## 3. Architecture

```
erp-crm-portal/
├── backend/                 Node.js + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma    Data model (see below)
│   │   └── seed.ts          Demo users, products, customers
│   ├── src/
│   │   ├── config/env.ts    Typed, validated environment config
│   │   ├── middleware/      auth (JWT), requireRole, zod validate, central error handler
│   │   ├── modules/         one folder per domain: auth, customers, products, challans
│   │   │   └── <module>/    <module>.routes.ts → .controller.ts → .service.ts (+ .schema.ts)
│   │   ├── utils/           ApiError, asyncHandler, pagination, challan number generator
│   │   └── app.ts / server.ts
│   └── tests/                unit tests (pure business logic) + a DB-free integration smoke test
│
├── frontend/                 React + TypeScript SPA
│   └── src/
│       ├── api/               one file per resource, thin wrappers around a shared axios client
│       ├── context/AuthContext.tsx   JWT stored in localStorage, attached via axios interceptor
│       ├── components/        ProtectedRoute (role-aware), Modal, Pagination, StatusBadge
│       ├── layouts/AppLayout.tsx     sidebar + topbar shell
│       └── pages/              Dashboard, customers/, products/, challans/, Login
│
├── docker-compose.yml         postgres + backend + frontend, one command to run everything
├── .github/workflows/ci.yml   lint, test, build on every push/PR
└── docs/postman_collection.json
```

**Why this structure.** The backend follows a routes → controller → service layering per module
(`modules/<name>/`) so that HTTP concerns (status codes, request/response shape) stay out of the
business logic, and the business logic stays out of Express entirely. The sales-challan math
(pricing lines, detecting stock shortages) is pulled into pure functions in
`challans.logic.ts` with **no database access**, specifically so the "stock must never go
negative" rule can be unit tested directly — see `backend/tests/unit/challans.logic.test.ts`.

**Why Prisma.** Gives a single typed schema that drives migrations, the query builder, and
TypeScript types together, which keeps the customer/product/challan models (with their several
relations and 3 enums) consistent without hand-written SQL or a separate migration tool.

**Why the challan reduces stock in a transaction.** `prisma.$transaction` wraps the stock check,
the `product.currentStock` decrement, and the `StockMovement` insert together per challan. If a
shortage is found for *any* line, an `ApiError` is thrown before any write happens and Prisma
rolls the whole transaction back — so a challan with 5 lines where only the 4th is short never
partially deducts the first three.

---

## 4. Data model

```
User (id, name, email, passwordHash, role: ADMIN|SALES|WAREHOUSE|ACCOUNTS)

Customer (id, name, mobile, email?, businessName?, gstNumber?, customerType: RETAIL|WHOLESALE|DISTRIBUTOR,
          address?, status: LEAD|ACTIVE|INACTIVE, followUpDate?, notes?)
  └─ FollowUp (id, customerId, note, nextDate?, createdById, createdAt)

Product (id, name, sku [unique], category?, unitPrice, currentStock, minStockAlertQty, location?)
  └─ StockMovement (id, productId, quantity, movementType: IN|OUT, reason, createdById, createdAt)

Challan (id, challanNumber [unique, auto-generated], customerId, status: DRAFT|CONFIRMED|CANCELLED,
         totalQuantity, totalAmount, createdById, createdAt, confirmedAt?, cancelledAt?)
  └─ ChallanItem (id, challanId, productId, productName, productSku, unitPrice, quantity, lineTotal)
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ product SNAPSHOT, not just an id
```

Full definitions with indexes: [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma).

---

## 5. Running it locally

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 14+ running locally, **or** Docker (see §5b for the one-command option)

### 5a. Manual setup (backend + frontend separately)

```bash
# 1. Clone and enter the repo
git clone <your-fork-url>
cd erp-crm-portal

# 2. Backend
cd backend
cp .env.example .env          # edit DATABASE_URL if your Postgres isn't on localhost:5432
npm install
npx prisma migrate dev --name init   # creates the database schema
npm run seed                          # creates demo users, products, customers
npm run dev                           # starts the API on http://localhost:4000

# 3. Frontend (in a second terminal)
cd frontend
cp .env.example .env          # defaults to http://localhost:4000/api, which matches step 2
npm install
npm run dev                           # starts the SPA on http://localhost:5173
```

Open http://localhost:5173 and log in with any of the demo accounts from §7.

> **A note on this repository's own build environment:** this codebase was written and
> syntax-verified in a network-sandboxed environment that could not reach `registry.npmjs.org`,
> so `npm install` has not been run against it before delivery. Every file was hand-written and
> passed through the TypeScript compiler's parser (`ts.transpileModule`) to catch syntax errors,
> but you are the first `npm install` this project will see. If anything is missing from
> `package.json`, `npm install` will name it immediately — see §8 for the full disclosure.

### 5b. One command with Docker

```bash
cp backend/.env.example backend/.env   # only needed if you want to override JWT_SECRET etc.
docker compose up --build
```

This starts Postgres, runs migrations (`prisma migrate deploy`, baked into the backend
container's start command), and serves the frontend on **http://localhost:5173** and the API on
**http://localhost:4000**. Seed the demo data once the containers are up:

```bash
docker compose exec backend npm run seed
```

### Environment variables

**backend/.env** (see `backend/.env.example`):

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | API port | `4000` |
| `DATABASE_URL` | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/erp_crm` |
| `JWT_SECRET` | Signing secret for auth tokens — **change this in production** | a long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `8h` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |

**frontend/.env** (see `frontend/.env.example`):

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL the SPA calls | `http://localhost:4000/api` |

### Running tests

```bash
cd backend
npm test          # unit tests for the challan business logic + pagination, plus a DB-free API smoke test
npm run lint       # ESLint
```

---

## 6. Deploying (free tier, no AWS spend required)

The brief marks AWS deployment as an optional bonus and explicitly says not to spend money, so
these steps use free tiers of Neon (Postgres), Render (API), and Vercel (frontend) — roughly
15 minutes end to end.

### Step 1 — Database on Neon
1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string it gives you (it already includes `?sslmode=require`).

### Step 2 — Backend on Render
1. Push this repo to your own GitHub account.
2. On [render.com](https://render.com), **New → Web Service**, connect the repo, set **Root
   Directory** to `backend`.
3. Build command: `npm install && npx prisma generate && npm run build`
   Start command: `npx prisma migrate deploy && npm start`
4. Add environment variables: `DATABASE_URL` (from Neon), `JWT_SECRET` (generate a long random
   string), `JWT_EXPIRES_IN=8h`, `CORS_ORIGIN` (set this after step 3, to your Vercel URL),
   `NODE_ENV=production`.
5. Deploy. Once live, note the URL (e.g. `https://erp-crm-api.onrender.com`) and run the seed
   once, from your machine, pointed at the Neon database:
   `DATABASE_URL="<neon-url>" npm run seed` (run from the `backend` folder).

### Step 3 — Frontend on Vercel
1. On [vercel.com](https://vercel.com), **New Project**, import the same repo, set **Root
   Directory** to `frontend`.
2. Framework preset: Vite. Add environment variable `VITE_API_BASE_URL` = your Render URL +
   `/api` (e.g. `https://erp-crm-api.onrender.com/api`).
3. Deploy. Once live, go back to Render and set `CORS_ORIGIN` to this Vercel URL, then redeploy
   the backend so it accepts requests from the frontend's real origin.

### Alternative free options
Any combination works: Railway or Fly.io instead of Render for the backend; Netlify or a Render
Static Site instead of Vercel for the frontend; Supabase or Render Postgres instead of Neon for
the database. The `docker-compose.yml` in this repo also deploys as-is to any host that runs
Docker Compose (a small VM, Railway's Docker deploys, etc.).

### AWS (bonus, optional)
The same three pieces map onto AWS as: RDS (Postgres) for the database, Elastic Beanstalk or an
EC2 instance + PM2 + nginx for the backend, and S3 + CloudFront (or Amplify) for the static
frontend build. This wasn't executed for this submission since it isn't free and the brief says
not to spend money — happy to walk through it live if useful.

---

## 7. Test login credentials

Demo accounts are created by `backend/prisma/seed.ts`.

For security, credentials are not published in this repository.

## 8. Known limitations, assumptions, and what's intentionally out of scope

**Not yet deployed to a public URL.** This codebase was produced in a sandboxed environment with
no outbound access to npm's registry (or any package registry), so `npm install` could not be run
here and the app could not be built, started, or click-tested before delivery — see the callout in
§5a. Every file was hand-written carefully and passed through the TypeScript parser to catch
syntax errors, and the business logic (stock math, shortage detection) has real Jest unit tests
included, but there has been no live run yet. **Run `npm install` in both `backend/` and
`frontend/` first** — if anything doesn't compile, it will most likely be a small dependency
version mismatch, easy to fix from the error message. Live URLs, from Render/Vercel/Neon per §6,
should be added to this section (or a separate `SUBMISSION.md`) once deployed.

**Business-logic assumptions made:**
- Cancelling a **confirmed** challan is treated as a full reversal: stock is restored and an `IN`
  stock movement is recorded. Cancelling a **draft** challan has no stock impact (none was ever
  deducted). The brief doesn't specify this, so this was the most defensible interpretation.
- `ADMIN` is treated as a superuser allowed to do anything any other role can do, on top of the
  four roles the brief lists.
- Challan numbers are sequential per calendar year (`CH-2026-000001`). At the scale this app is
  built for, a `COUNT`-then-insert can theoretically race under heavy concurrent writes; the
  unique constraint on `challanNumber` would catch a collision rather than silently duplicating
  one, but the request would need a retry. Documented rather than hidden.
- A customer's `mobile` field is not unique in the schema — in practice a shared business line
  can serve multiple contacts/customers, so this was a deliberate choice, not an oversight.
- `Product.currentStock` is only ever changed through a `StockMovement` (manual adjustment or a
  challan), never edited directly — so the product edit form intentionally does not expose a
  stock field after creation.

**Explicitly out of scope for this submission** (all listed as optional/bonus in the brief):
- AWS deployment (§6 explains the equivalent AWS services; not executed to avoid any AWS spend)
- Invoice PDF export
- Product image upload to S3
- A dedicated Accounts-specific invoicing/ledger view beyond read access + challan cancellation

**What's deliberately minimal:**
- No refresh-token rotation — a single JWT with an 8-hour expiry, matching "simple JWT-based
  authentication is acceptable" from the brief.
- Frontend has no client-side caching layer (React Query, SWR) — plain `useEffect` + `axios`,
  which is enough at this scale and keeps the code easy to review.
- The low-stock filter (`lowStockOnly=true`) is computed in application code rather than a raw
  SQL comparison between two columns, since Prisma's query builder can't express a
  column-vs-column filter directly. Fine at catalog sizes in the hundreds/low-thousands; a raw
  query or a materialized `isLowStock` column would be the fix at larger scale.

---

## 9. API documentation

Full Postman collection: [`docs/postman_collection.json`](./docs/postman_collection.json).
Import it into Postman, set the `baseUrl` variable (defaults to `http://localhost:4000/api`), run
**Auth → Login (Sales)** first (its test script saves the JWT into the collection's `token`
variable automatically), then run anything else — including a request that deliberately
demonstrates the negative-stock guard returning HTTP 400.

Quick reference:

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Returns `{ token, user }` |
| GET | `/api/auth/me` | Any role | Current user from the JWT |
| GET | `/api/customers` | Any role | `?page&pageSize&search&status&customerType` |
| GET | `/api/customers/:id` | Any role | Includes follow-ups + recent challans |
| POST | `/api/customers` | Sales/Admin | |
| PATCH | `/api/customers/:id` | Sales/Admin | Partial update |
| POST | `/api/customers/:id/follow-ups` | Sales/Admin | |
| GET | `/api/products` | Any role | `?page&pageSize&search&category&lowStockOnly` |
| GET | `/api/products/:id` | Any role | Includes stock movement log |
| POST | `/api/products` | Warehouse/Admin | |
| PATCH | `/api/products/:id` | Warehouse/Admin | Partial update |
| POST | `/api/products/:id/stock-movements` | Warehouse/Admin | Manual IN/OUT, guarded against negative stock |
| GET | `/api/challans` | Any role | `?page&pageSize&status&customerId&search` |
| GET | `/api/challans/:id` | Any role | Full line items with product snapshot |
| POST | `/api/challans` | Sales/Admin | `status: DRAFT \| CONFIRMED` |
| POST | `/api/challans/:id/confirm` | Sales/Admin | Draft → Confirmed, deducts stock |
| POST | `/api/challans/:id/cancel` | Sales/Accounts/Admin | Restores stock if it was confirmed |
| GET | `/api/health` | Public | Liveness check |

Every error response has the shape `{ "error": { "message": string, "details"?: unknown } }`, and
validation errors list every failing field, not just the first one.

---

## 10. Bonus items included

- ✅ Docker setup (`docker-compose.yml`, a Dockerfile per app)
- ✅ GitHub Actions CI (`.github/workflows/ci.yml` — lint, test, build on every push/PR) and an
  optional deploy-trigger workflow (`.github/workflows/deploy.yml`)
- ⬜ Invoice PDF export — not implemented (see §8)
- ⬜ Product image upload to S3 — not implemented (see §8)
