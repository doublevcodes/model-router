import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

const DEMO_DIR = resolve(__dirname, '../../demo-app');
const EMAILS_DIR = resolve(DEMO_DIR, 'emails');

describe('Demo App', () => {
  describe('Email fixtures', () => {
    it('should have the emails directory', () => {
      expect(existsSync(EMAILS_DIR)).toBe(true);
    });

    it('should have exactly 5 sample emails', () => {
      const emails = readdirSync(EMAILS_DIR).filter((f) => f.endsWith('.txt'));
      expect(emails.length).toBe(5);
    });

    it('should have non-empty email files', () => {
      const emails = readdirSync(EMAILS_DIR).filter((f) => f.endsWith('.txt'));
      for (const file of emails) {
        const content = readFileSync(resolve(EMAILS_DIR, file), 'utf-8');
        expect(content.length).toBeGreaterThan(100);
        expect(content).toContain('Subject:');
      }
    });

    it('should cover diverse ticket types', () => {
      const emails = readdirSync(EMAILS_DIR).filter((f) => f.endsWith('.txt'));
      const names = emails.map((f) => f.replace('.txt', ''));
      expect(names).toContain('billing-overcharge');
      expect(names).toContain('password-reset');
      expect(names).toContain('production-outage');
      expect(names).toContain('api-rate-limits');
      expect(names).toContain('happy-followup');
    });
  });

  describe('process-ticket module', () => {
    it('should export processTicket and loadEmails functions', async () => {
      const mod = await import('../../demo-app/process-ticket.js');
      expect(typeof mod.processTicket).toBe('function');
      expect(typeof mod.loadEmails).toBe('function');
    });

    it('loadEmails should return all 5 emails with name and content', async () => {
      const mod = await import('../../demo-app/process-ticket.js');
      const emails = mod.loadEmails();
      expect(emails.length).toBe(5);
      for (const email of emails) {
        expect(email.name).toBeTruthy();
        expect(email.content).toBeTruthy();
        expect(email.content.length).toBeGreaterThan(100);
      }
    });

    it('processTicket should call OpenRouter API with correct payload', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              priority: 'P1-high',
              category: 'billing',
              sentiment: 'angry',
              summary: 'Customer double-charged for subscription order.',
              key_entities: ['ORD-2847291', 'CUS-8834'],
              action_items: ['Process refund for duplicate charge'],
              suggested_response: 'We apologize for the double charge and are processing your refund immediately.',
            }),
          },
        }],
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }) as any;

      try {
        const mod = await import('../../demo-app/process-ticket.js');
        const result = await mod.processTicket('Test email content', 'test-model', 'test-key');

        expect(result.priority).toBe('P1-high');
        expect(result.category).toBe('billing');
        expect(result.sentiment).toBe('angry');
        expect(result.summary).toBeTruthy();
        expect(result.key_entities.length).toBeGreaterThan(0);
        expect(result.action_items.length).toBeGreaterThan(0);

        const fetchCall = (globalThis.fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe('https://openrouter.ai/api/v1/chat/completions');
        const body = JSON.parse(fetchCall[1].body);
        expect(body.model).toBe('test-model');
        expect(body.messages.length).toBe(2);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[1].content).toBe('Test email content');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('processTicket should throw on API error', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }) as any;

      try {
        const mod = await import('../../demo-app/process-ticket.js');
        await expect(mod.processTicket('test', 'model', 'key')).rejects.toThrow('API error: 429');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('processTicket should throw if model returns non-JSON', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'This is not JSON at all, just plain text.' } }],
        }),
      }) as any;

      try {
        const mod = await import('../../demo-app/process-ticket.js');
        await expect(mod.processTicket('test', 'model', 'key')).rejects.toThrow('Model did not return valid JSON');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
