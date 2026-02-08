import { describe, expect, it } from 'vitest';
import {
  collectAutoCreatableFamilyMemberNames,
  familyMemberNameKey,
  isAmbiguousFamilyMemberName,
  isAutoCreatableFamilyMemberName,
  normalizeFamilyMemberName,
} from './family-members';

describe('family-members utils', () => {
  it('normalizes whitespace for member names', () => {
    expect(normalizeFamilyMemberName('  Anna    Maria  ')).toBe('Anna Maria');
  });

  it('builds case-insensitive dedupe keys', () => {
    expect(familyMemberNameKey('  EMMA  ')).toBe('emma');
  });

  it('detects ambiguous multi-name labels', () => {
    expect(isAmbiguousFamilyMemberName('Anna und Ben')).toBe(true);
    expect(isAmbiguousFamilyMemberName('Luca, Mia')).toBe(true);
    expect(isAmbiguousFamilyMemberName('Sophie')).toBe(false);
  });

  it('allows only safe names for auto creation', () => {
    expect(isAutoCreatableFamilyMemberName('Sophie')).toBe(true);
    expect(isAutoCreatableFamilyMemberName('Anna & Ben')).toBe(false);
    expect(isAutoCreatableFamilyMemberName(' '.repeat(4))).toBe(false);
    expect(isAutoCreatableFamilyMemberName('a'.repeat(61))).toBe(false);
  });

  it('collects unique auto-creatable names', () => {
    const result = collectAutoCreatableFamilyMemberNames([
      ' Emma ',
      'emma',
      'Anna und Ben',
      null,
      undefined,
      'Luca',
    ]);

    expect(result).toEqual(['Emma', 'Luca']);
  });
});
