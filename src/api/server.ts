import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import {
  getAllRuns,
  getRunById,
  getModelSummaries,
  getResultsByRun,
  searchRuns,
} from '../shared/db.js';

const app = new Hono();

app.use('/*', cors());

app.get('/api/runs', async (c) => {
  try {
    const runs = await getAllRuns();
    return c.json({ runs });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/runs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const run = await getRunById(id);
    if (!run) return c.json({ error: 'Run not found' }, 404);
    const summaries = await getModelSummaries(id);
    return c.json({ run, summaries });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/runs/:id/results', async (c) => {
  try {
    const id = c.req.param('id');
    const run = await getRunById(id);
    if (!run) return c.json({ error: 'Run not found' }, 404);
    const summaries = await getModelSummaries(id);
    const detailed = await getResultsByRun(id);
    return c.json({ run, summaries, detailed });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/search', async (c) => {
  try {
    const q = c.req.query('q') || '';
    if (!q) return c.json({ runs: [] });
    const runs = await searchRuns(q);
    return c.json({ runs });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = Number(process.env.PORT) || 3001;
console.log(`Switchboard API server starting on port ${port}`);
serve({ fetch: app.fetch, port });

export { app };
