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

export function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}
