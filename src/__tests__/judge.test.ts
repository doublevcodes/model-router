import { describe, it, expect, vi, beforeEach } from 'vitest';
import { judgeOutput, judgeAllOutputs } from '../benchmark/judge.js';

describe('LLM Judge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('heuristic judge scores error outputs at 0', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const result = await judgeOutput(
      'test input',
      'good response expected',
      '[ERROR] Model failed to respond'
    );
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain('error');
  });

  it('heuristic judge gives higher scores to longer, relevant outputs', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const shortResult = await judgeOutput(
      'explain gravity',
      'should explain gravitational force and its effects',
      'gravity pulls'
    );

    const longResult = await judgeOutput(
      'explain gravity',
      'should explain gravitational force and its effects',
      'Gravity is a fundamental force that causes objects with mass to attract each other. The gravitational force between two objects depends on their masses and the distance between them. This force is responsible for keeping planets in orbit and causing objects to fall toward the Earth.'
    );

    expect(longResult.score).toBeGreaterThan(shortResult.score);
  });

  it('heuristic judge rewards keyword matches', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const matchResult = await judgeOutput(
      'What is TypeScript?',
      'should mention typed superset JavaScript compiler',
      'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.'
    );

    const noMatchResult = await judgeOutput(
      'What is TypeScript?',
      'should mention typed superset JavaScript compiler',
      'Python is a popular programming language for data science and machine learning.'
    );

    expect(matchResult.score).toBeGreaterThan(noMatchResult.score);
  });

  it('judge returns score clamped between 0 and 100 when using Claude', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '{ "score": 150, "reasoning": "very good" }' }],
      }),
    } as any);

    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: 'test-key', writable: true });

    const result = await judgeOutput('input', 'expected', 'output');
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('judgeAllOutputs returns results for all inputs', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const inputs = [
      { modelId: 'm1', testCaseId: 'tc1', output: 'output 1', input: 'q1', expectedBehavior: 'a1' },
      { modelId: 'm2', testCaseId: 'tc1', output: 'output 2', input: 'q1', expectedBehavior: 'a1' },
    ];

    const results = await judgeAllOutputs(inputs, 2);
    expect(results.size).toBe(2);
    expect(results.has('m1:tc1')).toBe(true);
    expect(results.has('m2:tc1')).toBe(true);

    for (const [, result] of results) {
      expect(typeof result.score).toBe('number');
      expect(typeof result.reasoning).toBe('string');
    }
  });
});
