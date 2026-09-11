// Ensures env.ts has what it needs to load even when tests run without a
// real .env file (e.g. a fresh CI checkout). DB-backed tests still need a
// real DATABASE_URL to pass — this only unblocks the DB-independent ones
// (unit tests, and the /api/health smoke test) from crashing at import time.
process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/erp_crm_test?schema=public';
process.env.JWT_SECRET ||= 'test-secret-do-not-use-in-production';
process.env.NODE_ENV ||= 'test';
