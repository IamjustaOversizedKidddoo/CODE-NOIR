'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, FileCode, Cpu, Crosshair, Sparkles } from 'lucide-react';
import { StatusStamp } from './StatusStamp';
import Link from 'next/link';

interface SearchResultItem {
  id: string;
  type: 'FILE' | 'SYMBOL' | 'INVESTIGATION' | 'CONCEPT';
  title: string;
  subtitle?: string;
  path?: string;
  href: string;
  confidence?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  files?: { id: string; path: string }[];
  symbols?: { id: string; name: string; kind: string; filePath?: string }[];
  investigations?: { id: string; title: string; type: string }[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  caseId,
  files = [],
  symbols = [],
  investigations = [],
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const results: SearchResultItem[] = [];

  if (q.length > 0) {
    // Match Files
    files
      .filter((f) => f.path.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((f) => {
        results.push({
          id: f.id,
          type: 'FILE',
          title: f.path,
          subtitle: 'Indexed File',
          href: `/cases/${caseId}/evidence?file=${encodeURIComponent(f.path)}`,
          confidence: 'CONFIRMED',
        });
      });

    // Match Symbols
    symbols
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((s) => {
        results.push({
          id: s.id,
          type: 'SYMBOL',
          title: `${s.name}()`,
          subtitle: `${s.kind} • ${s.filePath || 'Unknown'}`,
          href: `/cases/${caseId}/evidence?symbol=${encodeURIComponent(s.name)}`,
          confidence: 'CONFIRMED',
        });
      });

    // Match Investigations
    investigations
      .filter((inv) => inv.title.toLowerCase().includes(q) || inv.type.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((inv) => {
        results.push({
          id: inv.id,
          type: 'INVESTIGATION',
          title: inv.title,
          subtitle: `Investigation: ${inv.type}`,
          href: `/cases/${caseId}/investigate?id=${inv.id}`,
          confidence: 'LIKELY',
        });
      });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-20 font-mono">
      <div className="bg-[#121216] border-4 border-black w-full max-w-2xl shadow-brutal-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="bg-[#1A1A22] border-b-2 border-black p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, AST symbols, investigations, concepts..."
            className="w-full bg-transparent text-white placeholder-neutral-500 font-mono text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {q.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-400 opacity-60" />
              <p>Type to search across the entire crime scene dossier.</p>
              <p className="mt-1 text-[10px]">Files • Classes • Functions • API Routes • Investigations</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              <p>No matching evidence found in static vault for &ldquo;{query}&rdquo;.</p>
            </div>
          ) : (
            results.map((item) => (
              <Link
                key={`${item.type}_${item.id}`}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded bg-[#1A1A22] hover:bg-amber-400 hover:text-black border-2 border-black text-white transition group shadow-brutal-sm"
              >
                <div className="flex items-center gap-3">
                  {item.type === 'FILE' && <FileCode className="w-4 h-4 text-amber-400 group-hover:text-black" />}
                  {item.type === 'SYMBOL' && <Cpu className="w-4 h-4 text-emerald-400 group-hover:text-black" />}
                  {item.type === 'INVESTIGATION' && <Crosshair className="w-4 h-4 text-red-400 group-hover:text-black" />}

                  <div>
                    <span className="font-bold text-xs block">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-[10px] text-neutral-400 group-hover:text-neutral-800 block">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                {item.confidence && (
                  <StatusStamp status={item.confidence} size="sm" className="group-hover:border-black" />
                )}
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1A1A22] border-t-2 border-black px-4 py-2 text-[10px] text-neutral-500 flex justify-between">
          <span>ESC to exit</span>
          <span>CODE NOIR // EVIDENCE RECON</span>
        </div>
      </div>
    </div>
  );
};
