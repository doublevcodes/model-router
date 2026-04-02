import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('HuggingFace Search', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searchHuggingFace calls the correct API endpoint', async () => {
    const { searchHuggingFace } = await import('../search/huggingface.js');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'meta-llama/Llama-3.1-70B-Instruct',
          modelId: 'meta-llama/Llama-3.1-70B-Instruct',
          author: 'meta-llama',
          downloads: 1000000,
          likes: 5000,
          pipeline_tag: 'text-generation',
          tags: ['text-generation', 'pytorch'],
        },
      ],
    } as any);

    const models = await searchHuggingFace('coding', 10);
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('meta-llama/Llama-3.1-70B-Instruct');

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('huggingface.co/api/models');
    expect(String(url)).toContain('pipeline_tag=text-generation');
  });

  it('hfModelsToModels converts HF format to Model format', async () => {
    const { hfModelsToModels } = await import('../search/huggingface.js');

    const hfModels = [
      {
        id: 'meta-llama/Llama-3.1-70B',
        modelId: 'meta-llama/Llama-3.1-70B',
        author: 'meta-llama',
        downloads: 500000,
        likes: 3000,
        pipeline_tag: 'text-generation',
        tags: ['text-generation'],
      },
    ];

    const models = hfModelsToModels(hfModels as any);
    expect(models).toHaveLength(1);
    expect(models[0].provider).toBe('meta-llama');
    expect(models[0].huggingfaceId).toBe('meta-llama/Llama-3.1-70B');
    expect(models[0].openrouterId).toBe('');
  });
});

describe('OpenRouter Cross-Reference', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('getOpenRouterModels fetches from OpenRouter API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'meta-llama/llama-3.1-70b-instruct',
            name: 'Llama 3.1 70B Instruct',
            description: 'A large language model',
            context_length: 128000,
            pricing: { prompt: '0.001', completion: '0.002' },
            architecture: { tokenizer: 'llama', instruct_type: 'chat', modality: 'text' },
          },
        ],
      }),
    } as any);

    const { getOpenRouterModels } = await import('../search/openrouter.js');
    const models = await getOpenRouterModels();
    expect(models.length).toBeGreaterThanOrEqual(1);
  });

  it('getTopOpenSourceModels filters for open source keywords', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'meta-llama/llama-3.1-70b', name: 'Llama 3.1', description: '', context_length: 8000, pricing: { prompt: '0', completion: '0' }, architecture: { tokenizer: '', instruct_type: null, modality: 'text' } },
          { id: 'openai/gpt-4o', name: 'GPT-4o', description: '', context_length: 128000, pricing: { prompt: '0.01', completion: '0.03' }, architecture: { tokenizer: '', instruct_type: null, modality: 'text' } },
          { id: 'mistralai/mistral-large', name: 'Mistral Large', description: '', context_length: 32000, pricing: { prompt: '0.002', completion: '0.006' }, architecture: { tokenizer: '', instruct_type: null, modality: 'text' } },
        ],
      }),
    } as any);

    const { getTopOpenSourceModels } = await import('../search/openrouter.js');
    const models = await getTopOpenSourceModels(10);
    const ids = models.map((m) => m.openrouterId);
    expect(ids).toContain('meta-llama/llama-3.1-70b');
    expect(ids).toContain('mistralai/mistral-large');
    expect(ids).not.toContain('openai/gpt-4o');
  });
});

describe('Search Orchestrator', () => {
  it('searchModels returns at most maxModels', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('huggingface')) {
        return { ok: true, json: async () => [] } as any;
      }
      if (urlStr.includes('openrouter')) {
        const models = Array.from({ length: 20 }, (_, i) => ({
          id: `meta-llama/llama-test-${i}`,
          name: `Llama Test ${i}`,
          description: '',
          context_length: 8000,
          pricing: { prompt: '0', completion: '0' },
          architecture: { tokenizer: '', instruct_type: null, modality: 'text' },
        }));
        return { ok: true, json: async () => ({ data: models }) } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const { searchModels } = await import('../search/index.js');
    const result = await searchModels('test task', 5);
    expect(result.models.length).toBeLessThanOrEqual(5);
    expect(result.taskType).toBeTruthy();
  });
});
