import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BrutalistButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'caution' | 'dark' | 'cobalt' | 'coral' | 'mint' | 'lavender';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function BrutalistButton({
  variant = 'cobalt',
  size = 'md',
  className,
  children,
  ...props
}: BrutalistButtonProps) {
  const baseStyles =
    'relative font-mono font-black uppercase tracking-wider transition-all duration-100 active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#171717]';

  const variantStyles = {
    cobalt:
      'bg-[#3157D5] text-white hover:bg-[#2545B8] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    primary:
      'bg-[#3157D5] text-white hover:bg-[#2545B8] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    secondary:
      'bg-[#FFFFFF] text-[#171717] hover:bg-[#EBE5D8] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    caution:
      'bg-[#F4C542] text-[#171717] hover:bg-[#E0B332] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    coral:
      'bg-[#F27661] text-white hover:bg-[#DE5D47] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    mint:
      'bg-[#8ED8B0] text-[#171717] hover:bg-[#75C499] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    lavender:
      'bg-[#B8A7E8] text-[#171717] hover:bg-[#9E8AD6] shadow-[4px_4px_0px_#171717] hover:shadow-[2px_2px_0px_#171717]',
    dark:
      'bg-[#171717] text-white hover:bg-[#2B2B2B] shadow-[4px_4px_0px_#3157D5] hover:shadow-[2px_2px_0px_#3157D5]',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-4 text-base tracking-widest',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
      {...props}
    >
      {children}
    </button>
  );
}
