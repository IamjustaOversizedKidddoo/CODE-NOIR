'use client';

import React, { useState } from 'react';
import { Copy, Check, FileCode, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

interface SourceInspectorProps {
  filePath: string;
  language?: string;
  code: string;
  highlightStartLine?: number;
  highlightEndLine?: number;
  hash?: string;
  className?: string;
}

export const SourceInspector: React.FC<SourceInspectorProps> = ({
  filePath,
  language = 'typescript',
  code,
  highlightStartLine,
  highlightEndLine,
  hash,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const lines = code ? code.split(/\r?\n/) : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        'bg-[#0D0D11] border-3 border-black shadow-brutal flex flex-col font-mono text-xs overflow-hidden',
        className
      )}
    >
      {/* File Header Bar */}
      <div className="bg-[#1A1A22] border-b-2 border-black px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-neutral-300 font-bold">
          <FileCode className="w-4 h-4 text-amber-400" />
          <span className="text-white font-black">{filePath}</span>
          <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded text-[10px] uppercase border border-neutral-700">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hash && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA256: {hash.slice(0, 8)}...</span>
            </div>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded text-[10px] font-bold border border-neutral-600 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer with Line Numbers & Range Highlighting */}
      <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto bg-black select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineContent, idx) => {
              const lineNum = idx + 1;
              const isHighlighted =
                highlightStartLine &&
                highlightEndLine &&
                lineNum >= highlightStartLine &&
                lineNum <= highlightEndLine;

              return (
                <tr
                  key={lineNum}
                  className={clsx(
                    'transition-colors leading-relaxed',
                    isHighlighted ? 'bg-amber-500/20 text-amber-200 border-l-4 border-amber-400' : 'text-neutral-300'
                  )}
                >
                  <td className="pr-4 text-right text-neutral-600 select-none font-mono text-[11px] w-12 align-top">
                    {lineNum}
                  </td>
                  <td className="font-mono text-xs whitespace-pre pl-2">
                    {lineContent || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
