'use client';

/**
 * Color Picker Component
 * 
 * A grid of predefined color swatches for selecting family member colors.
 * Uses a curated palette of accessible pastel colors.
 */

import { cn } from '@/lib/utils';
import { MEMBER_COLOR_PALETTE, DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const selectedColor = value || DEFAULT_MEMBER_COLOR;
  
  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {MEMBER_COLOR_PALETTE.map((color) => {
        const isSelected = selectedColor === color.hex;
        
        return (
          <button
            key={color.hex}
            type="button"
            className={cn(
              "w-8 h-8 rounded-full transition-all flex items-center justify-center",
              "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400",
              isSelected && "ring-2 ring-offset-2 ring-slate-900 scale-110"
            )}
            style={{ backgroundColor: color.hex }}
            onClick={() => onChange(color.hex)}
            aria-label={`Select ${color.name} color`}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <Check className="w-4 h-4 text-white drop-shadow-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
