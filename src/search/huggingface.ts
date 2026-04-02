import type { Model } from '../shared/types.js';

interface HFModel {
  id: string;
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  pipeline_tag: string;
  tags: string[];
  siblings?: any[];
}

const TASK_PIPELINE_MAP: Record<string, string> = {
  coding: 'text-generation',
  summarization: 'text-generation',
  reasoning: 'text-generation',
  extraction: 'text-generation',
  conversation: 'text-generation',
  translation: 'text-generation',
  classification: 'text-classification',
  'question-answering': 'question-answering',
  default: 'text-generation',
};

export async function searchHuggingFace(taskType: string, limit: number = 50): Promise<HFModel[]> {
  const pipelineTag = TASK_PIPELINE_MAP[taskType] || TASK_PIPELINE_MAP.default;

  const params = new URLSearchParams({
    pipeline_tag: pipelineTag,
    sort: 'downloads',
    direction: '-1',
    limit: String(limit),
    filter: 'text-generation-inference',
  });

  const response = await fetch(`https://huggingface.co/api/models?${params}`);
  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function hfModelsToModels(hfModels: HFModel[]): Model[] {
  return hfModels
    .filter(m => m.id && m.pipeline_tag)
    .map(m => ({
      id: m.id,
      name: m.id.split('/').pop() || m.id,
      provider: m.author || m.id.split('/')[0] || 'unknown',
      parameterCount: null,
      huggingfaceId: m.id,
      openrouterId: '',
      tags: m.tags || [],
    }));
}
