import { describe, it, expect } from 'vitest';

describe('Config', () => {
  it('exports a config object with all required keys', async () => {
    const { config } = await import('../shared/config.js');
    expect(config).toBeDefined();
    expect(typeof config.openrouterApiKey).toBe('string');
    expect(typeof config.anthropicApiKey).toBe('string');
    expect(typeof config.whitecircleApiToken).toBe('string');
    expect(typeof config.whitecircleEndpoint).toBe('string');
    expect(typeof config.judgeModel).toBe('string');
  });

  it('whitecircleEndpoint defaults to https://api.whitecircle.ai', async () => {
    const { config } = await import('../shared/config.js');
    if (!process.env.WHITECIRCLE_ENDPOINT) {
      expect(config.whitecircleEndpoint).toBe('https://api.whitecircle.ai');
    }
  });

  it('judgeModel has a sensible default', async () => {
    const { config } = await import('../shared/config.js');
    expect(config.judgeModel).toMatch(/claude/);
  });

  it('does not contain neonDatabaseUrl', async () => {
    const { config } = await import('../shared/config.js');
    expect(config).not.toHaveProperty('neonDatabaseUrl');
  });
});
