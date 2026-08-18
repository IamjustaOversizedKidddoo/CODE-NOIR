import React from 'react';
import { clsx } from 'clsx';

export type StampVariant =
  | 'CONFIRMED'
  | 'LIKELY'
  | 'POSSIBLE'
  | 'UNKNOWN'
  | 'REDACTED'
  | 'WANTED'
  | 'CLASSIFIED'
  | 'CORROBORATED'
  | 'UNDER_INVESTIGATION'
  | 'SOLVED';

interface StatusStampProps {
  status: StampVariant | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusStamp: React.FC<StatusStampProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_') as StampVariant;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 border',
    md: 'text-xs px-2.5 py-1 border-2',
    lg: 'text-sm px-4 py-1.5 border-2 font-black tracking-widest',
  }[size];

  const variantStyles: Record<string, string> = {
    CONFIRMED: 'border-[#171717] text-[#171717] bg-[#8ED8B0] shadow-[2px_2px_0px_#171717]',
    CORROBORATED: 'border-[#171717] text-[#171717] bg-[#8ED8B0] shadow-[2px_2px_0px_#171717]',
    SOLVED: 'border-[#171717] text-[#171717] bg-[#8ED8B0] shadow-[3px_3px_0px_#171717] font-black',
    LIKELY: 'border-[#171717] text-[#171717] bg-[#F4C542] shadow-[2px_2px_0px_#171717]',
    POSSIBLE: 'border-[#171717] text-[#171717] bg-[#F4C542] shadow-[2px_2px_0px_#171717]',
    UNKNOWN: 'border-[#171717] text-[#171717] bg-[#B8A7E8] shadow-[2px_2px_0px_#171717]',
    UNRESOLVED: 'border-[#171717] text-[#171717] bg-[#B8A7E8] shadow-[2px_2px_0px_#171717]',
    REDACTED: 'border-[#171717] bg-[#171717] text-[#F4C542] font-mono tracking-widest',
    WANTED: 'border-[#171717] text-white bg-[#F27661] shadow-[3px_3px_0px_#171717] transform -rotate-1 font-black',
    CLASSIFIED: 'border-[#171717] text-white bg-[#F27661] shadow-[3px_3px_0px_#171717] transform -rotate-2 font-black',
    UNDER_INVESTIGATION: 'border-[#171717] text-[#171717] bg-[#F4C542] shadow-[2px_2px_0px_#171717] font-bold',
    NO_PROJECT: 'border-[#171717] text-white bg-[#F27661] shadow-[3px_3px_0px_#171717] font-black',
    ANALYZING: 'border-[#171717] text-[#171717] bg-[#F4C542] shadow-[3px_3px_0px_#171717] font-black animate-pulse',
    AI_OFFLINE: 'border-[#171717] text-[#171717] bg-[#B8A7E8] shadow-[2px_2px_0px_#171717] font-bold',
    NO_EVIDENCE: 'border-[#171717] text-zinc-300 bg-zinc-800 shadow-[2px_2px_0px_#171717] font-mono',
  };

  const currentStyle = variantStyles[normalized] || variantStyles.UNKNOWN;

  return (
    <span
      className={clsx(
        'inline-flex items-center uppercase font-mono font-bold select-none',
        sizeClasses,
        currentStyle,
        className
      )}
    >
      {normalized.replace(/_/g, ' ')}
    </span>
  );
};
