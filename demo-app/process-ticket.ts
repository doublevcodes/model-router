import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TicketAnalysis {
  priority: 'P0-critical' | 'P1-high' | 'P2-medium' | 'P3-low';
  category: 'billing' | 'technical' | 'account' | 'feature-request' | 'complaint';
  sentiment: 'angry' | 'frustrated' | 'neutral' | 'positive';
  summary: string;
  key_entities: string[];
  action_items: string[];
  suggested_response: string;
}

const SYSTEM_PROMPT = `You are a customer support ticket analysis engine. Given a raw customer email, extract structured data.

Return ONLY valid JSON matching this schema:
{
  "priority": "P0-critical" | "P1-high" | "P2-medium" | "P3-low",
  "category": "billing" | "technical" | "account" | "feature-request" | "complaint",
  "sentiment": "angry" | "frustrated" | "neutral" | "positive",
  "summary": "1-2 sentence summary of the issue",
  "key_entities": ["product names", "order IDs", "account refs", "error codes"],
  "action_items": ["specific steps support team should take"],
  "suggested_response": "Draft reply to the customer"
}

Rules:
- P0 = production down or data loss affecting many users
- P1 = revenue impact or single user blocked from core functionality
- P2 = degraded experience but workaround exists
- P3 = questions, feature requests, positive feedback`;

export async function processTicket(
  emailText: string,
  modelId: string,
  apiKey: string
): Promise<TicketAnalysis> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Title': 'Switchboard Demo - Ticket Router',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: emailText },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Model did not return valid JSON');

  return JSON.parse(jsonMatch[0]) as TicketAnalysis;
}

export function loadEmails(): { name: string; content: string }[] {
  const emailsDir = resolve(__dirname, 'emails');
  return readdirSync(emailsDir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => ({
      name: f.replace('.txt', ''),
      content: readFileSync(resolve(emailsDir, f), 'utf-8'),
    }));
}

const isMain = process.argv[1] && /process-ticket\.[cm]?js$/.test(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  const modelId = process.argv[2] || 'qwen/qwen-2.5-72b-instruct';
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Set OPENROUTER_API_KEY environment variable');
    process.exit(1);
  }

  const emails = loadEmails();
  console.log(`Processing ${emails.length} tickets with ${modelId}...\n`);

  for (const email of emails) {
    console.log(`--- ${email.name} ---`);
    try {
      const result = await processTicket(email.content, modelId, apiKey);
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
    }
    console.log();
  }
}
