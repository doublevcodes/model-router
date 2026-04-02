import { describe, it, expect, beforeEach } from 'vitest';
import {
  insertBenchmarkRun,
  updateRunStatus,
  upsertModel,
  insertTestCase,
  insertBenchmarkResult,
  getRunById,
  getResultsByRun,
  getModelSummaries,
  searchExistingResults,
  getAllRuns,
  searchRuns,
  _resetStoreForTests,
} from '../shared/db.js';
import type { Model } from '../shared/types.js';

beforeEach(() => {
  _resetStoreForTests();
});

describe('insertBenchmarkRun', () => {
  it('creates a run and returns a uuid', async () => {
    const id = await insertBenchmarkRun('summarize tickets', 'summarize-tickets');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });

  it('run starts with pending status', async () => {
    const id = await insertBenchmarkRun('test', 'test');
    const run = await getRunById(id);
    expect(run).not.toBeNull();
    expect(run!.status).toBe('pending');
  });
});

describe('updateRunStatus', () => {
  it('updates status to running', async () => {
    const id = await insertBenchmarkRun('test', 'test');
    await updateRunStatus(id, 'running');
    const run = await getRunById(id);
    expect(run!.status).toBe('running');
  });

  it('sets completedAt when marking completed', async () => {
    const id = await insertBenchmarkRun('test', 'test');
    await updateRunStatus(id, 'completed');
    const run = await getRunById(id);
    expect(run!.status).toBe('completed');
    expect(run!.completedAt).not.toBeNull();
  });

  it('sets completedAt when marking failed', async () => {
    const id = await insertBenchmarkRun('test', 'test');
    await updateRunStatus(id, 'failed');
    const run = await getRunById(id);
    expect(run!.status).toBe('failed');
    expect(run!.completedAt).not.toBeNull();
  });
});

describe('upsertModel', () => {
  it('inserts a new model', async () => {
    const model: Model = {
      id: 'llama-3.1',
      name: 'Llama 3.1 70B',
      provider: 'meta-llama',
      parameterCount: 70,
      huggingfaceId: 'meta-llama/Llama-3.1-70B',
      openrouterId: 'meta-llama/llama-3.1-70b-instruct',
      tags: ['chat'],
    };
    await upsertModel(model);
    // No error means success; verify it's usable in summaries later
  });

  it('updates existing model on re-upsert', async () => {
    const model: Model = {
      id: 'test',
      name: 'V1',
      provider: 'test',
      parameterCount: null,
      huggingfaceId: '',
      openrouterId: 'test/model',
      tags: [],
    };
    await upsertModel(model);
    await upsertModel({ ...model, name: 'V2' });
    // Should not throw or duplicate
  });
});

describe('insertTestCase', () => {
  it('inserts and returns a uuid', async () => {
    const runId = await insertBenchmarkRun('test', 'test');
    const tcId = await insertTestCase(runId, {
      input: 'What is 2+2?',
      expectedBehavior: 'Should answer 4',
      category: 'accuracy',
    });
    expect(tcId).toBeTruthy();
  });

  it('test cases appear in getRunById', async () => {
    const runId = await insertBenchmarkRun('test', 'test');
    await insertTestCase(runId, { input: 'Q1', expectedBehavior: 'A1', category: 'accuracy' });
    await insertTestCase(runId, { input: 'Q2', expectedBehavior: 'A2', category: 'edge_case' });
    const run = await getRunById(runId);
    expect(run!.testCases).toHaveLength(2);
    expect(run!.testCases[0].input).toBe('Q1');
  });
});

describe('insertBenchmarkResult + getResultsByRun', () => {
  it('inserts and retrieves results sorted by score', async () => {
    const runId = await insertBenchmarkRun('test', 'test');
    const tcId = await insertTestCase(runId, { input: 'Q', expectedBehavior: 'A', category: 'accuracy' });
    await upsertModel({ id: 'm1', name: 'M1', provider: 'p', parameterCount: null, huggingfaceId: '', openrouterId: 'm1', tags: [] });
    await upsertModel({ id: 'm2', name: 'M2', provider: 'p', parameterCount: null, huggingfaceId: '', openrouterId: 'm2', tags: [] });

    await insertBenchmarkResult({ runId, modelId: 'm1', testCaseId: tcId, output: 'low', score: 40, latencyMs: 500, tokensIn: 10, tokensOut: 50, safetyScore: 90, safetyViolations: [], judgeReasoning: 'ok' });
    await insertBenchmarkResult({ runId, modelId: 'm2', testCaseId: tcId, output: 'high', score: 85, latencyMs: 800, tokensIn: 10, tokensOut: 100, safetyScore: 95, safetyViolations: [], judgeReasoning: 'great' });

    const results = await getResultsByRun(runId);
    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].modelId).toBe('m2');
  });
});

describe('getModelSummaries', () => {
  it('computes aggregated summaries ranked by score', async () => {
    const runId = await insertBenchmarkRun('test', 'test');
    const tc1 = await insertTestCase(runId, { input: 'Q1', expectedBehavior: 'A1', category: 'accuracy' });
    const tc2 = await insertTestCase(runId, { input: 'Q2', expectedBehavior: 'A2', category: 'reasoning' });
    await upsertModel({ id: 'fast', name: 'Fast', provider: 'p', parameterCount: null, huggingfaceId: '', openrouterId: 'fast', tags: [] });
    await upsertModel({ id: 'smart', name: 'Smart', provider: 'p', parameterCount: null, huggingfaceId: '', openrouterId: 'smart', tags: [] });

    await insertBenchmarkResult({ runId, modelId: 'fast', testCaseId: tc1, output: 'x', score: 60, latencyMs: 200, tokensIn: 10, tokensOut: 30, safetyScore: 80, safetyViolations: [], judgeReasoning: '' });
    await insertBenchmarkResult({ runId, modelId: 'fast', testCaseId: tc2, output: 'x', score: 70, latencyMs: 250, tokensIn: 10, tokensOut: 40, safetyScore: 85, safetyViolations: [], judgeReasoning: '' });
    await insertBenchmarkResult({ runId, modelId: 'smart', testCaseId: tc1, output: 'x', score: 90, latencyMs: 1000, tokensIn: 10, tokensOut: 200, safetyScore: 95, safetyViolations: [], judgeReasoning: '' });
    await insertBenchmarkResult({ runId, modelId: 'smart', testCaseId: tc2, output: 'x', score: 85, latencyMs: 1100, tokensIn: 10, tokensOut: 250, safetyScore: 90, safetyViolations: [], judgeReasoning: '' });

    const summaries = await getModelSummaries(runId);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].modelId).toBe('smart');
    expect(summaries[0].rank).toBe(1);
    expect(summaries[1].modelId).toBe('fast');
    expect(summaries[1].rank).toBe(2);
    expect(summaries[0].overallScore).toBeGreaterThan(summaries[1].overallScore);
    expect(summaries[0].avgLatencyMs).toBeGreaterThan(summaries[1].avgLatencyMs);
  });
});

describe('searchExistingResults', () => {
  it('finds completed runs matching slug', async () => {
    const id = await insertBenchmarkRun('summarize customer tickets', 'summarize-customer-tickets');
    await updateRunStatus(id, 'completed');
    const results = await searchExistingResults('summarize');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].useCase).toContain('summarize');
  });

  it('ignores non-completed runs', async () => {
    await insertBenchmarkRun('coding task', 'coding-task');
    const results = await searchExistingResults('coding');
    expect(results).toHaveLength(0);
  });
});

describe('getAllRuns', () => {
  it('returns all runs sorted by date desc', async () => {
    await insertBenchmarkRun('first', 'first');
    await insertBenchmarkRun('second', 'second');
    const runs = await getAllRuns();
    expect(runs).toHaveLength(2);
    expect(new Date(runs[0].created_at).getTime()).toBeGreaterThanOrEqual(
      new Date(runs[1].created_at).getTime()
    );
  });
});

describe('searchRuns', () => {
  it('filters runs by use_case text', async () => {
    await insertBenchmarkRun('summarize support tickets', 'summarize-support-tickets');
    await insertBenchmarkRun('code generation', 'code-generation');
    const results = await searchRuns('summarize');
    expect(results).toHaveLength(1);
    expect(results[0].use_case).toContain('summarize');
  });
});

describe('getRunById', () => {
  it('returns null for nonexistent run', async () => {
    const run = await getRunById('nonexistent-id');
    expect(run).toBeNull();
  });
});
