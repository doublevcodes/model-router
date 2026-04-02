import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { BenchmarkRun, BenchmarkResult, Model, ModelSummary } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = process.env.SWITCHBOARD_STORE_PATH?.trim()
  ? resolve(process.env.SWITCHBOARD_STORE_PATH.trim())
  : resolve(__dirname, '../../data/store.json');
const DATA_DIR = dirname(STORE_PATH);

interface Store {
  runs: Array<{
    id: string;
    use_case: string;
    use_case_slug: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>;
  models: Array<{
    id: string;
    name: string;
    provider: string;
    parameter_count: number | null;
    huggingface_id: string;
    tags: string[];
  }>;
  test_cases: Array<{
    id: string;
    run_id: string;
    input: string;
    expected_behavior: string;
    category: string;
  }>;
  results: Array<{
    id: string;
    run_id: string;
    model_id: string;
    test_case_id: string;
    output: string;
    score: number;
    latency_ms: number;
    tokens_in: number;
    tokens_out: number;
    safety_score: number | null;
    safety_violations: string[];
    judge_reasoning: string;
    created_at: string;
  }>;
}

function loadStore(): Store {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {
    // Corrupted file — start fresh
  }
  return { runs: [], models: [], test_cases: [], results: [] };
}

function saveStore(store: Store): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

let store = loadStore();

/** Reload store from disk so long-lived MCP/API processes see external updates (e.g. seed script). Skipped under Vitest so tests use in-memory state only. */
function reloadFromDiskIfNotTest(): void {
  if (process.env.VITEST === 'true') return;
  store = loadStore();
}

export async function insertBenchmarkRun(useCase: string, useCaseSlug: string): Promise<string> {
  reloadFromDiskIfNotTest();
  const id = randomUUID();
  store.runs.push({
    id,
    use_case: useCase,
    use_case_slug: useCaseSlug,
    status: 'pending',
    created_at: new Date().toISOString(),
    completed_at: null,
  });
  saveStore(store);
  return id;
}

export async function updateRunStatus(runId: string, status: string): Promise<void> {
  reloadFromDiskIfNotTest();
  const run = store.runs.find((r) => r.id === runId);
  if (run) {
    run.status = status;
    if (status === 'completed' || status === 'failed') {
      run.completed_at = new Date().toISOString();
    }
    saveStore(store);
  }
}

export async function upsertModel(model: Model): Promise<void> {
  reloadFromDiskIfNotTest();
  const existing = store.models.find((m) => m.id === model.openrouterId);
  if (existing) {
    existing.name = model.name;
    existing.provider = model.provider;
    existing.parameter_count = model.parameterCount;
    existing.huggingface_id = model.huggingfaceId;
    existing.tags = model.tags;
  } else {
    store.models.push({
      id: model.openrouterId,
      name: model.name,
      provider: model.provider,
      parameter_count: model.parameterCount,
      huggingface_id: model.huggingfaceId,
      tags: model.tags,
    });
  }
  saveStore(store);
}

export async function insertTestCase(runId: string, testCase: { input: string; expectedBehavior: string; category: string }): Promise<string> {
  reloadFromDiskIfNotTest();
  const id = randomUUID();
  store.test_cases.push({
    id,
    run_id: runId,
    input: testCase.input,
    expected_behavior: testCase.expectedBehavior,
    category: testCase.category,
  });
  saveStore(store);
  return id;
}

export async function insertBenchmarkResult(result: {
  runId: string;
  modelId: string;
  testCaseId: string;
  output: string;
  score: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  safetyScore: number | null;
  safetyViolations: string[];
  judgeReasoning: string;
}): Promise<string> {
  reloadFromDiskIfNotTest();
  const id = randomUUID();
  store.results.push({
    id,
    run_id: result.runId,
    model_id: result.modelId,
    test_case_id: result.testCaseId,
    output: result.output,
    score: result.score,
    latency_ms: result.latencyMs,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    safety_score: result.safetyScore,
    safety_violations: result.safetyViolations,
    judge_reasoning: result.judgeReasoning,
    created_at: new Date().toISOString(),
  });
  saveStore(store);
  return id;
}

export async function getRunById(runId: string): Promise<BenchmarkRun | null> {
  reloadFromDiskIfNotTest();
  const run = store.runs.find((r) => r.id === runId);
  if (!run) return null;
  const testCases = store.test_cases.filter((tc) => tc.run_id === runId);
  return {
    id: run.id,
    useCase: run.use_case,
    useCaseSlug: run.use_case_slug,
    models: [],
    testCases: testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedBehavior: tc.expected_behavior,
      category: tc.category,
    })),
    status: run.status as BenchmarkRun['status'],
    createdAt: new Date(run.created_at),
    completedAt: run.completed_at ? new Date(run.completed_at) : null,
  };
}

export async function getResultsByRun(runId: string): Promise<BenchmarkResult[]> {
  reloadFromDiskIfNotTest();
  return store.results
    .filter((r) => r.run_id === runId)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      id: r.id,
      runId: r.run_id,
      modelId: r.model_id,
      testCaseId: r.test_case_id,
      output: r.output,
      score: r.score,
      latencyMs: r.latency_ms,
      tokensIn: r.tokens_in,
      tokensOut: r.tokens_out,
      safetyScore: r.safety_score,
      safetyViolations: r.safety_violations || [],
      judgeReasoning: r.judge_reasoning,
    }));
}

export async function getModelSummaries(runId: string): Promise<ModelSummary[]> {
  reloadFromDiskIfNotTest();
  const runResults = store.results.filter((r) => r.run_id === runId);
  const byModel = new Map<string, typeof runResults>();

  for (const r of runResults) {
    if (!byModel.has(r.model_id)) byModel.set(r.model_id, []);
    byModel.get(r.model_id)!.push(r);
  }

  const summaries: ModelSummary[] = [];
  for (const [modelId, results] of byModel) {
    const model = store.models.find((m) => m.id === modelId);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const scores = results.map((r) => r.score);
    const safetyScores = results.map((r) => r.safety_score).filter((s): s is number => s !== null);
    const latencies = results.map((r) => r.latency_ms);
    const tokensOut = results.map((r) => r.tokens_out);

    summaries.push({
      modelId,
      modelName: model?.name || modelId.split('/').pop() || modelId,
      overallScore: Math.round(avg(scores) * 100) / 100,
      accuracyScore: Math.round(avg(scores) * 100) / 100,
      safetyScore: safetyScores.length > 0 ? Math.round(avg(safetyScores) * 100) / 100 : 0,
      avgLatencyMs: Math.round(avg(latencies)),
      avgTokensOut: Math.round(avg(tokensOut)),
      rank: 0,
    });
  }

  summaries.sort((a, b) => b.overallScore - a.overallScore);
  summaries.forEach((s, i) => (s.rank = i + 1));
  return summaries;
}

export async function searchExistingResults(useCaseSlug: string): Promise<{ runId: string; useCase: string; summaries: ModelSummary[] }[]> {
  reloadFromDiskIfNotTest();
  const slug = useCaseSlug.toLowerCase();
  const matchingRuns = store.runs
    .filter((r) => r.use_case_slug.toLowerCase().includes(slug) && r.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const results = [];
  for (const run of matchingRuns) {
    const summaries = await getModelSummaries(run.id);
    results.push({ runId: run.id, useCase: run.use_case, summaries });
  }
  return results;
}

export async function getAllRuns(): Promise<any[]> {
  reloadFromDiskIfNotTest();
  return [...store.runs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function searchRuns(query: string): Promise<any[]> {
  reloadFromDiskIfNotTest();
  const q = query.toLowerCase();
  return store.runs
    .filter((r) => r.use_case.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function _resetStoreForTests(): void {
  store = { runs: [], models: [], test_cases: [], results: [] };
}
