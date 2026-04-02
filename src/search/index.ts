import type { Model, ModelSummary } from '../shared/types.js';
import { searchHuggingFace, hfModelsToModels } from './huggingface.js';
import { crossReferenceWithOpenRouter, getTopOpenSourceModels } from './openrouter.js';
import { searchExistingResults } from '../shared/db.js';
import { config } from '../shared/config.js';

export interface SearchResult {
  models: Model[];
  existingResults: { runId: string; useCase: string; summaries: ModelSummary[] }[] | null;
  taskType: string;
}

async function classifyTaskType(useCase: string): Promise<{ taskType: string; keywords: string[] }> {
  if (!config.anthropicApiKey) {
    return fallbackClassify(useCase);
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Classify this LLM use case into exactly one category and extract search keywords.
Use case: "${useCase}"

Categories: coding, summarization, reasoning, extraction, conversation, translation, classification, tool_use, creative_writing

Return JSON only: { "taskType": "...", "keywords": ["...", "..."] }`,
        }],
      }),
    });

    if (!response.ok) throw new Error('Claude API error');
    const data = await response.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // Fall through to keyword-based classification
  }

  return fallbackClassify(useCase);
}

function fallbackClassify(useCase: string): { taskType: string; keywords: string[] } {
  const lower = useCase.toLowerCase();
  if (lower.includes('code') || lower.includes('programming') || lower.includes('debug')) return { taskType: 'coding', keywords: ['code'] };
  if (lower.includes('summar')) return { taskType: 'summarization', keywords: ['summary'] };
  if (lower.includes('translat')) return { taskType: 'translation', keywords: ['translate'] };
  if (lower.includes('classif') || lower.includes('categoriz')) return { taskType: 'classification', keywords: ['classify'] };
  if (lower.includes('extract')) return { taskType: 'extraction', keywords: ['extract'] };
  if (lower.includes('chat') || lower.includes('convers') || lower.includes('assist')) return { taskType: 'conversation', keywords: ['chat'] };
  if (lower.includes('reason') || lower.includes('math') || lower.includes('logic')) return { taskType: 'reasoning', keywords: ['reasoning'] };
  return { taskType: 'default', keywords: [] };
}

function generateSlug(useCase: string): string {
  return useCase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

export async function searchModels(useCase: string, maxModels: number = 10): Promise<SearchResult> {
  const { taskType } = await classifyTaskType(useCase);

  const slug = generateSlug(useCase);
  let existingResults: { runId: string; useCase: string; summaries: ModelSummary[] }[] | null = null;
  try {
    const existing = await searchExistingResults(slug);
    if (existing.length > 0) {
      existingResults = existing;
    }
  } catch {
    // DB might not be available yet
  }

  let models: Model[] = [];
  try {
    const hfModels = await searchHuggingFace(taskType, 50);
    const hfAsModels = hfModelsToModels(hfModels);
    models = await crossReferenceWithOpenRouter(hfAsModels);
  } catch (err) {
    console.error('HuggingFace search failed, falling back to OpenRouter direct:', err);
  }

  if (models.length < maxModels) {
    try {
      const orModels = await getTopOpenSourceModels(50);
      const existingIds = new Set(models.map(m => m.openrouterId));
      const additional = orModels.filter(m => !existingIds.has(m.openrouterId));
      models = [...models, ...additional];
    } catch (err) {
      console.error('OpenRouter fallback failed:', err);
    }
  }

  return {
    models: models.slice(0, maxModels),
    existingResults,
    taskType,
  };
}
