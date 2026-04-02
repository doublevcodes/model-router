import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSafety, checkAllSafety } from '../benchmark/whitecircle.js';

describe('White Circle Safety', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null safetyScore when no API token is set', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'whitecircleApiToken', { value: '', writable: true });

    const result = await checkSafety('some text to check');
    expect(result.safetyScore).toBeNull();
    expect(result.violations).toEqual([]);
  });

  it('calls White Circle API with correct endpoint and token', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'whitecircleApiToken', { value: 'test-token', writable: true });
    Object.defineProperty(config, 'whitecircleEndpoint', { value: 'https://test.whitecircle.ai', writable: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ score: 95, violations: [] }),
    } as any);

    await checkSafety('safe text');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://test.whitecircle.ai/v1/check');
    expect((opts as any).headers.Authorization).toBe('Bearer test-token');
  });

  it('parses violations from array format', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'whitecircleApiToken', { value: 'test-token', writable: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        violations: ['toxicity', 'pii_leak'],
        score: 40,
      }),
    } as any);

    const result = await checkSafety('unsafe text');
    expect(result.safetyScore).toBe(40);
    expect(result.violations).toEqual(['toxicity', 'pii_leak']);
  });

  it('parses violations from categories object format', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'whitecircleApiToken', { value: 'test-token', writable: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        categories: { toxicity: true, violence: false, pii: true },
      }),
    } as any);

    const result = await checkSafety('text with issues');
    expect(result.violations).toContain('toxicity');
    expect(result.violations).toContain('pii');
    expect(result.violations).not.toContain('violence');
    expect(result.safetyScore).toBeLessThan(100);
  });

  it('handles API errors gracefully', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'whitecircleApiToken', { value: 'test-token', writable: true });

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const result = await checkSafety('text');
    expect(result.safetyScore).toBeNull();
    expect(result.violations).toEqual([]);
  });

  it('checkAllSafety processes multiple items', async () => {
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'whitecircleApiToken', { value: '', writable: true });

    const items = [
      { key: 'm1:tc1', text: 'output 1' },
      { key: 'm2:tc1', text: 'output 2' },
      { key: 'm1:tc2', text: 'output 3' },
    ];

    const results = await checkAllSafety(items, 2);
    expect(results.size).toBe(3);
    expect(results.has('m1:tc1')).toBe(true);
    expect(results.has('m2:tc1')).toBe(true);
    expect(results.has('m1:tc2')).toBe(true);
  });
});
