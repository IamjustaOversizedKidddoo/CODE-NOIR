'use client';

import React, { useState } from 'react';
import {
  generateArchitectureFlowDiagram,
  generateInstallationFlowDiagram,
} from '@/lib/investigation/generators/flow-diagram-generator';
import { VisualFlowDiagram, VisualFlowNode } from '@/lib/investigation/types';
import {
  Network,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowDown,
  ArrowRight,
  Copy,
  Check,
  Shield,
  Layers,
  Cpu,
  Database,
  Globe,
  Lock,
  Code2,
} from 'lucide-react';
import { clsx } from 'clsx';

interface VisualFlowDiagramsProps {
  caseId: string;
  project: any;
}

export const VisualFlowDiagrams: React.FC<VisualFlowDiagramsProps> = ({ caseId, project }) => {
  const [activeTab, setActiveTab] = useState<'ARCHITECTURE' | 'INSTALLATION'>('ARCHITECTURE');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<VisualFlowNode | null>(null);

  // Extract payload for generators
  const techProfile = project?.techStack ? JSON.parse(project.techStack) : {};
  const entryPoints = project?.entryPoints ? JSON.parse(project.entryPoints) : [];
  const endpoints = project?.endpointsJson ? JSON.parse(project.endpointsJson) : [];
  const envVars = project?.envVarsJson ? JSON.parse(project.envVarsJson) : [];
  const dbEvidence = project?.dbEvidenceJson ? JSON.parse(project.dbEvidenceJson) : [];
  const brain = project?.brainJson
    ? typeof project.brainJson === 'string'
      ? JSON.parse(project.brainJson)
      : project.brainJson
    : {};

  const projectPayload = {
    name: project?.name || 'Repository Case',
    primaryLang: project?.primaryLang || 'TypeScript',
    files: project?.files || [],
    symbols: project?.symbols || [],
    dependencies: project?.dependencies || [],
    entryPoints,
    endpoints,
    envVars,
    dbEvidence,
    techProfile,
    brain,
  };

  const archDiagram: VisualFlowDiagram = generateArchitectureFlowDiagram(caseId, projectPayload);
  const installDiagram: VisualFlowDiagram = generateInstallationFlowDiagram(caseId, projectPayload);

  const activeDiagram = activeTab === 'ARCHITECTURE' ? archDiagram : installDiagram;

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const getNodeBadgeColor = (type: string, status: string) => {
    if (status === 'DISCREPANCY') return 'bg-[#F27661] text-white border-[#171717]';
    if (status === 'UNDOCUMENTED') return 'bg-[#FAF8F5] text-zinc-600 border-[#171717]';

    switch (type) {
      case 'ENTRY_POINT':
        return 'bg-[#F4C542] text-[#171717] border-[#171717]';
      case 'FRONTEND':
        return 'bg-[#8ED8B0] text-[#171717] border-[#171717]';
      case 'API':
        return 'bg-[#B8A7E8] text-[#171717] border-[#171717]';
      case 'SERVICE':
      case 'BACKEND':
        return 'bg-[#3157D5] text-white border-[#171717]';
      case 'DATABASE_NODE':
      case 'DATABASE':
        return 'bg-[#8ED8B0] text-[#171717] border-[#171717]';
      case 'INSTALLATION':
      case 'EXECUTION':
        return 'bg-[#3157D5] text-white border-[#171717]';
      case 'PREREQUISITE':
      case 'CONFIGURATION':
        return 'bg-[#F4C542] text-[#171717] border-[#171717]';
      default:
        return 'bg-white text-[#171717] border-[#171717]';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ENTRY_POINT':
        return <Play className="w-4 h-4 text-[#171717]" />;
      case 'FRONTEND':
        return <Globe className="w-4 h-4 text-[#171717]" />;
      case 'API':
        return <Network className="w-4 h-4 text-[#171717]" />;
      case 'SERVICE':
      case 'BACKEND':
        return <Cpu className="w-4 h-4 text-white" />;
      case 'DATABASE_NODE':
      case 'DATABASE':
        return <Database className="w-4 h-4 text-[#171717]" />;
      case 'INSTALLATION':
      case 'EXECUTION':
        return <Terminal className="w-4 h-4 text-white" />;
      default:
        return <Code2 className="w-4 h-4 text-[#171717]" />;
    }
  };

  return (
    <section className="bg-white border-4 border-[#171717] shadow-[8px_8px_0px_#171717] p-6 space-y-6 font-mono">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-3 border-[#171717] pb-4">
        <div>
          <span className="text-[10px] bg-[#3157D5] text-white px-2 py-0.5 font-black uppercase border border-[#171717] shadow-[2px_2px_0px_#171717]">
            VISUAL EVIDENCE FLOW DIAGRAMS
          </span>
          <h2 className="text-xl md:text-2xl font-black uppercase text-[#171717] tracking-tight mt-1 font-sans">
            SYSTEM FLOW VISUALIZER
          </h2>
        </div>

        {/* Diagram Selector Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ARCHITECTURE');
              setSelectedNode(null);
            }}
            className={clsx(
              'font-mono text-xs font-black px-4 py-2 border-2 border-[#171717] transition flex items-center gap-2 shadow-[3px_3px_0px_#171717]',
              activeTab === 'ARCHITECTURE' ? 'bg-[#3157D5] text-white' : 'bg-[#F5F1E8] text-[#4A4A4A] hover:bg-[#EBE5D8]'
            )}
          >
            <Network className="w-4 h-4" />
            <span>1. ARCHITECTURE FLOW</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('INSTALLATION');
              setSelectedNode(null);
            }}
            className={clsx(
              'font-mono text-xs font-black px-4 py-2 border-2 border-[#171717] transition flex items-center gap-2 shadow-[3px_3px_0px_#171717]',
              activeTab === 'INSTALLATION' ? 'bg-[#F4C542] text-[#171717]' : 'bg-[#F5F1E8] text-[#4A4A4A] hover:bg-[#EBE5D8]'
            )}
          >
            <Terminal className="w-4 h-4" />
            <span>2. INSTALL & RUN FLOW</span>
          </button>
        </div>
      </div>

      {/* Description & Overview Banner */}
      <div className="bg-[#FAF8F5] border-2 border-[#171717] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-[#3157D5] font-black uppercase block">
            {activeTab === 'ARCHITECTURE' ? 'DIAGRAM 1 // SYSTEM ARCHITECTURE & CONNECTIONS' : 'DIAGRAM 2 // LOCAL DEVELOPER EXECUTION FLOW'}
          </span>
          <p className="text-xs text-[#171717] font-sans font-medium">
            {activeDiagram.description}
          </p>
        </div>

        {activeDiagram.warnings && activeDiagram.warnings.length > 0 && (
          <div className="bg-[#FFF4F2] border border-[#F27661] px-3 py-1.5 text-[10px] font-black text-[#F27661] flex items-center gap-1.5 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{activeDiagram.warnings.length} DISCREPANCY FLAGGED</span>
          </div>
        )}
      </div>

      {/* Main Visual Canvas */}
      {activeTab === 'INSTALLATION' ? (
        /* INSTALLATION & RUN SEQUENTIAL FLOW DIAGRAM */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {installDiagram.nodes.map((node, index) => {
              const isSelected = selectedNode?.id === node.id;
              const hasDiscrepancy = node.status === 'DISCREPANCY';
              const badgeColor = getNodeBadgeColor(node.type, node.status);

              return (
                <React.Fragment key={node.id}>
                  <div
                    onClick={() => setSelectedNode(node)}
                    className={clsx(
                      'border-3 p-5 transition cursor-pointer relative flex flex-col justify-between space-y-3 bg-white shadow-[4px_4px_0px_#171717] hover:-translate-y-1',
                      hasDiscrepancy ? 'border-[#F27661] bg-[#FFF4F2]' : 'border-[#171717]',
                      isSelected ? 'ring-4 ring-[#F4C542] shadow-[6px_6px_0px_#171717]' : ''
                    )}
                  >
                    {/* Node Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase">
                        STEP {node.stepNumber}
                      </span>
                      <span className={clsx('text-[9px] font-black px-2 py-0.5 border', badgeColor)}>
                        {node.status === 'DISCREPANCY' ? '⚠️ DISCREPANCY' : node.type}
                      </span>
                    </div>

                    {/* Node Title */}
                    <div>
                      <h4 className="font-bold text-sm text-[#171717] uppercase tracking-tight flex items-center gap-2 font-sans">
                        {getNodeIcon(node.type)}
                        <span>{node.title}</span>
                      </h4>
                      {node.subtitle && (
                        <p className="text-[11px] text-[#3157D5] font-bold mt-0.5 truncate">
                          {node.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Command Terminal Box */}
                    {node.command && (
                      <div className="bg-[#171717] text-white p-2.5 rounded-none font-mono text-[11px] flex items-center justify-between gap-2 border border-[#171717]">
                        <code className="truncate text-[#8ED8B0] font-bold">
                          $ {node.command}
                        </code>
                        {node.command !== 'Not documented in README' && node.command !== 'Not required' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCommand(node.command!);
                            }}
                            className="text-zinc-400 hover:text-white shrink-0 p-1"
                            title="Copy Command"
                          >
                            {copiedCmd === node.command ? <Check className="w-3.5 h-3.5 text-[#8ED8B0]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Discrepancy Alert inside card */}
                    {node.discrepancyWarning && (
                      <div className="bg-[#F27661] text-white text-[10px] p-2 border border-[#171717] font-bold space-y-0.5">
                        <span className="uppercase font-black flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> README DISCREPANCY:
                        </span>
                        <p className="opacity-95">{node.discrepancyWarning}</p>
                      </div>
                    )}

                    {/* Footer Description & Evidence */}
                    <p className="text-[11px] text-zinc-600 font-sans leading-snug">
                      {node.description}
                    </p>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        /* ARCHITECTURE & CONNECTION FLOW DIAGRAM */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archDiagram.nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const badgeColor = getNodeBadgeColor(node.type, node.status);

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={clsx(
                    'border-3 border-[#171717] p-5 transition cursor-pointer bg-white shadow-[4px_4px_0px_#171717] hover:-translate-y-1 space-y-3 flex flex-col justify-between',
                    isSelected ? 'ring-4 ring-[#F4C542] shadow-[6px_6px_0px_#171717]' : ''
                  )}
                >
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <span className={clsx('text-[9px] font-black px-2 py-0.5 border', badgeColor)}>
                      {node.type}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold">CONFIRMED</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#171717] uppercase tracking-tight flex items-center gap-2 font-sans">
                      {getNodeIcon(node.type)}
                      <span>{node.title}</span>
                    </h4>
                    {node.subtitle && (
                      <p className="text-[11px] text-[#3157D5] font-bold mt-0.5 truncate">
                        {node.subtitle}
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-600 font-sans leading-snug">
                    {node.description}
                  </p>

                  <div className="bg-[#FAF8F5] p-2 border border-zinc-300 text-[10px] text-zinc-500 font-mono truncate">
                    🔍 {node.evidence}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connection Relationships Summary */}
          <div className="bg-[#171717] text-white p-4 border-3 border-[#171717] space-y-2 mt-4">
            <span className="text-[10px] text-[#F4C542] font-black uppercase tracking-wider block">
              🔗 SYSTEM CONNECTIONS & RELATIONSHIPS ({archDiagram.edges.length} ARCS)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono">
              {archDiagram.edges.map((edge) => (
                <div key={edge.id} className="bg-[#242424] p-2 border border-zinc-700 flex items-center justify-between">
                  <span className="text-[#8ED8B0] font-bold">{edge.source.replace('node-', '').toUpperCase()}</span>
                  <span className="text-zinc-400 font-bold">── {edge.label} ──▶</span>
                  <span className="text-[#F4C542] font-bold">{edge.target.replace('node-', '').toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Node Evidence Inspector Drawer */}
      {selectedNode && (
        <div className="border-t-3 border-[#171717] bg-[#F5F1E8] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#3157D5] uppercase flex items-center gap-1.5">
              🔍 EVIDENCE INSPECTOR: {selectedNode.title}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs font-bold text-zinc-500 hover:text-black"
            >
              [ CLOSE ]
            </button>
          </div>
          <p className="text-xs font-sans text-[#171717]">{selectedNode.description}</p>
          <div className="bg-white p-3 border border-[#171717] text-xs font-mono">
            <strong>Evidence:</strong> {selectedNode.evidence}
          </div>
        </div>
      )}
    </section>
  );
};
