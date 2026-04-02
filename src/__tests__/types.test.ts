import { describe, it, expect } from 'vitest';
import type {
  Model,
  BenchmarkRun,
  TestCase,
  BenchmarkResult,
  ModelSummary,
} from '../shared/types.js';

describe('Shared Types', () => {
  it('Model interface has required fields', () => {
    const model: Model = {
      id: 'meta-llama/llama-3.1-70b-instruct',
      name: 'Llama 3.1 70B Instruct',
      provider: 'meta-llama',
      parameterCount: 70,
      huggingfaceId: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      openrouterId: 'meta-llama/llama-3.1-70b-instruct',
      tags: ['chat', 'instruct'],
    };
    expect(model.id).toBe('meta-llama/llama-3.1-70b-instruct');
    expect(model.tags).toHaveLength(2);
    expect(model.parameterCount).toBe(70);
  });

  it('Model allows null parameterCount', () => {
    const model: Model = {
      id: 'test',
      name: 'Test',
      provider: 'test',
      parameterCount: null,
      huggingfaceId: '',
      openrouterId: 'test',
      tags: [],
    };
    expect(model.parameterCount).toBeNull();
  });

  it('BenchmarkRun has all status variants', () => {
    const statuses: BenchmarkRun['status'][] = ['pending', 'running', 'completed', 'failed'];
    statuses.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('TestCase interface has required fields', () => {
    const tc: TestCase = {
      id: 'uuid-1',
      input: 'Summarize this',
      expectedBehavior: 'A concise summary',
      category: 'accuracy',
    };
    expect(tc.input).toBeTruthy();
    expect(tc.expectedBehavior).toBeTruthy();
  });

  it('BenchmarkResult can hold null safetyScore', () => {
    const result: BenchmarkResult = {
      id: 'r1',
      runId: 'run1',
      modelId: 'model1',
      testCaseId: 'tc1',
      output: 'Some output',
      score: 85,
      latencyMs: 1200,
      tokensIn: 50,
      tokensOut: 200,
      safetyScore: null,
      safetyViolations: [],
      judgeReasoning: 'Good response',
    };
    expect(result.safetyScore).toBeNull();
    expect(result.score).toBe(85);
  });

  it('ModelSummary has rank', () => {
    const summary: ModelSummary = {
      modelId: 'test',
      modelName: 'Test Model',
      overallScore: 82.5,
      accuracyScore: 85,
      safetyScore: 95,
      avgLatencyMs: 1500,
      avgTokensOut: 300,
      rank: 1,
    };
    expect(summary.rank).toBe(1);
    expect(summary.overallScore).toBeGreaterThan(0);
  });
});
