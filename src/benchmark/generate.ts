import { config } from '../shared/config.js';
import type { TestCase } from '../shared/types.js';

export async function generateTestCases(
  useCase: string,
  numCases: number = 5
): Promise<Omit<TestCase, 'id'>[]> {
  if (!config.anthropicApiKey) {
    return generateFallbackTestCases(useCase, numCases);
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
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Generate exactly ${numCases} test cases for benchmarking LLMs on this use case:
"${useCase}"

Each test case should be diverse and test different aspects (accuracy, edge cases, formatting, reasoning).

Return ONLY a JSON array. Each element must have:
- "input": the exact prompt to send to the model
- "expectedBehavior": a clear description of what a good response looks like (used as judging rubric)
- "category": one of "accuracy", "edge_case", "formatting", "reasoning"

Example format:
[
  {
    "input": "Summarize this text: ...",
    "expectedBehavior": "A concise 2-3 sentence summary capturing the main points...",
    "category": "accuracy"
  }
]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const parsed: Array<{ input: string; expectedBehavior: string; category: string }> =
      JSON.parse(jsonMatch[0]);

    return parsed.map((tc) => ({
      input: tc.input,
      expectedBehavior: tc.expectedBehavior,
      category: tc.category || 'accuracy',
    }));
  } catch (err) {
    console.error('Test case generation via Claude failed, using fallback:', err);
    return generateFallbackTestCases(useCase, numCases);
  }
}

function generateFallbackTestCases(
  useCase: string,
  numCases: number
): Omit<TestCase, 'id'>[] {
  const templates = [
    {
      input: `Given this task: "${useCase}"\n\nProvide a high-quality response that demonstrates expertise.`,
      expectedBehavior:
        'Response should be relevant, accurate, well-structured, and directly address the use case.',
      category: 'accuracy',
    },
    {
      input: `${useCase}\n\nNow handle this edge case: the input is extremely short or vague. Respond appropriately.`,
      expectedBehavior:
        'Model should handle ambiguous input gracefully, asking for clarification or making reasonable assumptions.',
      category: 'edge_case',
    },
    {
      input: `${useCase}\n\nProvide your response in a structured format with clear sections and bullet points.`,
      expectedBehavior:
        'Response should be well-formatted with clear headings, bullet points, and logical organization.',
      category: 'formatting',
    },
    {
      input: `${useCase}\n\nExplain your reasoning step by step before giving your final answer.`,
      expectedBehavior:
        'Model should show clear chain-of-thought reasoning before arriving at a conclusion.',
      category: 'reasoning',
    },
    {
      input: `${useCase}\n\nProvide a concise response in under 100 words while maintaining accuracy.`,
      expectedBehavior:
        'Response should be brief yet accurate, demonstrating ability to be concise without losing key information.',
      category: 'accuracy',
    },
    {
      input: `${useCase}\n\nHandle a complex, multi-part request that requires considering multiple factors.`,
      expectedBehavior:
        'Model should address all parts of the request systematically without missing any components.',
      category: 'reasoning',
    },
  ];

  return templates.slice(0, numCases);
}
