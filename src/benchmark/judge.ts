import { config } from '../shared/config.js';

export interface JudgeResult {
  score: number;
  reasoning: string;
}

export async function judgeOutput(
  input: string,
  expectedBehavior: string,
  modelOutput: string
): Promise<JudgeResult> {
  if (!config.anthropicApiKey) {
    return heuristicJudge(modelOutput, expectedBehavior);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.judgeModel,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are an expert LLM evaluator. Score the following model output from 0 to 100.

**Test input given to the model:**
${input}

**What a good response should look like:**
${expectedBehavior}

**Model's actual output:**
${modelOutput}

Score criteria:
- 90-100: Excellent - fully meets expectations, well-written
- 70-89: Good - mostly meets expectations with minor issues
- 50-69: Adequate - partially meets expectations
- 30-49: Poor - significant gaps or errors
- 0-29: Very poor - fails to address the task, errors, or harmful content

Return ONLY valid JSON: { "score": <number 0-100>, "reasoning": "<brief explanation>" }`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Judge API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in judge response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning || ''),
    };
  } catch (err) {
    console.error('Judge via Claude failed, using heuristic:', err);
    return heuristicJudge(modelOutput, expectedBehavior);
  }
}

function heuristicJudge(output: string, expectedBehavior: string): JudgeResult {
  let score = 50;

  if (output.startsWith('[ERROR]')) {
    return { score: 0, reasoning: 'Model returned an error' };
  }

  if (output.length > 50) score += 10;
  if (output.length > 200) score += 10;

  const expectedWords = expectedBehavior.toLowerCase().split(/\s+/);
  const outputLower = output.toLowerCase();
  const matchCount = expectedWords.filter((w) => outputLower.includes(w)).length;
  const matchRatio = expectedWords.length > 0 ? matchCount / expectedWords.length : 0;
  score += Math.round(matchRatio * 20);

  if (output.includes('\n')) score += 5;

  return {
    score: Math.min(100, score),
    reasoning: `Heuristic evaluation: length=${output.length}, keyword_match=${Math.round(matchRatio * 100)}%`,
  };
}

export async function judgeAllOutputs(
  results: Array<{
    modelId: string;
    testCaseId: string;
    output: string;
    input: string;
    expectedBehavior: string;
  }>,
  concurrency: number = 5
): Promise<Map<string, JudgeResult>> {
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrency);

  const judgeMap = new Map<string, JudgeResult>();

  const tasks = results.map((r) =>
    limit(async () => {
      const key = `${r.modelId}:${r.testCaseId}`;
      const result = await judgeOutput(r.input, r.expectedBehavior, r.output);
      judgeMap.set(key, result);
    })
  );

  await Promise.all(tasks);
  return judgeMap;
}
