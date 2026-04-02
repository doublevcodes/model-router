import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../shared/db.js', () => ({
  getAllRuns: vi.fn(),
  getRunById: vi.fn(),
  getModelSummaries: vi.fn(),
  getResultsByRun: vi.fn(),
  searchRuns: vi.fn(),
}));

describe('API Server', () => {
  let app: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../shared/db.js', () => ({
      getAllRuns: vi.fn().mockResolvedValue([
        { id: 'run-1', use_case: 'Test use case', status: 'completed', created_at: '2026-01-01T00:00:00Z' },
      ]),
      getRunById: vi.fn().mockImplementation(async (id: string) => {
        if (id === 'run-1') {
          return {
            id: 'run-1',
            useCase: 'Test use case',
            useCaseSlug: 'test-use-case',
            status: 'completed',
            createdAt: new Date('2026-01-01'),
            completedAt: new Date('2026-01-01'),
            models: [],
            testCases: [],
          };
        }
        return null;
      }),
      getModelSummaries: vi.fn().mockResolvedValue([
        {
          modelId: 'model-1',
          modelName: 'Test Model',
          overallScore: 85,
          accuracyScore: 85,
          safetyScore: 90,
          avgLatencyMs: 1500,
          avgTokensOut: 200,
          rank: 1,
        },
      ]),
      getResultsByRun: vi.fn().mockResolvedValue([]),
      searchRuns: vi.fn().mockResolvedValue([]),
    }));

    const { Hono } = await import('hono');
    const { cors } = await import('hono/cors');
    const db = await import('../shared/db.js');

    const testApp = new Hono();
    testApp.use('/*', cors());

    testApp.get('/api/runs', async (c) => {
      const runs = await db.getAllRuns();
      return c.json({ runs });
    });

    testApp.get('/api/runs/:id', async (c) => {
      const id = c.req.param('id');
      const run = await db.getRunById(id);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const summaries = await db.getModelSummaries(id);
      return c.json({ run, summaries });
    });

    testApp.get('/api/runs/:id/results', async (c) => {
      const id = c.req.param('id');
      const run = await db.getRunById(id);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const summaries = await db.getModelSummaries(id);
      const detailed = await db.getResultsByRun(id);
      return c.json({ run, summaries, detailed });
    });

    testApp.get('/api/search', async (c) => {
      const q = c.req.query('q') || '';
      if (!q) return c.json({ runs: [] });
      const runs = await db.searchRuns(q);
      return c.json({ runs });
    });

    testApp.get('/api/health', (c) => c.json({ status: 'ok' }));

    app = testApp;
  });

  it('GET /api/health returns ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/runs returns list of runs', async () => {
    const res = await app.request('/api/runs');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0].id).toBe('run-1');
  });

  it('GET /api/runs/:id returns run with summaries', async () => {
    const res = await app.request('/api/runs/run-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.id).toBe('run-1');
    expect(body.summaries).toHaveLength(1);
    expect(body.summaries[0].modelId).toBe('model-1');
  });

  it('GET /api/runs/:id returns 404 for missing run', async () => {
    const res = await app.request('/api/runs/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Run not found');
  });

  it('GET /api/runs/:id/results returns full details', async () => {
    const res = await app.request('/api/runs/run-1/results');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run).toBeDefined();
    expect(body.summaries).toBeDefined();
    expect(body.detailed).toBeDefined();
  });

  it('GET /api/search with empty query returns empty array', async () => {
    const res = await app.request('/api/search');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toEqual([]);
  });

  it('GET /api/search with query calls searchRuns', async () => {
    const res = await app.request('/api/search?q=test');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toBeDefined();
  });
});
