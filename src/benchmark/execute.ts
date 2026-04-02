import { config } from '../shared/config.js';
import type { TestCase } from '../shared/types.js';

export interface ExecutionResult {
  modelId: string;
  testCaseId: string;
  output: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

export async function executeModel(
  modelId: string,
  testCase: TestCase
): Promise<ExecutionResult> {
  const start = Date.now();

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openrouterApiKey}`,
      'X-Title': 'Switchboard',
      'HTTP-Referer': 'https://github.com/switchboard-ai/switchboard',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: testCase.input }],
      max_tokens: 1024,
    }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(
      `OpenRouter error for ${modelId}: ${response.status} - ${errorBody}`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const output = choice?.message?.content || '';
  const usage = data.usage || {};

  return {
    modelId,
    testCaseId: testCase.id,
    output,
    latencyMs,
    tokensIn: usage.prompt_tokens || 0,
    tokensOut: usage.completion_tokens || 0,
  };
}

export async function executeAllModels(
  modelIds: string[],
  testCases: TestCase[],
  concurrency: number = 3
): Promise<ExecutionResult[]> {
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrency);

  const tasks: Promise<ExecutionResult | null>[] = [];

  for (const modelId of modelIds) {
    for (const testCase of testCases) {
      tasks.push(
        limit(async () => {
          try {
            return await executeModel(modelId, testCase);
          } catch (err) {
            console.error(`Execution failed for ${modelId} on test ${testCase.id}:`, err);
            return {
              modelId,
              testCaseId: testCase.id,
              output: `[ERROR] ${err instanceof Error ? err.message : 'Unknown error'}`,
              latencyMs: 0,
              tokensIn: 0,
              tokensOut: 0,
            };
          }
        })
      );
    }
  }

  const results = await Promise.all(tasks);
  return results.filter((r): r is ExecutionResult => r !== null);
}
