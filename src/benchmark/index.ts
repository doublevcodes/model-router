import type { Model, ModelSummary, TestCase } from '../shared/types.js';
import {
  insertBenchmarkRun,
  updateRunStatus,
  upsertModel,
  insertTestCase,
  insertBenchmarkResult,
  getModelSummaries,
} from '../shared/db.js';
import { searchModels } from '../search/index.js';
import { generateTestCases } from './generate.js';
import { executeAllModels } from './execute.js';
import { judgeAllOutputs } from './judge.js';
import { checkAllSafety } from './whitecircle.js';

export interface BenchmarkRunResult {
  runId: string;
  results: ModelSummary[];
  dashboardUrl: string;
}

function generateSlug(useCase: string): string {
  return useCase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

export async function runBenchmark(
  useCase: string,
  modelIds: string[],
  numTestCases: number = 5
): Promise<BenchmarkRunResult> {
  const slug = generateSlug(useCase);
  const runId = await insertBenchmarkRun(useCase, slug);
  await updateRunStatus(runId, 'running');

  try {
    let models: Model[];
    if (modelIds.length > 0) {
      models = modelIds.map((id) => ({
        id,
        name: id.split('/').pop() || id,
        provider: id.split('/')[0] || 'unknown',
        parameterCount: null,
        huggingfaceId: '',
        openrouterId: id,
        tags: [],
      }));
    } else {
      const searchResult = await searchModels(useCase, 10);
      models = searchResult.models;
      if (models.length === 0) {
        throw new Error('No models found for this use case');
      }
    }

    for (const model of models) {
      await upsertModel(model);
    }

    const rawTestCases = await generateTestCases(useCase, numTestCases);
    const testCases: TestCase[] = [];
    for (const tc of rawTestCases) {
      const id = await insertTestCase(runId, tc);
      testCases.push({ id, ...tc });
    }

    const openRouterIds = models.map((m) => m.openrouterId);
    const execResults = await executeAllModels(openRouterIds, testCases, 3);

    const testCaseMap = new Map(testCases.map((tc) => [tc.id, tc]));
    const judgeInputs = execResults.map((er) => {
      const tc = testCaseMap.get(er.testCaseId)!;
      return {
        modelId: er.modelId,
        testCaseId: er.testCaseId,
        output: er.output,
        input: tc.input,
        expectedBehavior: tc.expectedBehavior,
      };
    });

    const judgeResults = await judgeAllOutputs(judgeInputs, 5);

    const safetyInputs = execResults.map((er) => ({
      key: `${er.modelId}:${er.testCaseId}`,
      text: er.output,
    }));
    const safetyResults = await checkAllSafety(safetyInputs, 5);

    for (const er of execResults) {
      const key = `${er.modelId}:${er.testCaseId}`;
      const judge = judgeResults.get(key) || { score: 0, reasoning: 'No judge result' };
      const safety = safetyResults.get(key) || { safetyScore: null, violations: [] };

      await insertBenchmarkResult({
        runId,
        modelId: er.modelId,
        testCaseId: er.testCaseId,
        output: er.output,
        score: judge.score,
        latencyMs: er.latencyMs,
        tokensIn: er.tokensIn,
        tokensOut: er.tokensOut,
        safetyScore: safety.safetyScore,
        safetyViolations: safety.violations,
        judgeReasoning: judge.reasoning,
      });
    }

    await updateRunStatus(runId, 'completed');
    const summaries = await getModelSummaries(runId);

    return {
      runId,
      results: summaries,
      dashboardUrl: `http://localhost:5173/runs/${runId}`,
    };
  } catch (err) {
    await updateRunStatus(runId, 'failed').catch(() => {});
    throw err;
  }
}
