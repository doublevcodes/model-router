import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

const app = new Hono();
app.use('/*', cors());

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const RUN_IDS = [
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'd4e5f6a7-b8c9-0123-defa-234567890123',
];

const runs = [
  {
    id: RUN_IDS[0],
    use_case: 'Code generation for React components',
    use_case_slug: 'code-generation-react',
    status: 'completed',
    created_at: '2026-03-28T14:30:00Z',
    completed_at: '2026-03-28T14:42:00Z',
  },
  {
    id: RUN_IDS[1],
    use_case: 'Summarization of scientific papers',
    use_case_slug: 'scientific-paper-summarization',
    status: 'completed',
    created_at: '2026-03-30T09:15:00Z',
    completed_at: '2026-03-30T09:28:00Z',
  },
  {
    id: RUN_IDS[2],
    use_case: 'SQL query generation from natural language',
    use_case_slug: 'sql-query-generation',
    status: 'completed',
    created_at: '2026-04-01T11:00:00Z',
    completed_at: '2026-04-01T11:18:00Z',
  },
  {
    id: RUN_IDS[3],
    use_case: 'Customer support chatbot responses',
    use_case_slug: 'customer-support-chatbot',
    status: 'running',
    created_at: '2026-04-02T08:45:00Z',
    completed_at: null,
  },
];

const MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'meta-llama/llama-3.1-70b', name: 'Llama 3.1 70B' },
  { id: 'mistralai/mistral-large-2', name: 'Mistral Large 2' },
  { id: 'deepseek/deepseek-v3', name: 'DeepSeek V3' },
];

// Per-run summaries keyed by run id
const summariesByRun: Record<string, any[]> = {
  [RUN_IDS[0]]: [
    { modelId: 'anthropic/claude-3.5-sonnet', modelName: 'Claude 3.5 Sonnet', overallScore: 92.4, accuracyScore: 94.0, safetyScore: 96, avgLatencyMs: 1820, avgTokensOut: 340, rank: 1 },
    { modelId: 'openai/gpt-4o', modelName: 'GPT-4o', overallScore: 89.1, accuracyScore: 90.5, safetyScore: 94, avgLatencyMs: 2100, avgTokensOut: 380, rank: 2 },
    { modelId: 'google/gemini-1.5-pro', modelName: 'Gemini 1.5 Pro', overallScore: 85.7, accuracyScore: 87.0, safetyScore: 91, avgLatencyMs: 1950, avgTokensOut: 420, rank: 3 },
    { modelId: 'deepseek/deepseek-v3', modelName: 'DeepSeek V3', overallScore: 83.2, accuracyScore: 85.0, safetyScore: 88, avgLatencyMs: 1340, avgTokensOut: 290, rank: 4 },
    { modelId: 'meta-llama/llama-3.1-70b', modelName: 'Llama 3.1 70B', overallScore: 78.5, accuracyScore: 80.0, safetyScore: 82, avgLatencyMs: 980, avgTokensOut: 510, rank: 5 },
    { modelId: 'mistralai/mistral-large-2', modelName: 'Mistral Large 2', overallScore: 76.3, accuracyScore: 78.0, safetyScore: 85, avgLatencyMs: 1560, avgTokensOut: 460, rank: 6 },
  ],
  [RUN_IDS[1]]: [
    { modelId: 'openai/gpt-4o', modelName: 'GPT-4o', overallScore: 91.8, accuracyScore: 93.0, safetyScore: 97, avgLatencyMs: 2350, avgTokensOut: 520, rank: 1 },
    { modelId: 'anthropic/claude-3.5-sonnet', modelName: 'Claude 3.5 Sonnet', overallScore: 90.2, accuracyScore: 91.5, safetyScore: 95, avgLatencyMs: 2100, avgTokensOut: 480, rank: 2 },
    { modelId: 'google/gemini-1.5-pro', modelName: 'Gemini 1.5 Pro', overallScore: 86.4, accuracyScore: 88.0, safetyScore: 92, avgLatencyMs: 1880, avgTokensOut: 550, rank: 3 },
    { modelId: 'deepseek/deepseek-v3', modelName: 'DeepSeek V3', overallScore: 82.9, accuracyScore: 84.0, safetyScore: 90, avgLatencyMs: 1420, avgTokensOut: 390, rank: 4 },
    { modelId: 'mistralai/mistral-large-2', modelName: 'Mistral Large 2', overallScore: 79.6, accuracyScore: 81.0, safetyScore: 87, avgLatencyMs: 1650, avgTokensOut: 430, rank: 5 },
    { modelId: 'meta-llama/llama-3.1-70b', modelName: 'Llama 3.1 70B', overallScore: 74.1, accuracyScore: 76.0, safetyScore: 78, avgLatencyMs: 1100, avgTokensOut: 620, rank: 6 },
  ],
  [RUN_IDS[2]]: [
    { modelId: 'deepseek/deepseek-v3', modelName: 'DeepSeek V3', overallScore: 94.6, accuracyScore: 96.0, safetyScore: 93, avgLatencyMs: 1180, avgTokensOut: 210, rank: 1 },
    { modelId: 'anthropic/claude-3.5-sonnet', modelName: 'Claude 3.5 Sonnet', overallScore: 91.3, accuracyScore: 92.5, safetyScore: 95, avgLatencyMs: 1740, avgTokensOut: 260, rank: 2 },
    { modelId: 'openai/gpt-4o', modelName: 'GPT-4o', overallScore: 88.7, accuracyScore: 90.0, safetyScore: 94, avgLatencyMs: 2020, avgTokensOut: 280, rank: 3 },
    { modelId: 'google/gemini-1.5-pro', modelName: 'Gemini 1.5 Pro', overallScore: 84.1, accuracyScore: 86.0, safetyScore: 89, avgLatencyMs: 1900, avgTokensOut: 310, rank: 4 },
    { modelId: 'meta-llama/llama-3.1-70b', modelName: 'Llama 3.1 70B', overallScore: 80.8, accuracyScore: 82.0, safetyScore: 84, avgLatencyMs: 870, avgTokensOut: 350, rank: 5 },
    { modelId: 'mistralai/mistral-large-2', modelName: 'Mistral Large 2', overallScore: 77.4, accuracyScore: 79.0, safetyScore: 81, avgLatencyMs: 1490, avgTokensOut: 330, rank: 6 },
  ],
  [RUN_IDS[3]]: [],
};

// Test cases per run
const testCasesByRun: Record<string, { id: string; input: string; expectedBehavior: string; category: string }[]> = {
  [RUN_IDS[0]]: [
    { id: 'tc-r1-1', input: 'Create a responsive navbar component with a hamburger menu for mobile', expectedBehavior: 'Produces valid JSX with responsive design using media queries or Tailwind breakpoints', category: 'component-generation' },
    { id: 'tc-r1-2', input: 'Build a form component with validation for email, password, and confirm password fields', expectedBehavior: 'Includes proper form validation, error messages, and accessible labels', category: 'component-generation' },
    { id: 'tc-r1-3', input: 'Create a data table component with sorting, filtering, and pagination', expectedBehavior: 'Handles large datasets efficiently with working sort/filter/paginate controls', category: 'component-generation' },
  ],
  [RUN_IDS[1]]: [
    { id: 'tc-r2-1', input: 'Summarize this paper on transformer architectures and their impact on NLP', expectedBehavior: 'Captures key contributions, methodology, and results in 3-5 sentences', category: 'summarization' },
    { id: 'tc-r2-2', input: 'Provide a concise summary of this paper on CRISPR gene editing advances', expectedBehavior: 'Accurately represents the findings without hallucinating details', category: 'summarization' },
    { id: 'tc-r2-3', input: 'Summarize this climate science paper on ocean acidification trends', expectedBehavior: 'Preserves numerical data and statistical significance from the original', category: 'summarization' },
  ],
  [RUN_IDS[2]]: [
    { id: 'tc-r3-1', input: 'Find all customers who placed more than 3 orders in the last month and spent over $500 total', expectedBehavior: 'Correct JOIN between customers and orders tables with proper GROUP BY and HAVING clauses', category: 'sql-generation' },
    { id: 'tc-r3-2', input: 'Show the top 10 products by revenue with their category names, including products with zero sales', expectedBehavior: 'Uses LEFT JOIN to include zero-sale products, correct aggregation', category: 'sql-generation' },
    { id: 'tc-r3-3', input: 'Calculate the running average of daily sales for each store over the past 90 days', expectedBehavior: 'Correct window function with ROWS or RANGE frame specification', category: 'sql-generation' },
    { id: 'tc-r3-4', input: 'Find employees whose salary is above the average salary of their department', expectedBehavior: 'Correlated subquery or window function approach, both valid', category: 'sql-generation' },
  ],
  [RUN_IDS[3]]: [],
};

function generateDetailed(runId: string): any[] {
  const summaries = summariesByRun[runId] || [];
  const testCases = testCasesByRun[runId] || [];
  if (!summaries.length || !testCases.length) return [];

  const results: any[] = [];
  let counter = 0;

  const outputSnippets: Record<string, Record<string, string[]>> = {
    [RUN_IDS[0]]: {
      'anthropic/claude-3.5-sonnet': [
        'import React, { useState } from "react";\n\nexport function Navbar() {\n  const [isOpen, setIsOpen] = useState(false);\n  return (\n    <nav className="flex items-center justify-between p-4 bg-white shadow-md">\n      <div className="text-xl font-bold">Logo</div>\n      <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>\n        <MenuIcon />\n      </button>\n      <ul className={`md:flex gap-6 ${isOpen ? "block" : "hidden"} md:block`}>\n        <li><a href="/">Home</a></li>\n        <li><a href="/about">About</a></li>\n        <li><a href="/contact">Contact</a></li>\n      </ul>\n    </nav>\n  );\n}',
        'import React, { useState } from "react";\n\ninterface FormData { email: string; password: string; confirmPassword: string; }\ninterface Errors { email?: string; password?: string; confirmPassword?: string; }\n\nexport function SignupForm() {\n  const [form, setForm] = useState<FormData>({ email: "", password: "", confirmPassword: "" });\n  const [errors, setErrors] = useState<Errors>({});\n  // ... validation and submission logic\n}',
        'import React, { useState, useMemo } from "react";\n\ninterface Column<T> { key: keyof T; label: string; sortable?: boolean; }\n\nexport function DataTable<T extends Record<string, any>>({ data, columns, pageSize = 10 }: { data: T[]; columns: Column<T>[]; pageSize?: number }) {\n  const [sortKey, setSortKey] = useState<keyof T | null>(null);\n  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");\n  const [filter, setFilter] = useState("");\n  const [page, setPage] = useState(0);\n  // ... sorting, filtering, pagination logic\n}',
      ],
      'openai/gpt-4o': [
        'const Navbar = () => {\n  const [menuOpen, setMenuOpen] = React.useState(false);\n  return (\n    <header className="navbar">\n      <div className="navbar-brand">MyApp</div>\n      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>\n      <nav className={menuOpen ? "nav-links open" : "nav-links"}>\n        <a href="/">Home</a>\n        <a href="/about">About</a>\n      </nav>\n    </header>\n  );\n};',
        'function LoginForm() {\n  const [email, setEmail] = useState("");\n  const [password, setPassword] = useState("");\n  const [confirm, setConfirm] = useState("");\n  const [errors, setErrors] = useState({});\n\n  const validate = () => {\n    const errs = {};\n    if (!/\\S+@\\S+\\.\\S+/.test(email)) errs.email = "Invalid email";\n    if (password.length < 8) errs.password = "Min 8 characters";\n    if (password !== confirm) errs.confirmPassword = "Passwords do not match";\n    return errs;\n  };\n  // ...\n}',
        'function SortableTable({ data, columns }) {\n  const [sort, setSort] = useState({ key: null, direction: "asc" });\n  const [currentPage, setCurrentPage] = useState(1);\n  const [search, setSearch] = useState("");\n  const ITEMS_PER_PAGE = 10;\n  // ...\n}',
      ],
    },
  };

  const reasoningTemplates = [
    'The response correctly addresses the prompt requirements. Code structure is clean, type-safe, and follows React best practices. Minor improvement possible in error handling.',
    'Good implementation with proper separation of concerns. The solution handles edge cases well and uses appropriate React patterns.',
    'Solid output that meets most criteria. The code is functional and readable, though could benefit from more comprehensive accessibility attributes.',
    'The response demonstrates strong understanding of the requirements. Implementation is efficient and well-organized.',
    'Adequate solution with room for improvement. Core functionality works but some edge cases are not fully handled.',
    'Clean implementation with good TypeScript usage. The component API is intuitive and the code is well-structured.',
  ];

  for (const summary of summaries) {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const baseScore = summary.accuracyScore;
      const jitter = (Math.sin(counter * 13.7) * 8) - 2;
      const score = Math.max(40, Math.min(100, baseScore + jitter));

      const latencyBase = summary.avgLatencyMs;
      const latencyJitter = Math.round(Math.sin(counter * 7.3) * 300);
      const latency = Math.max(400, latencyBase + latencyJitter);

      const tokensBase = summary.avgTokensOut;
      const tokensJitter = Math.round(Math.sin(counter * 11.1) * 60);

      const snippets = outputSnippets[runId]?.[summary.modelId];
      const output = snippets?.[i] || `[Generated output for "${tc.input.slice(0, 60)}..."]\n\n// Model: ${summary.modelName}\n// This is a placeholder for the actual generated response.`;

      const safetyBase = summary.safetyScore || 90;
      const safetyJitter = Math.sin(counter * 5.3) * 8;
      const safety = Math.max(50, Math.min(100, safetyBase + safetyJitter));
      const violations: string[] = safety < 75 ? ['potentially_biased_output'] : [];

      results.push({
        id: `br-${runId.slice(0, 8)}-${counter}`,
        runId,
        modelId: summary.modelId,
        testCaseId: tc.id,
        output,
        score: Math.round(score * 10) / 10,
        latencyMs: latency,
        tokensIn: Math.round(120 + Math.sin(counter * 3.1) * 40),
        tokensOut: Math.max(80, tokensBase + tokensJitter),
        safetyScore: Math.round(safety * 10) / 10,
        safetyViolations: violations,
        judgeReasoning: reasoningTemplates[counter % reasoningTemplates.length],
      });
      counter++;
    }
  }

  return results;
}

// Pre-generate detailed results
const detailedByRun: Record<string, any[]> = {};
for (const id of RUN_IDS) {
  detailedByRun[id] = generateDetailed(id);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/runs', (c) => {
  return c.json({ runs });
});

app.get('/api/runs/:id', (c) => {
  const id = c.req.param('id');
  const run = runs.find((r) => r.id === id);
  if (!run) return c.json({ error: 'Run not found' }, 404);
  return c.json({ run, summaries: summariesByRun[id] || [] });
});

app.get('/api/runs/:id/results', (c) => {
  const id = c.req.param('id');
  const run = runs.find((r) => r.id === id);
  if (!run) return c.json({ error: 'Run not found' }, 404);
  return c.json({
    run,
    summaries: summariesByRun[id] || [],
    detailed: detailedByRun[id] || [],
    testCases: testCasesByRun[id] || [],
  });
});

app.get('/api/search', (c) => {
  const q = (c.req.query('q') || '').toLowerCase();
  if (!q) return c.json({ runs: [] });
  const filtered = runs.filter(
    (r) =>
      r.use_case.toLowerCase().includes(q) ||
      r.use_case_slug.includes(q)
  );
  return c.json({ runs: filtered });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT) || 3001;
console.log(`Mock Switchboard API running on http://localhost:${port}`);
console.log(`  ${runs.length} benchmark runs`);
console.log(`  ${MODELS.length} models`);
console.log(`  ${Object.values(detailedByRun).flat().length} detailed results`);
serve({ fetch: app.fetch, port });
