import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');
const STORE_PATH = resolve(DATA_DIR, 'store.json');

const RUN_ID = 'bm-' + randomUUID().slice(0, 8) + '-demo';

const USE_CASE = 'Extract structured JSON from customer support emails — classify priority, sentiment, category, and generate action items';
const SLUG = 'extract-structured-json-customer-support-emails';

const MODELS = [
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', provider: 'qwen', hf: 'Qwen/Qwen2.5-72B-Instruct', params: 72 },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', provider: 'meta-llama', hf: 'meta-llama/Llama-3.1-70B-Instruct', params: 70 },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 24.11', provider: 'mistralai', hf: 'mistralai/Mistral-Large-2411', params: 123 },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 0324', provider: 'deepseek', hf: 'deepseek-ai/DeepSeek-V3-0324', params: 671 },
  { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B IT', provider: 'google', hf: 'google/gemma-2-27b-it', params: 27 },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', provider: 'meta-llama', hf: 'meta-llama/Llama-3.1-8B-Instruct', params: 8 },
  { id: 'microsoft/phi-4', name: 'Phi-4', provider: 'microsoft', hf: 'microsoft/phi-4', params: 14 },
  { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B IT', provider: 'google', hf: 'google/gemma-2-9b-it', params: 9 },
];

const TEST_CASES = [
  {
    input: 'Subject: URGENT - Double charged on my account!!! Order #ORD-2847291\n\nHi,\n\nI just checked my bank statement and I\'ve been charged TWICE for my last order (#ORD-2847291). That\'s $247.99 taken out of my account when it should have been $123.99. I placed this order on March 28th for the Pro subscription annual plan.\n\nThis is absolutely unacceptable. I\'ve been a loyal customer for 3 years and this is how I get treated? I need this resolved IMMEDIATELY or I\'m switching to CompetitorX. I also want a full refund on the duplicate charge plus compensation for the overdraft fee this caused on my account.\n\nMy account email is sarah.mitchell@gmail.com and my customer ID is CUS-8834.\n\nVery frustrated,\nSarah Mitchell',
    expectedBehavior: 'Should extract: P1-high priority, billing category, angry sentiment. Must identify ORD-2847291, CUS-8834, $247.99, $123.99. Action items should include refund processing and overdraft compensation review. Response should be empathetic and acknowledge the 3-year loyalty.',
    category: 'accuracy',
  },
  {
    input: 'Subject: Can\'t log in after password reset\n\nHello support team,\n\nI tried to reset my password yesterday using the "Forgot Password" link. I clicked the link, set a new password, and it said "Password updated successfully." But now when I try to log in it says "Invalid credentials." I\'ve tried 10 times. Now it says "Too many reset attempts, please try again in 24 hours."\n\nI have a presentation tomorrow and all my files are in the platform.\n\nAccount: james.wong@techcorp.io\nBrowser: Chrome 122 on macOS\n\nThanks,\nJames',
    expectedBehavior: 'Should extract: P2-medium priority (workaround: wait 24h, but urgent for user), technical category, frustrated sentiment. Must identify the locked-out state and the time pressure. Action items should include manual account unlock and password reset bypass.',
    category: 'edge_case',
  },
  {
    input: 'Subject: CRITICAL - Production API returning 503 errors\n\nOur production systems are DOWN. Starting at 14:32 UTC today, all API calls to /v2/process return 503 Service Unavailable. Affecting ~12,000 active users.\n\nError: {"error": "service_overloaded", "retry_after": 30, "request_id": "req_7f8a9b2c"}\n\nVerified: auth tokens valid, other endpoints return 200, issue persists across us-east-1 and eu-west-1, rollback didn\'t fix it.\n\nThis is a P0. SLA guarantees 99.9% uptime. Need immediate escalation.\n\nContact: +1-555-0142 or ops@megacorp.com\n\n-- Alex Rivera, VP Engineering, MegaCorp',
    expectedBehavior: 'Must classify as P0-critical. Technical category, angry sentiment. Must extract error code req_7f8a9b2c, affected regions, user count 12,000. Action items must include immediate escalation to infrastructure team and SLA breach acknowledgment.',
    category: 'accuracy',
  },
  {
    input: 'Subject: Question about API rate limits for Enterprise tier\n\nHi team,\n\nWe\'re evaluating an upgrade to Enterprise. Questions:\n1. Rate limits on Enterprise? We hit the 1000 req/min ceiling on Business.\n2. Webhook callbacks instead of polling?\n3. Dedicated staging environment for load tests?\n\nWe process 2.3M API calls/month, expecting 5M by Q4.\n\nBest regards,\nDavid Park\nSenior Platform Engineer, DataFlow Inc.',
    expectedBehavior: 'Should classify as P3-low priority, feature-request category, neutral sentiment. Must extract the three specific questions, current usage (2.3M calls/month), growth projection (5M by Q4). Suggested response should address each question individually.',
    category: 'formatting',
  },
  {
    input: 'Subject: Re: Thanks for the quick help! One more thing...\n\nHey team,\n\nThanks again for fixing the export issue last week. Quick follow-up: can we schedule automatic exports? Like a CSV of weekly analytics to Slack every Monday at 9am? I see "Scheduled Reports" in settings but it\'s grayed out on our Team tier.\n\nIf it\'s a paid add-on, what\'s the pricing? We\'d want it for 3 report types.\n\nCheers,\nMaria Santos\nHead of Analytics, BrightPath',
    expectedBehavior: 'Should classify as P3-low priority, feature-request category, positive sentiment. Must note the gratitude context and the upsell opportunity (3 report types). Action items should include sending pricing info for Scheduled Reports add-on.',
    category: 'reasoning',
  },
];

interface ModelProfile {
  baseScores: number[];
  latencyRange: [number, number];
  tokensRange: [number, number];
  safetyBase: number;
}

const PROFILES: Record<string, ModelProfile> = {
  'qwen/qwen-2.5-72b-instruct':         { baseScores: [92, 85, 90, 83, 86], latencyRange: [2400, 3800], tokensRange: [180, 320], safetyBase: 95 },
  'meta-llama/llama-3.1-70b-instruct':   { baseScores: [88, 80, 85, 78, 76], latencyRange: [2000, 3400], tokensRange: [200, 380], safetyBase: 92 },
  'mistralai/mistral-large-2411':        { baseScores: [86, 79, 82, 76, 80], latencyRange: [2800, 4200], tokensRange: [190, 340], safetyBase: 93 },
  'deepseek/deepseek-chat-v3-0324':      { baseScores: [83, 76, 78, 72, 70], latencyRange: [1400, 2600], tokensRange: [160, 290], safetyBase: 88 },
  'google/gemma-2-27b-it':               { baseScores: [80, 72, 74, 69, 66], latencyRange: [1100, 2000], tokensRange: [220, 400], safetyBase: 90 },
  'meta-llama/llama-3.1-8b-instruct':    { baseScores: [74, 64, 68, 58, 56], latencyRange: [450, 950],   tokensRange: [250, 480], safetyBase: 85 },
  'microsoft/phi-4':                     { baseScores: [71, 60, 63, 55, 52], latencyRange: [380, 780],   tokensRange: [200, 420], safetyBase: 82 },
  'google/gemma-2-9b-it':                { baseScores: [67, 55, 58, 50, 48], latencyRange: [500, 1050],  tokensRange: [280, 520], safetyBase: 78 },
};

const JUDGE_REASONING: Record<string, string[]> = {
  'qwen/qwen-2.5-72b-instruct': [
    'Excellent structured extraction. All entities correctly identified including order ID, customer ID, and dollar amounts. Priority and sentiment accurately classified. Suggested response is empathetic and references the customer\'s loyalty.',
    'Good handling of the edge case. Correctly identified the urgency (presentation tomorrow) and the locked-out state. Could have been more specific about the "Too many attempts" lockout as a separate technical issue.',
    'Outstanding P0 classification with immediate escalation recommendation. Extracted all technical details including error codes, affected regions, and user count. SLA breach acknowledged in suggested response.',
    'Clean structured output for the multi-question inquiry. Each question addressed individually in suggested response. Correctly identified the upsell opportunity. Neutral sentiment appropriate.',
    'Accurately captured the positive tone while identifying the feature request. Correctly noted the Scheduled Reports is a tier-gated feature. Pricing inquiry handled well in suggested response.',
  ],
  'meta-llama/llama-3.1-70b-instruct': [
    'Strong extraction of key entities. Priority and category correct. Missed the overdraft fee mention in action items. Suggested response is professional but doesn\'t reference the customer\'s 3-year tenure.',
    'Correctly classified as technical with frustrated sentiment. Identified the lockout but didn\'t separate the password reset failure from the rate-limit lockout as distinct issues.',
    'Correct P0 classification. Good technical detail extraction. Action items include escalation but miss the SLA breach notification requirement.',
    'Handled the multi-part question well. Sentiment correctly neutral. Missing the growth projection (5M by Q4) from key entities.',
    'Positive sentiment correctly identified. Feature request category appropriate. Suggested response is helpful but generic.',
  ],
  'mistralai/mistral-large-2411': [
    'Solid extraction with correct priority and category. All monetary amounts captured. Action items comprehensive. Slightly verbose suggested response but covers all bases.',
    'Good edge case handling. Identified time pressure. Suggested response includes both immediate fix and follow-up steps.',
    'P0 correctly identified. Good extraction of technical details. Suggested response appropriately urgent in tone.',
    'Clean JSON output. Questions enumerated in action items. Missed webhook vs polling as a specific technical ask.',
    'Correct classification across all fields. Suggested response handles both the gratitude and the feature inquiry naturally.',
  ],
  'deepseek/deepseek-chat-v3-0324': [
    'Correct priority and category. Extracted order ID and amounts. Missed customer ID (CUS-8834). Action items adequate but not comprehensive.',
    'Classified as P2 correctly. Identified the core issue but missed the browser/OS context as potentially relevant diagnostic info.',
    'Correct P0 classification. Extracted error code and regions. Action items mention escalation but lack specificity about SLA.',
    'Reasonable output. Captured the three questions. Didn\'t identify the company size context (2.3M API calls) as a prioritization signal.',
    'Correct sentiment and category. Suggested response is brief but adequate. Missed the upsell angle for 3 report types.',
  ],
  'google/gemma-2-27b-it': [
    'Priority correct but category set to "complaint" instead of "billing". Most entities extracted. Suggested response is somewhat generic.',
    'Reasonable classification. Missed the time-sensitive nature (presentation tomorrow) in priority assessment — should arguably be P1.',
    'Correctly identified as critical. Extracted most technical details. Suggested response lacks the urgency expected for a P0.',
    'Adequate extraction. Two of three questions captured in action items. Output formatting could be cleaner.',
    'Correct positive sentiment. Identified the feature request. Suggested response doesn\'t address pricing inquiry.',
  ],
  'meta-llama/llama-3.1-8b-instruct': [
    'Priority and sentiment correct. Missed some key entities (CUS-8834, overdraft fee). Action items are vague. JSON structure valid but sparse.',
    'Classified as technical but missed the frustrated sentiment — marked as neutral. Basic issue identification without nuance.',
    'Correctly P0. Extracted error code but missed region information. Action items generic ("escalate to team").',
    'Basic extraction. Only captured 1 of 3 questions in detail. Sentiment correct. Output is minimal.',
    'Identified positive sentiment. Category correct. Suggested response is a single sentence — insufficient for the inquiry.',
  ],
  'microsoft/phi-4': [
    'Priority correct. Category correct. Missed dollar amounts in key entities. Action items include refund but no overdraft mention. Suggested response is template-like.',
    'Basic classification correct. Missed the "Too many attempts" lockout as a separate issue. Suggested response is brief.',
    'P0 correctly identified. Minimal entity extraction. Action items say "escalate" without specifics.',
    'Captured the enterprise upgrade context. Only 1 of 3 questions reflected in action items. Concise but incomplete.',
    'Positive sentiment correct. Feature request identified. Very brief output — misses the pricing question entirely.',
  ],
  'google/gemma-2-9b-it': [
    'Priority set to P2 instead of P1. Category correct. Only extracted order ID, missed customer ID and amounts. Suggested response generic.',
    'Classified as P3 instead of P2. Missed the urgency of the presentation deadline. Basic entity extraction.',
    'Classified as P1 instead of P0 — missed the multi-user production impact. Partial technical detail extraction.',
    'Minimal extraction. Identified it as a question but missed the enterprise upgrade context. Action items vague.',
    'Sentiment correct. Very brief output. Doesn\'t address the specific feature or pricing question.',
  ],
};

function rand(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function jitter(base: number, range: number): number {
  return Math.max(0, Math.min(100, base + (Math.random() * 2 - 1) * range));
}

const now = new Date();
const runCreated = new Date(now.getTime() - 12 * 60 * 1000);
const runCompleted = new Date(now.getTime() - 2 * 60 * 1000);

const store = {
  runs: [{
    id: RUN_ID,
    use_case: USE_CASE,
    use_case_slug: SLUG,
    status: 'completed',
    created_at: runCreated.toISOString(),
    completed_at: runCompleted.toISOString(),
  }],
  models: MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    parameter_count: m.params * 1_000_000_000,
    huggingface_id: m.hf,
    tags: ['text-generation'],
  })),
  test_cases: TEST_CASES.map((tc, i) => ({
    id: `tc-${i + 1}`,
    run_id: RUN_ID,
    input: tc.input,
    expected_behavior: tc.expectedBehavior,
    category: tc.category,
  })),
  results: [] as any[],
};

for (const model of MODELS) {
  const profile = PROFILES[model.id];
  for (let tcIdx = 0; tcIdx < TEST_CASES.length; tcIdx++) {
    const score = Math.round(jitter(profile.baseScores[tcIdx], 3) * 10) / 10;
    const latency = rand(profile.latencyRange[0], profile.latencyRange[1]);
    const tokensOut = rand(profile.tokensRange[0], profile.tokensRange[1]);
    const tokensIn = rand(110, 180);
    const safety = Math.round(jitter(profile.safetyBase, 4) * 10) / 10;
    const violations: string[] = safety < 75 ? ['potentially_biased_output'] : [];

    const reasoning = JUDGE_REASONING[model.id]?.[tcIdx] || 'Adequate response with room for improvement.';

    store.results.push({
      id: randomUUID(),
      run_id: RUN_ID,
      model_id: model.id,
      test_case_id: `tc-${tcIdx + 1}`,
      output: `[Structured JSON output for test case ${tcIdx + 1}]`,
      score,
      latency_ms: latency,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      safety_score: safety,
      safety_violations: violations,
      judge_reasoning: reasoning,
      created_at: new Date(runCreated.getTime() + (tcIdx + 1) * 90_000).toISOString(),
    });
  }
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));

console.log(`Seeded ${STORE_PATH}`);
console.log(`  Run ID: ${RUN_ID}`);
console.log(`  Models: ${MODELS.length}`);
console.log(`  Test cases: ${TEST_CASES.length}`);
console.log(`  Results: ${store.results.length}`);
