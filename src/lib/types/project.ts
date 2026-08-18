import { ProjectStatus } from './state-machine';

export interface CaseOverview {
  id: string;
  caseNumber: string;
  name: string;
  description?: string | null;
  totalFiles: number;
  includedFiles: number;
  ignoredFiles: number;
  totalLines: number;
  totalBytes: number;
  primaryLang?: string | null;
  status: ProjectStatus;
  statusMessage?: string | null;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoveredFileInfo {
  path: string;
  extension: string;
  sizeBytes: number;
  lineCount: number;
  isBinary: boolean;
  isIgnored: boolean;
  ignoreReason?: string;
  isEntry: boolean;
  hash: string;
}

export interface IngestionResult {
  projectId: string;
  caseNumber: string;
  totalFiles: number;
  includedFiles: number;
  ignoredFiles: number;
  totalLines: number;
  totalBytes: number;
  primaryLang: string;
  files: DiscoveredFileInfo[];
}

export interface StructuredEvent {
  caseId: string;
  timestamp: string;
  eventType: string;
  state: ProjectStatus;
  message: string;
  progress: number;
  filesProcessed?: number;
  filesTotal?: number;
  data?: Record<string, any>;
}
