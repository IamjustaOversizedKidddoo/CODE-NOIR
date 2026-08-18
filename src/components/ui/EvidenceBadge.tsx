import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface EvidenceBadgeProps {
  label: string;
  variant?: 'yellow' | 'red' | 'coral' | 'cobalt' | 'mint' | 'lavender' | 'dark' | 'white' | 'stamp';
  className?: string;
}

export function EvidenceBadge({
  label,
  variant = 'yellow',
  className,
}: EvidenceBadgeProps) {
  const variantStyles = {
    yellow: 'bg-[#F4C542] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    red: 'bg-[#F27661] text-white border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    coral: 'bg-[#F27661] text-white border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    cobalt: 'bg-[#3157D5] text-white border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    mint: 'bg-[#8ED8B0] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    lavender: 'bg-[#B8A7E8] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    dark: 'bg-[#171717] text-white border-2 border-[#171717] shadow-[2px_2px_0px_#3157D5]',
    white: 'bg-[#FFFFFF] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717]',
    stamp: 'border-2 border-[#F27661] text-[#F27661] font-black -rotate-2',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider',
          variantStyles[variant],
          className
        )
      )}
    >
      {label}
    </span>
  );
}
