# Backend — Mini ERP + CRM Operations Portal API

Node.js + TypeScript + Express + PostgreSQL (Prisma) REST API. See the
[root README](../README.md) for the full setup, deployment, and architecture write-up — this
file just covers the backend-only quick commands.

```bash
cp .env.example .env             # edit DATABASE_URL / JWT_SECRET as needed
npm install
npx prisma migrate dev --name init
npm run seed                     # demo users + products + customers
npm run dev                      # http://localhost:4000
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with hot-reload (ts-node + nodemon) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm run seed` | Seed demo users/customers/products |
| `npm test` | Jest unit + integration tests |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse the database in a GUI |
