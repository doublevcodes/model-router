import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getRunById, getModelSummaries, getResultsByRun } from '../shared/db.js';
import { searchModels } from '../search/index.js';
import { runBenchmark } from '../benchmark/index.js';

const server = new McpServer({
  name: 'switchboard',
  version: '1.0.0',
});

server.tool(
  'switchboard_find_models',
  'Search across 13,000+ HuggingFace models and shared benchmark results to find the top 10 open-source models for your specific use case. Returns model candidates and any existing community benchmark results.',
  {
    use_case: z.string().describe('Description of what you need the model for, e.g. "summarize customer support tickets" or "extract structured data from invoices"'),
    max_models: z.number().optional().default(10).describe('Maximum number of models to return (default 10)'),
  },
  async ({ use_case, max_models }) => {
    try {
      const result = await searchModels(use_case, max_models);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `Error searching models: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'switchboard_benchmark',
  'Automatically benchmark open-source models on your specific use case. Generates test cases, runs each model, evaluates outputs with an LLM judge, checks safety with White Circle AI, and stores results in a shared database.',
  {
    use_case: z.string().describe('Description of the use case to benchmark'),
    models: z.array(z.string()).optional().describe('Optional list of OpenRouter model IDs to benchmark. If not provided, will auto-select top 10 from search.'),
    num_test_cases: z.number().optional().default(5).describe('Number of test cases to generate (default 5)'),
  },
  async ({ use_case, models, num_test_cases }) => {
    try {
      const result = await runBenchmark(use_case, models || [], num_test_cases);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `Error running benchmark: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'switchboard_results',
  'Retrieve detailed benchmark results for a specific run, including per-model summaries and per-test-case breakdowns.',
  {
    run_id: z.string().describe('The benchmark run ID to retrieve results for'),
  },
  async ({ run_id }) => {
    try {
      const run = await getRunById(run_id);
      if (!run) {
        return { content: [{ type: 'text' as const, text: `No benchmark run found with ID: ${run_id}` }], isError: true };
      }
      const summaries = await getModelSummaries(run_id);
      const detailed = await getResultsByRun(run_id);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ run, summaries, detailed }, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `Error retrieving results: ${error.message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
