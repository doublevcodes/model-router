import { describe, it, expect, vi } from 'vitest';
import { generateTestCases } from '../benchmark/generate.js';

describe('Test Case Generation', () => {
  it('generates fallback test cases when no API key is set', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const cases = await generateTestCases('summarize customer support tickets', 3);
    expect(cases).toHaveLength(3);
    cases.forEach((tc) => {
      expect(tc.input).toBeTruthy();
      expect(typeof tc.input).toBe('string');
      expect(tc.expectedBehavior).toBeTruthy();
      expect(typeof tc.expectedBehavior).toBe('string');
      expect(['accuracy', 'edge_case', 'formatting', 'reasoning']).toContain(tc.category);
    });
  });

  it('fallback test cases include the use case text', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const useCase = 'extract invoice data';
    const cases = await generateTestCases(useCase, 5);
    const allInputs = cases.map((c) => c.input).join(' ');
    expect(allInputs).toContain(useCase);
  });

  it('respects the numCases parameter', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    for (const n of [1, 2, 4, 6]) {
      const cases = await generateTestCases('test task', n);
      expect(cases.length).toBeLessThanOrEqual(n);
      expect(cases.length).toBeGreaterThan(0);
    }
  });

  it('each test case has all required fields', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { config } = await import('../shared/config.js');
    Object.defineProperty(config, 'anthropicApiKey', { value: '', writable: true });

    const cases = await generateTestCases('coding assistant', 5);
    cases.forEach((tc) => {
      expect(tc).toHaveProperty('input');
      expect(tc).toHaveProperty('expectedBehavior');
      expect(tc).toHaveProperty('category');
    });
  });
});
