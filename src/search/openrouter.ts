import type { Model } from '../shared/types.js';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  architecture: { tokenizer: string; instruct_type: string | null; modality: string };
}

let cachedModels: OpenRouterModel[] | null = null;

export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (cachedModels) return cachedModels;

  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  cachedModels = data.data || [];
  return cachedModels!;
}

export async function crossReferenceWithOpenRouter(hfModels: Model[]): Promise<Model[]> {
  const orModels = await getOpenRouterModels();

  const orModelMap = new Map<string, OpenRouterModel>();
  for (const m of orModels) {
    orModelMap.set(m.id.toLowerCase(), m);
    const lastSegment = m.id.split('/').pop()?.toLowerCase();
    if (lastSegment) orModelMap.set(lastSegment, m);
  }

  const matched: Model[] = [];

  for (const hfModel of hfModels) {
    const hfId = hfModel.huggingfaceId.toLowerCase();
    const hfName = hfId.split('/').pop() || '';

    let orModel = orModelMap.get(hfId);

    if (!orModel) {
      for (const [orId, orm] of orModelMap) {
        if (orId.includes(hfName) || hfName.includes(orId.split('/').pop() || '')) {
          orModel = orm;
          break;
        }
      }
    }

    if (orModel) {
      matched.push({
        ...hfModel,
        openrouterId: orModel.id,
        name: orModel.name || hfModel.name,
      });
    }
  }

  return matched;
}

export async function getTopOpenSourceModels(limit: number = 50): Promise<Model[]> {
  const orModels = await getOpenRouterModels();

  const openSourceKeywords = [
    'llama', 'mistral', 'qwen', 'deepseek', 'gemma', 'phi',
    'command', 'dbrx', 'yi', 'solar', 'nous', 'openchat',
    'dolphin', 'wizardlm', 'codellama', 'starcoder',
  ];

  const openSource = orModels.filter(m =>
    openSourceKeywords.some(kw => m.id.includes(kw))
  );

  return openSource.slice(0, limit).map(m => ({
    id: m.id,
    name: m.name,
    provider: m.id.split('/')[0] || 'unknown',
    parameterCount: null,
    huggingfaceId: '',
    openrouterId: m.id,
    tags: [],
  }));
}
