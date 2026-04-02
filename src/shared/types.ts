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
  models: Model[];
  testCases: TestCase[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt: Date | null;
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
