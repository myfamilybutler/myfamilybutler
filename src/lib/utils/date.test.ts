import { describe, expect, it } from 'vitest';
import { formatDate, getIntlLocale, getWeekStartsOn } from './date';

describe('date utils', () => {
  it('formats dates in German style when language is de', () => {
    const value = formatDate(new Date(2026, 0, 2), 'P', 'de-DE');
    expect(value).toBe('02.01.2026');
  });

  it('formats dates in English style when language is en', () => {
    const value = formatDate(new Date(2026, 0, 2), 'P', 'en-US');
    expect(value).toBe('01/02/2026');
  });

  it('uses locale week starts for supported languages', () => {
    expect(getWeekStartsOn('de-AT')).toBe(1);
    expect(getWeekStartsOn('en-US')).toBe(0);
  });

  it('maps language to Intl locale consistently', () => {
    expect(getIntlLocale('de-AT')).toBe('de-DE');
    expect(getIntlLocale('en-GB')).toBe('en-US');
  });
});
