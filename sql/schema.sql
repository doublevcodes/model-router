CREATE TABLE IF NOT EXISTS benchmark_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case TEXT NOT NULL,
  use_case_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT,
  parameter_count BIGINT,
  huggingface_id TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES benchmark_runs(id),
  input TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  category TEXT
);

CREATE TABLE IF NOT EXISTS benchmark_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES benchmark_runs(id),
  model_id TEXT REFERENCES models(id),
  test_case_id UUID REFERENCES test_cases(id),
  output TEXT,
  score REAL,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  safety_score REAL,
  safety_violations TEXT[],
  judge_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_slug ON benchmark_runs(use_case_slug);
CREATE INDEX IF NOT EXISTS idx_results_run ON benchmark_results(run_id);
CREATE INDEX IF NOT EXISTS idx_results_model ON benchmark_results(model_id);
