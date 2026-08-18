import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CrimeTapeProps {
  text?: string;
  repeat?: number;
  className?: string;
}

export function CrimeTape({
  text = 'POLICE LINE DO NOT CROSS // EVIDENCE CRIME SCENE // CLASSIFIED',
  repeat = 4,
  className,
}: CrimeTapeProps) {
  const content = Array(repeat).fill(text).join('  ///  ');

  return (
    <div
      className={twMerge(
        clsx(
          'w-full overflow-hidden bg-[#F4C542] text-[#171717] font-mono font-black text-xs py-1.5 uppercase tracking-widest border-y-2 border-[#171717] select-none whitespace-nowrap shadow-[0_4px_0_#171717]',
          className
        )
      )}
    >
      <div className="inline-block animate-pulse">{content}</div>
    </div>
  );
}
