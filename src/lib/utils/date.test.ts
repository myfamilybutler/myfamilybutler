import { describe, expect, it } from 'vitest';
import { extractDate, formatDate, getIntlLocale, getWeekStartsOn } from './date';

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

  describe('extractDate', () => {
    const referenceDate = new Date(2026, 5, 17);

    it('extracts ISO dates from family messages', () => {
      expect(extractDate('School trip on 2026-07-05')).toBe('2026-07-05');
    });

    it('extracts German numeric dates with and without years', () => {
      expect(extractDate('Elternabend am 05.07.2026', referenceDate)).toBe(
        '2026-07-05'
      );
      expect(extractDate('Schwimmkurs am 05.07.', referenceDate)).toBe(
        '2026-07-05'
      );
    });

    it('extracts slash dates from English-style messages', () => {
      expect(extractDate('Dentist appointment on 12/25/2026')).toBe(
        '2026-12-25'
      );
    });

    it('extracts common relative date words', () => {
      expect(extractDate('Heute Elternsprechtag', referenceDate)).toBe(
        '2026-06-17'
      );
      expect(extractDate('Morgen bitte Turnsachen mitbringen', referenceDate)).toBe(
        '2026-06-18'
      );
      expect(extractDate('day after tomorrow: piano recital', referenceDate)).toBe(
        '2026-06-19'
      );
    });

    it('returns null when no valid date can be extracted', () => {
      expect(extractDate('Someday after lunch')).toBeNull();
      expect(extractDate('Class party on 31.02.2026')).toBeNull();
    });
  });
});
