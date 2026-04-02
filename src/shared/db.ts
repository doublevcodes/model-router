import { neon } from '@neondatabase/serverless';
import { config } from './config.js';
import type { BenchmarkRun, BenchmarkResult, Model, ModelSummary } from './types.js';

function getDb() {
  return neon(config.neonDatabaseUrl);
}

export async function insertBenchmarkRun(useCase: string, useCaseSlug: string): Promise<string> {
  const sql = getDb();
  const rows = await sql`INSERT INTO benchmark_runs (use_case, use_case_slug, status) VALUES (${useCase}, ${useCaseSlug}, 'pending') RETURNING id`;
  return rows[0].id;
}

export async function updateRunStatus(runId: string, status: string): Promise<void> {
  const sql = getDb();
  if (status === 'completed' || status === 'failed') {
    await sql`UPDATE benchmark_runs SET status = ${status}, completed_at = now() WHERE id = ${runId}`;
  } else {
    await sql`UPDATE benchmark_runs SET status = ${status} WHERE id = ${runId}`;
  }
}

export async function upsertModel(model: Model): Promise<void> {
  const sql = getDb();
  await sql`INSERT INTO models (id, name, provider, parameter_count, huggingface_id, tags)
    VALUES (${model.openrouterId}, ${model.name}, ${model.provider}, ${model.parameterCount}, ${model.huggingfaceId}, ${model.tags})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, provider = EXCLUDED.provider, parameter_count = EXCLUDED.parameter_count, huggingface_id = EXCLUDED.huggingface_id, tags = EXCLUDED.tags`;
}

export async function insertTestCase(runId: string, testCase: { input: string; expectedBehavior: string; category: string }): Promise<string> {
  const sql = getDb();
  const rows = await sql`INSERT INTO test_cases (run_id, input, expected_behavior, category) VALUES (${runId}, ${testCase.input}, ${testCase.expectedBehavior}, ${testCase.category}) RETURNING id`;
  return rows[0].id;
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
  const sql = getDb();
  const rows = await sql`INSERT INTO benchmark_results (run_id, model_id, test_case_id, output, score, latency_ms, tokens_in, tokens_out, safety_score, safety_violations, judge_reasoning)
    VALUES (${result.runId}, ${result.modelId}, ${result.testCaseId}, ${result.output}, ${result.score}, ${result.latencyMs}, ${result.tokensIn}, ${result.tokensOut}, ${result.safetyScore}, ${result.safetyViolations}, ${result.judgeReasoning})
    RETURNING id`;
  return rows[0].id;
}

export async function getRunById(runId: string): Promise<BenchmarkRun | null> {
  const sql = getDb();
  const runs = await sql`SELECT * FROM benchmark_runs WHERE id = ${runId}`;
  if (runs.length === 0) return null;
  const run = runs[0];
  const testCases = await sql`SELECT * FROM test_cases WHERE run_id = ${runId}`;
  return {
    id: run.id,
    useCase: run.use_case,
    useCaseSlug: run.use_case_slug,
    models: [],
    testCases: testCases.map((tc: any) => ({ id: tc.id, input: tc.input, expectedBehavior: tc.expected_behavior, category: tc.category })),
    status: run.status,
    createdAt: new Date(run.created_at),
    completedAt: run.completed_at ? new Date(run.completed_at) : null,
  };
}

export async function getResultsByRun(runId: string): Promise<BenchmarkResult[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM benchmark_results WHERE run_id = ${runId} ORDER BY score DESC`;
  return rows.map((r: any) => ({
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
  const sql = getDb();
  const rows = await sql`
    SELECT 
      br.model_id,
      m.name as model_name,
      AVG(br.score) as overall_score,
      AVG(br.score) as accuracy_score,
      AVG(br.safety_score) as safety_score,
      AVG(br.latency_ms) as avg_latency_ms,
      AVG(br.tokens_out) as avg_tokens_out
    FROM benchmark_results br
    JOIN models m ON m.id = br.model_id
    WHERE br.run_id = ${runId}
    GROUP BY br.model_id, m.name
    ORDER BY overall_score DESC
  `;
  return rows.map((r: any, i: number) => ({
    modelId: r.model_id,
    modelName: r.model_name,
    overallScore: Math.round(r.overall_score * 100) / 100,
    accuracyScore: Math.round(r.accuracy_score * 100) / 100,
    safetyScore: r.safety_score ? Math.round(r.safety_score * 100) / 100 : 0,
    avgLatencyMs: Math.round(r.avg_latency_ms),
    avgTokensOut: Math.round(r.avg_tokens_out),
    rank: i + 1,
  }));
}

export async function searchExistingResults(useCaseSlug: string): Promise<{ runId: string; useCase: string; summaries: ModelSummary[] }[]> {
  const sql = getDb();
  const runs = await sql`SELECT * FROM benchmark_runs WHERE use_case_slug ILIKE ${'%' + useCaseSlug + '%'} AND status = 'completed' ORDER BY created_at DESC LIMIT 5`;
  const results = [];
  for (const run of runs) {
    const summaries = await getModelSummaries(run.id);
    results.push({ runId: run.id, useCase: run.use_case, summaries });
  }
  return results;
}

export async function getAllRuns(): Promise<any[]> {
  const sql = getDb();
  return sql`SELECT * FROM benchmark_runs ORDER BY created_at DESC`;
}

export async function searchRuns(query: string): Promise<any[]> {
  const sql = getDb();
  return sql`SELECT * FROM benchmark_runs WHERE use_case ILIKE ${'%' + query + '%'} ORDER BY created_at DESC`;
}
