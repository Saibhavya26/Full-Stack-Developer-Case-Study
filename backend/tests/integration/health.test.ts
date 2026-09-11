import request from 'supertest';
import { createApp } from '../../src/app';

// This test doesn't touch the database at all, so it runs even without a
// configured DATABASE_URL / running Postgres instance — handy as a quick
// smoke test in CI before the full DB-backed suite runs.
describe('GET /api/health', () => {
  it('responds with 200 and an ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /auth/login validation', () => {
  it('rejects a missing email with 400 before ever hitting the database', async () => {
    const app = createApp();
    const res = await request(app).post('/api/auth/login').send({ password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });
});
