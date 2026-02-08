import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getMemberColorPresentation } from "@/lib/utils/ui-helpers"
import type { ReactNode } from "react"

type FamilyMemberBadgeSize = "xs" | "sm" | "default" | "lg"

interface FamilyMemberBadgeProps {
  name: string
  colorHex?: string
  size?: FamilyMemberBadgeSize
  className?: string
  showDot?: boolean
  suffix?: ReactNode
}

export function FamilyMemberBadge({
  name,
  colorHex,
  size = "xs",
  className,
  showDot = true,
  suffix,
}: FamilyMemberBadgeProps) {
  const color = getMemberColorPresentation(name, colorHex)

  return (
    <Badge
      size={size}
      className={cn(
        "border-transparent text-white max-w-full",
        color.barBg,
        className
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />}
      <span className="truncate">{name}</span>
      {suffix ? <span className="shrink-0">{suffix}</span> : null}
    </Badge>
  )
}
