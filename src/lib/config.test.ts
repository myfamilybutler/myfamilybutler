import { describe, it, expect } from 'vitest';
import { APP_CONFIG } from './config';

describe('APP_CONFIG', () => {
  it('should have correct localization settings', () => {
    expect(APP_CONFIG.localization.timezone).toBe('Europe/Vienna');
    expect(APP_CONFIG.localization.locale).toBe('de-AT');
    expect(APP_CONFIG.localization.currency).toBe('EUR');
  });

  it('should have a system prompt defined', () => {
    expect(APP_CONFIG.ai.systemPrompts.butlerPersona).toBeDefined();
    expect(APP_CONFIG.ai.systemPrompts.butlerPersona).toContain('Family Butler');
  });
});
