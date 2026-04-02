import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('MCP Server', () => {
  it('server source file exists and exports correctly', () => {
    const serverPath = resolve('src/mcp/server.ts');
    const content = readFileSync(serverPath, 'utf-8');

    expect(content).toContain("name: 'switchboard'");
    expect(content).toContain("version: '1.0.0'");
  });

  it('registers switchboard_find_models tool', () => {
    const content = readFileSync(resolve('src/mcp/server.ts'), 'utf-8');
    expect(content).toContain("'switchboard_find_models'");
    expect(content).toContain('use_case');
    expect(content).toContain('max_models');
  });

  it('registers switchboard_benchmark tool', () => {
    const content = readFileSync(resolve('src/mcp/server.ts'), 'utf-8');
    expect(content).toContain("'switchboard_benchmark'");
    expect(content).toContain('use_case');
    expect(content).toContain('models');
    expect(content).toContain('num_test_cases');
  });

  it('registers switchboard_results tool', () => {
    const content = readFileSync(resolve('src/mcp/server.ts'), 'utf-8');
    expect(content).toContain("'switchboard_results'");
    expect(content).toContain('run_id');
  });

  it('uses stdio transport', () => {
    const content = readFileSync(resolve('src/mcp/server.ts'), 'utf-8');
    expect(content).toContain('StdioServerTransport');
    expect(content).toContain('server.connect(transport)');
  });

  it('imports required modules', () => {
    const content = readFileSync(resolve('src/mcp/server.ts'), 'utf-8');
    expect(content).toContain('@modelcontextprotocol/sdk');
    expect(content).toContain('searchModels');
    expect(content).toContain('runBenchmark');
  });
});
