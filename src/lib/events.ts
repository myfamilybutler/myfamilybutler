export const MEMBER_COLORS: Record<string, string> = {
  default: 'bg-emerald-500',
  mom: 'bg-blue-500',
  dad: 'bg-purple-500',
  kids: 'bg-orange-500',
};

export function getMemberColor(member?: string): string {
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

