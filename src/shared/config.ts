import 'dotenv/config';

export const config = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  whitecircleApiToken: process.env.WHITECIRCLE_API_TOKEN || '',
  whitecircleEndpoint: process.env.WHITECIRCLE_ENDPOINT || 'https://api.whitecircle.ai',
  judgeModel: process.env.SWITCHBOARD_JUDGE_MODEL || 'claude-sonnet-4-20250514',
} as const;
