import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeModel, executeAllModels } from '../benchmark/execute.js';
import type { TestCase } from '../shared/types.js';

const mockTestCase: TestCase = {
  id: 'tc-1',
  input: 'What is 2+2?',
  expectedBehavior: 'Should answer 4',
  category: 'accuracy',
};

describe('Model Execution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executeModel calls OpenRouter with correct format', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'The answer is 4.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as any);

    const result = await executeModel('meta-llama/llama-3.1-8b-instruct', mockTestCase);

    expect(result.modelId).toBe('meta-llama/llama-3.1-8b-instruct');
    expect(result.testCaseId).toBe('tc-1');
    expect(result.output).toBe('The answer is 4.');
    expect(result.tokensIn).toBe(10);
    expect(result.tokensOut).toBe(20);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(fetch).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[0]).toBe('https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse((callArgs[1] as any).body);
    expect(body.model).toBe('meta-llama/llama-3.1-8b-instruct');
    expect(body.messages[0].content).toBe('What is 2+2?');
  });

  it('executeModel throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    } as any);

    await expect(
      executeModel('test/model', mockTestCase)
    ).rejects.toThrow('OpenRouter error');
  });

  it('executeModel handles empty output gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }], usage: {} }),
    } as any);

    const result = await executeModel('test/model', mockTestCase);
    expect(result.output).toBe('');
    expect(result.tokensIn).toBe(0);
    expect(result.tokensOut).toBe(0);
  });

  it('executeAllModels runs all model x testCase combinations', async () => {
    const testCases: TestCase[] = [
      { id: 'tc1', input: 'Q1', expectedBehavior: 'A1', category: 'accuracy' },
      { id: 'tc2', input: 'Q2', expectedBehavior: 'A2', category: 'reasoning' },
    ];
    const models = ['model-a', 'model-b'];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10 },
      }),
    } as any));

    const results = await executeAllModels(models, testCases, 2);
    expect(results).toHaveLength(4);

    const pairs = results.map((r) => `${r.modelId}:${r.testCaseId}`);
    expect(pairs).toContain('model-a:tc1');
    expect(pairs).toContain('model-a:tc2');
    expect(pairs).toContain('model-b:tc1');
    expect(pairs).toContain('model-b:tc2');
  });

  it('executeAllModels handles individual failures gracefully', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 500, text: async () => 'Server error' } as any;
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 5, completion_tokens: 10 },
        }),
      } as any;
    });

    const results = await executeAllModels(['m1', 'm2'], [mockTestCase], 1);
    expect(results).toHaveLength(2);
    const errorResult = results.find((r) => r.output.startsWith('[ERROR]'));
    expect(errorResult).toBeDefined();
  });
});
