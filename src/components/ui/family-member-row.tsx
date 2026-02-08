import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { FamilyMemberBadge } from '@/components/ui/family-member-badge';
import { cn } from '@/lib/utils';

type FamilyMemberBadgeSize = 'xs' | 'sm' | 'default' | 'lg';

interface FamilyMemberRowProps {
  name: string;
  colorHex?: string;
  selected?: boolean;
  onClick?: () => void;
  rightSlot?: ReactNode;
  className?: string;
  badgeClassName?: string;
  badgeSize?: FamilyMemberBadgeSize;
  showDot?: boolean;
  showCheckWhenSelected?: boolean;
}

/**
 * Shared row shell for family-member lists.
 * Keeps filter dropdown and settings list visually consistent.
 */
export function FamilyMemberRow({
  name,
  colorHex,
  selected = false,
  onClick,
  rightSlot,
  className,
  badgeClassName,
  badgeSize = 'sm',
  showDot = false,
  showCheckWhenSelected = true,
}: FamilyMemberRowProps) {
  const interactive = typeof onClick === 'function';

  const rowClassName = cn(
    'group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
    selected
      ? 'bg-accent text-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    !interactive && 'cursor-default',
    className
  );

  const badgeStateClassName = selected ? 'shadow-sm' : 'opacity-70 group-hover:opacity-100';
  const resolvedRightSlot =
    rightSlot ??
    (selected && showCheckWhenSelected ? (
      <Check className="h-4 w-4 shrink-0 text-primary" />
    ) : null);

  const content = (
    <>
      <FamilyMemberBadge
        name={name}
        colorHex={colorHex}
        size={badgeSize}
        showDot={showDot}
        className={cn('max-w-[9.5rem] transition-opacity', badgeStateClassName, badgeClassName)}
      />
      {resolvedRightSlot}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={rowClassName}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}

