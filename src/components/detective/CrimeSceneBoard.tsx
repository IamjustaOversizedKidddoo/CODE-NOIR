'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusStamp } from './StatusStamp';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Eye,
  Layers,
  FileCode2,
  Cpu,
  Play,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  BookOpen,
  MessageSquareCode,
  Compass,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface BoardNode {
  id: string;
  name: string;
  path?: string;
  type: 'ENTRY_POINT' | 'CORE_MODULE' | 'SERVICE' | 'DATABASE' | 'EXTERNAL_API' | 'FILE';
  subsystem?: string;
  importanceScore?: number;
  confidence?: string;
  plainEnglishDesc?: string;
  isCircular?: boolean;
  isOrphaned?: boolean;
  x: number;
  y: number;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  confidence?: string;
  explanation?: string;
}

interface CrimeSceneBoardProps {
  caseId?: string;
  nodes?: BoardNode[];
  edges?: BoardEdge[];
  onSelectNode?: (node: BoardNode) => void;
}

export const CrimeSceneBoard: React.FC<CrimeSceneBoardProps> = ({
  caseId,
  nodes = [],
  edges = [],
  onSelectNode,
}) => {
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<BoardNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<BoardEdge | null>(null);
  const [beginnerView, setBeginnerView] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showOrphans, setShowOrphans] = useState<boolean>(false);

  // Filter nodes for beginner vs advanced mode
  const filteredNodes = nodes.filter((n) => {
    if (beginnerView && n.isOrphaned) return false;
    if (filterType === 'ALL') return true;
    return n.type === filterType;
  });

  const orphanedNodes = nodes.filter((n) => n.isOrphaned);

  const handleNodeClick = (node: BoardNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    if (onSelectNode) onSelectNode(node);
  };

  const getNodeColor = (type: string, isEntry?: boolean) => {
    if (isEntry || type === 'ENTRY_POINT') return 'bg-[#F4C542] text-[#171717] border-[#171717]';
    switch (type) {
      case 'CORE_MODULE':
        return 'bg-[#3157D5] text-white border-[#171717]';
      case 'DATABASE':
        return 'bg-[#8ED8B0] text-[#171717] border-[#171717]';
      case 'SERVICE':
        return 'bg-[#B8A7E8] text-[#171717] border-[#171717]';
      case 'EXTERNAL_API':
        return 'bg-[#F27661] text-white border-[#171717]';
      default:
        return 'bg-white text-[#171717] border-[#171717]';
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border-4 border-[#171717] shadow-[8px_8px_0px_#171717] p-12 text-center space-y-4 font-mono">
        <div className="w-12 h-12 bg-[#F4C542] border-2 border-[#171717] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#171717]">
          <Layers className="w-6 h-6 text-[#171717]" />
        </div>
        <h3 className="text-base font-black uppercase text-[#171717]">THE PINBOARD IS WAITING FOR EVIDENCE</h3>
        <p className="text-xs text-[#4A4A4A] max-w-md mx-auto">
          No indexed nodes discovered in this case file yet. Upload a valid codebase to reconstruct the interactive architecture graph.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border-4 border-[#171717] shadow-[8px_8px_0px_#171717] flex flex-col font-mono text-[#171717]">
      {/* Board Top Toolbar */}
      <div className="border-b-3 border-[#171717] bg-[#F5F1E8] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-[#3157D5]" />
          <span className="text-xs font-black tracking-widest text-[#171717]">
            CRIME SCENE PINBOARD ({filteredNodes.length} NODES)
          </span>

          {/* Beginner vs Advanced Mode Toggle */}
          <button
            onClick={() => setBeginnerView(!beginnerView)}
            className={clsx(
              'text-[9px] font-black px-2.5 py-1 border border-[#171717] transition shadow-[1px_1px_0px_#171717]',
              beginnerView ? 'bg-[#8ED8B0] text-[#171717]' : 'bg-[#171717] text-white'
            )}
          >
            {beginnerView ? '🟢 BEGINNER VIEW (NO NOISE)' : '🟣 ADVANCED VIEW (ALL FILES)'}
          </button>
        </div>

        {/* Filters & Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-[10px] font-black bg-white border border-[#171717] px-2 py-1"
          >
            [ LEGEND ]
          </button>

          <div className="flex items-center gap-1.5 text-xs bg-white border-2 border-[#171717] px-2 py-1 shadow-[2px_2px_0px_#171717]">
            <Filter className="w-3.5 h-3.5 text-[#3157D5]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent font-bold text-xs focus:outline-none"
            >
              <option value="ALL">ALL NODES</option>
              <option value="ENTRY_POINT">🚪 ENTRY POINTS</option>
              <option value="CORE_MODULE">CORE MODULES</option>
              <option value="SERVICE">SERVICES & SYMBOLS</option>
              <option value="DATABASE">🗄️ DATABASE</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white border-2 border-[#171717] p-0.5 shadow-[2px_2px_0px_#171717]">
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 0.1, 1.5))}
              className="p-1 hover:bg-[#F5F1E8] text-[#171717] font-bold"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold px-1 text-[#4A4A4A]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.6))}
              className="p-1 hover:bg-[#F5F1E8] text-[#171717] font-bold"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-[#F5F1E8] text-[#171717] font-bold border-l border-zinc-300"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PART 30 — GRAPH LEGEND */}
      {showLegend && (
        <div className="bg-[#FFF9E6] border-b-2 border-[#171717] p-3 text-[10px] font-mono flex flex-wrap items-center gap-4">
          <span className="font-black text-[#3157D5] uppercase">GRAPH LEGEND:</span>
          <span>🚪 ENTRY POINT (Front Door)</span>
          <span>🟦 CORE MODULE</span>
          <span>🟢 DATABASE</span>
          <span>🟣 SERVICE</span>
          <span>⚠️ CIRCULAR DEPENDENCY</span>
          <span>──▶ CALLS / IMPORTS</span>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="relative min-h-[520px] overflow-auto bg-[#FAF8F5] p-6">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="relative min-w-[900px] min-h-[500px] transition-transform duration-100"
        >
          {/* Edge Connection Canvas (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const isEdgeSelected = selectedEdge?.id === edge.id;
              const x1 = srcNode.x + 120;
              const y1 = srcNode.y + 40;
              const x2 = tgtNode.x + 120;
              const y2 = tgtNode.y + 40;

              return (
                <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedEdge(edge)}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isEdgeSelected ? '#F27661' : '#171717'}
                    strokeWidth={isEdgeSelected ? '4' : '2'}
                    strokeDasharray={edge.relationship === 'IMPORTS' ? '4 4' : undefined}
                  />
                  <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="4" fill={isEdgeSelected ? '#F27661' : '#3157D5'} />
                </g>
              );
            })}
          </svg>

          {/* Interactive Node Cards */}
          <div className="relative z-10">
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isEntry = node.type === 'ENTRY_POINT';
              const colorClass = getNodeColor(node.type, isEntry);

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '240px',
                  }}
                  className={clsx(
                    'p-3.5 border-3 cursor-pointer transition shadow-[4px_4px_0px_#171717] hover:-translate-y-1',
                    colorClass,
                    isSelected ? 'ring-4 ring-[#F4C542] shadow-[6px_6px_0px_#171717]' : '',
                    node.isCircular ? 'border-[#F27661]' : ''
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1 opacity-90">
                    <span className="flex items-center gap-1">
                      {isEntry && '🚪 '}
                      {node.type}
                    </span>
                    <span>SCORE {node.importanceScore || 75}</span>
                  </div>

                  <h4 className="font-bold text-xs truncate uppercase tracking-tight">
                    {node.name}
                  </h4>

                  {node.plainEnglishDesc && (
                    <p className="text-[10px] font-sans opacity-90 leading-tight mt-1 line-clamp-2">
                      &quot;{node.plainEnglishDesc}&quot;
                    </p>
                  )}

                  {node.path && (
                    <p className="text-[9px] truncate opacity-75 mt-1 font-mono">
                      {node.path}
                    </p>
                  )}

                  {node.isCircular && (
                    <span className="text-[8px] bg-[#F27661] text-white px-1 py-0.5 font-bold block mt-1">
                      ⚠️ CIRCULAR DEPENDENCY
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PART 8 — CONNECTION EXPLANATION PANEL */}
      {selectedEdge && (
        <div className="bg-[#FFF4F2] border-t-3 border-[#F27661] p-3 text-xs flex items-center justify-between font-mono">
          <div className="space-y-0.5">
            <strong className="text-[#F27661] font-black block text-[10px] uppercase">
              🔗 CONNECTION EVIDENCE: {selectedEdge.relationship}
            </strong>
            <p className="text-[#171717]">
              {selectedEdge.explanation || `${selectedEdge.source} calls ${selectedEdge.target} during execution flow.`}
            </p>
          </div>
          <button onClick={() => setSelectedEdge(null)} className="text-[10px] font-bold text-zinc-500 hover:text-black">
            [ CLOSE ]
          </button>
        </div>
      )}

      {/* PART 9 & 10 — SELECTED NODE EVIDENCE PANEL */}
      {selectedNode && (
        <div className="border-t-3 border-[#171717] bg-[#F5F1E8] p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusStamp status={selectedNode.confidence || 'CONFIRMED'} size="sm" />
                <span className="text-xs font-black text-[#171717] uppercase">
                  {selectedNode.name}
                </span>
                <span className="text-[10px] text-[#3157D5] font-bold">({selectedNode.path || 'Root'})</span>
              </div>
              <p className="text-xs text-[#4A4A4A] font-sans">
                {selectedNode.plainEnglishDesc || 'Primary repository component.'}
              </p>
            </div>

            {/* Contextual CTAs */}
            <div className="flex items-center gap-2 flex-wrap">
              {caseId && (
                <>
                  <Link
                    href={`/cases/${caseId}/learn${selectedNode.path ? '?file=' + encodeURIComponent(selectedNode.path) : ''}`}
                    className="bg-[#3157D5] hover:bg-[#2545B8] text-white text-[10px] font-black px-3 py-1.5 border border-[#171717] shadow-[2px_2px_0px_#171717] transition flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> [ 🎓 LEARN ]
                  </Link>

                  <Link
                    href={`/cases/${caseId}/interrogate${selectedNode.path ? '?file=' + encodeURIComponent(selectedNode.path) : ''}`}
                    className="bg-[#F4C542] hover:bg-[#e0b236] text-[#171717] text-[10px] font-black px-3 py-1.5 border border-[#171717] shadow-[2px_2px_0px_#171717] transition flex items-center gap-1"
                  >
                    <MessageSquareCode className="w-3.5 h-3.5" /> [ 🤖 ASK ]
                  </Link>

                  <Link
                    href={`/cases/${caseId}/investigate${selectedNode.path ? '?file=' + encodeURIComponent(selectedNode.path) : ''}`}
                    className="bg-[#F27661] text-white text-[10px] font-black px-3 py-1.5 border border-[#171717] shadow-[2px_2px_0px_#171717] transition flex items-center gap-1"
                  >
                    <Compass className="w-3.5 h-3.5" /> [ 🕵️ INVESTIGATE ]
                  </Link>

                  <Link
                    href={`/cases/${caseId}/evidence${selectedNode.path ? '?file=' + encodeURIComponent(selectedNode.path) : ''}`}
                    className="bg-white hover:bg-[#FAF8F5] text-[#171717] text-[10px] font-black px-3 py-1.5 border border-[#171717] transition flex items-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" /> [ 💻 SOURCE ]
                  </Link>
                </>
              )}
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs font-bold text-[#4A4A4A] hover:text-[#171717] px-3 py-1.5 border border-[#171717]"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
