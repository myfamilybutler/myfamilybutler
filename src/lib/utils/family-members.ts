/**
 * Family member name normalization helpers shared across AI + DB flows.
 */

const MULTI_MEMBER_SEPARATOR_REGEX = /\s*(?:,|;|\/|&|\+|\bund\b|\band\b)\s*/i;

/**
 * Normalize a member name to a stable display/storage format.
 */
export function normalizeFamilyMemberName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Case-insensitive key for dedupe/lookup.
 */
export function familyMemberNameKey(value: string): string {
  return normalizeFamilyMemberName(value).toLocaleLowerCase();
}

/**
 * Detects ambiguous multi-name labels such as "Anna und Ben" or "Luca, Mia".
 * We treat these as non-auto-creatable profile members.
 */
export function isAmbiguousFamilyMemberName(value?: string | null): boolean {
  if (!value) return false;
  const normalized = normalizeFamilyMemberName(value);
  if (!normalized) return false;

  const parts = normalized
    .split(MULTI_MEMBER_SEPARATOR_REGEX)
    .map((part) => normalizeFamilyMemberName(part))
    .filter(Boolean);

  return parts.length > 1;
}

/**
 * Guardrail for names that can be auto-promoted to profile members.
 */
export function isAutoCreatableFamilyMemberName(value?: string | null): boolean {
  if (!value) return false;
  const normalized = normalizeFamilyMemberName(value);

  if (!normalized) return false;
  if (normalized.length > 60) return false;
  if (isAmbiguousFamilyMemberName(normalized)) return false;

  return true;
}

/**
 * Collect unique, normalized auto-creatable member names.
 */
export function collectAutoCreatableFamilyMemberNames(
  values: Array<string | null | undefined>
): string[] {
  const unique = new Map<string, string>();

  for (const rawValue of values) {
    if (!isAutoCreatableFamilyMemberName(rawValue)) continue;
    const normalized = normalizeFamilyMemberName(rawValue!);
    const key = familyMemberNameKey(normalized);
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }

  return Array.from(unique.values());
}
