import { describe, it, expect } from 'vitest';
import {
  getLocaleConfig,
  getTerminology,
  getTerminologyForPrompt,
  getCulturalContextForPrompt,
  getExamplesForPrompt
} from './index';

describe('Locales configuration dynamic resolver', () => {
  it('should resolve the correct configuration for en/de language codes', () => {
    // English
    const enConfig = getLocaleConfig('en');
    expect(enConfig.id).toBe('en-GB');
    expect(enConfig.schoolPeriods).toBeDefined();
    
    const enConfigSub = getLocaleConfig('en-US');
    expect(enConfigSub.id).toBe('en-GB');

    // German (default & de-AT)
    const deConfig = getLocaleConfig('de');
    expect(deConfig.id).toBe('de-AT');

    const defaultConfig = getLocaleConfig();
    expect(defaultConfig.id).toBe('de-AT');

    const nullConfig = getLocaleConfig(null);
    expect(nullConfig.id).toBe('de-AT');
  });

  it('should return categorized terminology based on language', () => {
    const enTerms = getTerminology('school', 'en');
    const deTerms = getTerminology('school', 'de');

    // Verify school terms exist and are different
    expect(enTerms).toBeDefined();
    expect(deTerms).toBeDefined();
    
    // In German we expect "Elternabend" or similar Austrian terminology
    expect(Object.keys(deTerms)).toContain('Elternabend');
    // In English we might expect English equivalents or translated keys/definitions
    expect(Object.keys(enTerms)).toContain("Parents' Evening");
  });

  it('should generate localized terminology strings for prompts', () => {
    const enPrompt = getTerminologyForPrompt('school', 'en');
    const dePrompt = getTerminologyForPrompt('school', 'de');

    expect(enPrompt).toContain("Parents' Evening");
    expect(dePrompt).toContain('Elternabend');
  });

  it('should return cultural context for prompts', () => {
    const enContext = getCulturalContextForPrompt('en');
    const deContext = getCulturalContextForPrompt('de');

    expect(enContext).toBeDefined();
    expect(deContext).toBeDefined();
    expect(enContext).not.toBe(deContext);
  });

  it('should format few-shot learning examples with correct language strings', () => {
    // Check German formatting
    const deExamples = getExamplesForPrompt(1, 'Hausübung', 'de');
    expect(deExamples).toContain('Lernbeispiele');
    expect(deExamples).toContain('Beispiel 1:');

    // Check English formatting
    const enExamples = getExamplesForPrompt(1, 'homework', 'en');
    expect(enExamples).toContain('Learning Examples');
    expect(enExamples).toContain('Example 1:');
  });
});
