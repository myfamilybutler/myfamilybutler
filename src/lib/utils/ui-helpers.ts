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
  { name: 'emerald', hex: '#10b981', bg: 'bg-emerald-500' },
  { name: 'blue', hex: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'purple', hex: '#8b5cf6', bg: 'bg-purple-500' },
  { name: 'pink', hex: '#ec4899', bg: 'bg-pink-500' },
  { name: 'orange', hex: '#f97316', bg: 'bg-orange-500' },
  { name: 'cyan', hex: '#06b6d4', bg: 'bg-cyan-500' },
  { name: 'rose', hex: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'amber', hex: '#f59e0b', bg: 'bg-amber-500' },
] as const;

export type MemberColorPalette = typeof MEMBER_COLOR_PALETTE[number];

/** Default color hex for new family members */
export const DEFAULT_MEMBER_COLOR = '#10b981';

// Legacy color mapping (kept for backwards compatibility)
export const MEMBER_COLORS: Record<string, string> = {
  default: 'bg-emerald-500',
  mom: 'bg-blue-500',
  dad: 'bg-purple-500',
  kids: 'bg-orange-500',
};

/**
 * Get Tailwind background class from HEX color.
 * Falls back to a match from palette or uses inline style for custom colors.
 */
export function getMemberColorClass(hexColor?: string): string {
  if (!hexColor) return MEMBER_COLORS.default;
  
  // Find matching palette color
  const paletteMatch = MEMBER_COLOR_PALETTE.find(c => c.hex === hexColor);
  if (paletteMatch) return paletteMatch.bg;
  
  // Fallback to default if no match
  return MEMBER_COLORS.default;
}

/**
 * Get color class for a family member based on role/name (legacy behavior).
 * Now also accepts an optional hex color override.
 */
export function getMemberColor(member?: string, hexColor?: string): string {
  // If a hex color is provided, use it
  if (hexColor) {
    return getMemberColorClass(hexColor);
  }
  
  // Legacy name-based color assignment
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  
  if (lowerMember.includes('mom') || lowerMember.includes('mama')) return MEMBER_COLORS.mom;
  if (lowerMember.includes('dad') || lowerMember.includes('papa')) return MEMBER_COLORS.dad;
  if (lowerMember.includes('kid') || lowerMember.includes('child')) return MEMBER_COLORS.kids;
  
  return MEMBER_COLORS.default;
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
