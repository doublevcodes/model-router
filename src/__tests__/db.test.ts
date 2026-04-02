import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Database Schema', () => {
  const schema = readFileSync(resolve('sql/schema.sql'), 'utf-8');

  it('creates benchmark_runs table', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS benchmark_runs');
    expect(schema).toContain('id UUID PRIMARY KEY');
    expect(schema).toContain('use_case TEXT NOT NULL');
    expect(schema).toContain('use_case_slug TEXT NOT NULL');
    expect(schema).toContain("status TEXT NOT NULL DEFAULT 'pending'");
    expect(schema).toContain('created_at TIMESTAMPTZ');
    expect(schema).toContain('completed_at TIMESTAMPTZ');
  });

  it('creates models table', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS models');
    expect(schema).toContain('id TEXT PRIMARY KEY');
    expect(schema).toContain('name TEXT NOT NULL');
    expect(schema).toContain('parameter_count BIGINT');
    expect(schema).toContain('huggingface_id TEXT');
    expect(schema).toContain('tags TEXT[]');
  });

  it('creates test_cases table with FK to benchmark_runs', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS test_cases');
    expect(schema).toContain('run_id UUID REFERENCES benchmark_runs(id)');
    expect(schema).toContain('input TEXT NOT NULL');
    expect(schema).toContain('expected_behavior TEXT NOT NULL');
  });

  it('creates benchmark_results table with FKs', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS benchmark_results');
    expect(schema).toContain('run_id UUID REFERENCES benchmark_runs(id)');
    expect(schema).toContain('model_id TEXT REFERENCES models(id)');
    expect(schema).toContain('test_case_id UUID REFERENCES test_cases(id)');
    expect(schema).toContain('score REAL');
    expect(schema).toContain('latency_ms INTEGER');
    expect(schema).toContain('safety_score REAL');
    expect(schema).toContain('safety_violations TEXT[]');
    expect(schema).toContain('judge_reasoning TEXT');
  });

  it('creates indexes for performance', () => {
    expect(schema).toContain('idx_runs_slug ON benchmark_runs(use_case_slug)');
    expect(schema).toContain('idx_results_run ON benchmark_results(run_id)');
    expect(schema).toContain('idx_results_model ON benchmark_results(model_id)');
  });
});

describe('Database Client Module', () => {
  const dbSource = readFileSync(resolve('src/shared/db.ts'), 'utf-8');

  it('exports insertBenchmarkRun function', () => {
    expect(dbSource).toContain('export async function insertBenchmarkRun');
  });

  it('exports updateRunStatus function', () => {
    expect(dbSource).toContain('export async function updateRunStatus');
  });

  it('exports upsertModel function', () => {
    expect(dbSource).toContain('export async function upsertModel');
  });

  it('exports insertTestCase function', () => {
    expect(dbSource).toContain('export async function insertTestCase');
  });

  it('exports insertBenchmarkResult function', () => {
    expect(dbSource).toContain('export async function insertBenchmarkResult');
  });

  it('exports getRunById function', () => {
    expect(dbSource).toContain('export async function getRunById');
  });

  it('exports getResultsByRun function', () => {
    expect(dbSource).toContain('export async function getResultsByRun');
  });

  it('exports getModelSummaries function', () => {
    expect(dbSource).toContain('export async function getModelSummaries');
  });

  it('exports searchExistingResults function', () => {
    expect(dbSource).toContain('export async function searchExistingResults');
  });

  it('exports getAllRuns function', () => {
    expect(dbSource).toContain('export async function getAllRuns');
  });

  it('exports searchRuns function', () => {
    expect(dbSource).toContain('export async function searchRuns');
  });

  it('uses Neon serverless client', () => {
    expect(dbSource).toContain('@neondatabase/serverless');
    expect(dbSource).toContain('neon(');
  });
});
