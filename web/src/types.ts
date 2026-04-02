export interface Model {
  id: string;
  name: string;
  provider: string;
  parameterCount: number | null;
  huggingfaceId: string;
  openrouterId: string;
  tags: string[];
}

export interface BenchmarkRun {
  id: string;
  useCase: string;
  useCaseSlug: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
}

export interface BenchmarkRunRow {
  id: string;
  use_case: string;
  use_case_slug: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface TestCase {
  id: string;
  input: string;
  expectedBehavior: string;
  category: string;
}

export interface BenchmarkResult {
  id: string;
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
}

export interface ModelSummary {
  modelId: string;
  modelName: string;
  overallScore: number;
  accuracyScore: number;
  safetyScore: number;
  avgLatencyMs: number;
  avgTokensOut: number;
  rank: number;
}
