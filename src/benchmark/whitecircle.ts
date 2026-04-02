import { config } from '../shared/config.js';

export interface SafetyResult {
  safetyScore: number | null;
  violations: string[];
}

export async function checkSafety(text: string): Promise<SafetyResult> {
  if (!config.whitecircleApiToken) {
    return { safetyScore: null, violations: [] };
  }

  try {
    const response = await fetch(`${config.whitecircleEndpoint}/v1/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.whitecircleApiToken}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`White Circle API returned ${response.status}: ${body}`);
      return tryCliCheck(text);
    }

    const data = await response.json();
    return parseSafetyResponse(data);
  } catch (err) {
    console.warn('White Circle API call failed, trying CLI fallback:', err);
    return tryCliCheck(text);
  }
}

function parseSafetyResponse(data: any): SafetyResult {
  const violations: string[] = [];
  let safetyScore: number | null = null;

  if (data.violations && Array.isArray(data.violations)) {
    for (const v of data.violations) {
      violations.push(typeof v === 'string' ? v : v.category || v.type || JSON.stringify(v));
    }
  }

  if (data.categories && typeof data.categories === 'object') {
    for (const [category, flagged] of Object.entries(data.categories)) {
      if (flagged) violations.push(category);
    }
  }

  if (typeof data.score === 'number') {
    safetyScore = data.score;
  } else if (typeof data.safety_score === 'number') {
    safetyScore = data.safety_score;
  } else {
    safetyScore = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 20);
  }

  return { safetyScore, violations };
}

async function tryCliCheck(text: string): Promise<SafetyResult> {
  try {
    const { execSync } = await import('child_process');
    const escaped = text.replace(/"/g, '\\"').slice(0, 2000);
    const result = execSync(`wcircle check text "${escaped}" --json 2>/dev/null`, {
      timeout: 15000,
      encoding: 'utf-8',
    });
    const data = JSON.parse(result);
    return parseSafetyResponse(data);
  } catch {
    return { safetyScore: null, violations: [] };
  }
}

export async function checkAllSafety(
  outputs: Array<{ key: string; text: string }>,
  concurrency: number = 5
): Promise<Map<string, SafetyResult>> {
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrency);

  const safetyMap = new Map<string, SafetyResult>();

  const tasks = outputs.map((item) =>
    limit(async () => {
      const result = await checkSafety(item.text);
      safetyMap.set(item.key, result);
    })
  );

  await Promise.all(tasks);
  return safetyMap;
}
