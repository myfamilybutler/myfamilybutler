/**
 * UI Helper Utilities
 * 
 * Helper functions for UI display (colors, initials, etc.)
 */

/**
 * Predefined color palette for family members.
 * These are accessible pastel colors from Tailwind's 500 scale.
 */
export const MEMBER_COLOR_PALETTE = [
  {
    name: 'emerald',
    hex: '#10b981',
    bg: 'bg-emerald-600',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    name: 'blue',
    hex: '#3b82f6',
    bg: 'bg-blue-600',
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    name: 'indigo',
    hex: '#6366f1',
    bg: 'bg-indigo-600',
    dot: 'bg-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    name: 'rose',
    hex: '#f43f5e',
    bg: 'bg-rose-600',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    name: 'orange',
    hex: '#f97316',
    bg: 'bg-orange-600',
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
  },
  {
    name: 'teal',
    hex: '#14b8a6',
    bg: 'bg-teal-600',
    dot: 'bg-teal-500',
    text: 'text-teal-700 dark:text-teal-300',
  },
  {
    name: 'cyan',
    hex: '#06b6d4',
    bg: 'bg-cyan-600',
    dot: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    name: 'amber',
    hex: '#f59e0b',
    bg: 'bg-amber-600',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
] as const;

export type MemberColorPalette = typeof MEMBER_COLOR_PALETTE[number];

export interface MemberColorPresentation {
  /** Filled badge background (all-day / multi-day) */
  barBg: string;
  /** Text color for non-all-day month-row events */
  text: string;
  /** Dot color for non-all-day month-row events */
  dotBg: string;
}

/** Default color hex for new family members */
export const DEFAULT_MEMBER_COLOR = '#10b981';

// Legacy color mapping (kept for backwards compatibility)
export const MEMBER_COLORS: Record<string, string> = {
  default: 'bg-emerald-600',
  mom: 'bg-blue-600',
  dad: 'bg-indigo-600',
  kids: 'bg-orange-600',
};

const LEGACY_HEX_TO_CURRENT_HEX: Record<string, string> = {
  '#8b5cf6': '#6366f1',
  '#ec4899': '#f43f5e',
};

function normalizeHex(hexColor?: string): string | undefined {
  if (!hexColor) return undefined;
  return hexColor.trim().toLowerCase();
}

function getMemberColorByHex(hexColor?: string) {
  const normalizedHex = normalizeHex(hexColor);
  if (!normalizedHex) return null;

  const canonicalHex = LEGACY_HEX_TO_CURRENT_HEX[normalizedHex] || normalizedHex;
  return MEMBER_COLOR_PALETTE.find((entry) => entry.hex.toLowerCase() === canonicalHex) || null;
}

function hashNameToPaletteIndex(memberName: string): number {
  let hash = 0;
  for (let i = 0; i < memberName.length; i += 1) {
    hash = (hash * 31 + memberName.charCodeAt(i)) >>> 0;
  }
  return hash % MEMBER_COLOR_PALETTE.length;
}

export function getStableMemberColorHex(memberName?: string): string {
  const normalizedName = memberName?.trim();
  if (!normalizedName) return DEFAULT_MEMBER_COLOR;
  return MEMBER_COLOR_PALETTE[hashNameToPaletteIndex(normalizedName)].hex;
}

export function getMemberColorPresentation(memberName?: string, hexColor?: string): MemberColorPresentation {
  const fromHex = getMemberColorByHex(hexColor);
  if (fromHex) {
    return {
      barBg: fromHex.bg,
      text: fromHex.text,
      dotBg: fromHex.dot,
    };
  }

  const stableHex = getStableMemberColorHex(memberName);
  const stableEntry = getMemberColorByHex(stableHex) || MEMBER_COLOR_PALETTE[0];
  return {
    barBg: stableEntry.bg,
    text: stableEntry.text,
    dotBg: stableEntry.dot,
  };
}

/**
 * Get Tailwind background class from HEX color.
 * Falls back to a match from palette or uses inline style for custom colors.
 */
export function getMemberColorClass(hexColor?: string): string {
  const color = getMemberColorByHex(hexColor);
  return color?.bg || MEMBER_COLORS.default;
}

/**
 * Get color class for a family member based on role/name (legacy behavior).
 * Now also accepts an optional hex color override.
 */
export function getMemberColor(member?: string, hexColor?: string): string {
  const fromHex = getMemberColorByHex(hexColor);
  if (fromHex) return fromHex.bg;
  
  // Legacy name-based color assignment
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  
  if (lowerMember.includes('mom') || lowerMember.includes('mama')) return MEMBER_COLORS.mom;
  if (lowerMember.includes('dad') || lowerMember.includes('papa')) return MEMBER_COLORS.dad;
  if (lowerMember.includes('kid') || lowerMember.includes('child')) return MEMBER_COLORS.kids;

  return getMemberColorPresentation(member).barBg;
}

/**
 * Get initials from a name.
 * Examples:
 *   "John Doe" → "JD"
 *   "Anna" → "AN"
 *   "John Paul Doe" → "JD" (first and last)
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  
  if (words.length === 0) return '';
  if (words.length === 1) {
    // Single word: take first two characters
    return words[0].slice(0, 2).toUpperCase();
  }
  
  // Multiple words: first letter of first and last word
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
