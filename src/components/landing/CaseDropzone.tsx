'use client';

import React, { useState, useRef } from 'react';
import { BrutalistButton } from '../ui/BrutalistButton';
import { EvidenceBadge } from '../ui/EvidenceBadge';
import { UploadCloud, Folder, CheckCircle2, ShieldAlert, FileArchive, GitBranch, Link as LinkIcon } from 'lucide-react';

interface IngestionSummary {
  caseId: string;
  caseNumber: string;
  totalFiles: number;
  includedFiles: number;
  ignoredFiles: number;
  totalLines: number;
  totalBytes: number;
  primaryLang: string;
}

interface FolderFileItem {
  file: File;
  relativePath: string;
}

const IGNORED_DIRS = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
  'env',
  '.idea',
  '.vscode',
  '.turbo',
  '.cache',
  '.parcel-cache',
  'target',
  'vendor',
]);

function isIgnoredRelativePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const isDirSegment = i < segments.length - 1;
    if (isDirSegment && IGNORED_DIRS.has(segments[i].toLowerCase())) {
      return true;
    }
  }
  return false;
}

async function readFileSystemEntry(
  entry: any,
  pathPrefix: string = ''
): Promise<FolderFileItem[]> {
  if (!entry) return [];
  const results: FolderFileItem[] = [];

  if (entry.isFile) {
    try {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const relPath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
      if (!isIgnoredRelativePath(relPath)) {
        results.push({ file, relativePath: relPath });
      }
    } catch {
      // Ignore read errors for inaccessible individual entries
    }
  } else if (entry.isDirectory) {
    if (IGNORED_DIRS.has(entry.name.toLowerCase())) {
      return []; // Skip ignored directory completely
    }

    const currentPrefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    const dirReader = entry.createReader();

    const readEntriesBatch = (): Promise<any[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(
          (entries: any[]) => resolve(entries),
          () => resolve([])
        );
      });
    };

    let entries: any[] = [];
    let batch: any[] = [];
    do {
      batch = await readEntriesBatch();
      if (batch.length > 0) {
        entries.push(...batch);
      }
    } while (batch.length > 0);

    for (const childEntry of entries) {
      const childResults = await readFileSystemEntry(childEntry, currentPrefix);
      results.push(...childResults);
    }
  }

  return results;
}

export function CaseDropzone() {
  const [intakeMode, setIntakeMode] = useState<'FILES' | 'GITHUB'>('FILES');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<FolderFileItem[]>([]);
  const [folderName, setFolderName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>('AWAITING EVIDENCE SUBMISSION...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestionSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    setIntakeMode('FILES');

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entryPromises: Promise<FolderFileItem[]>[] = [];
      let isSingleZip = false;

      // Check if it's a single dropped .zip archive file
      if (items.length === 1 && e.dataTransfer.files && e.dataTransfer.files.length === 1) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.zip')) {
          setSelectedFile(file);
          setSelectedFolderFiles([]);
          setFolderName('');
          isSingleZip = true;
        }
      }

      if (!isSingleZip) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry) {
              entryPromises.push(readFileSystemEntry(entry));
            } else {
              const file = item.getAsFile();
              if (file) {
                const relPath = (file as any).webkitRelativePath || file.name;
                if (!isIgnoredRelativePath(relPath)) {
                  entryPromises.push(Promise.resolve([{ file, relativePath: relPath }]));
                }
              }
            }
          }
        }

        const nestedResults = await Promise.all(entryPromises);
        const allDiscovered = nestedResults.flat();

        if (allDiscovered.length > 0) {
          setSelectedFolderFiles(allDiscovered);
          setSelectedFile(null);
          const firstRel = allDiscovered[0].relativePath;
          const rootDir = firstRel.includes('/') ? firstRel.split('/')[0] : 'Project Folder';
          setFolderName(rootDir);
        }
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(files[0]);
        setSelectedFolderFiles([]);
        setFolderName('');
      } else {
        const discovered: FolderFileItem[] = [];
        for (const f of files) {
          const relPath = (f as any).webkitRelativePath || f.name;
          if (!isIgnoredRelativePath(relPath)) {
            discovered.push({ file: f, relativePath: relPath });
          }
        }
        setSelectedFolderFiles(discovered);
        setSelectedFile(null);
        const firstRel = discovered[0]?.relativePath || files[0].name;
        const rootDir = firstRel.includes('/') ? firstRel.split('/')[0] : 'Project Folder';
        setFolderName(rootDir);
      }
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setIntakeMode('FILES');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(file);
        setSelectedFolderFiles([]);
        setFolderName('');
      } else {
        // Handle single non-ZIP file upload gracefully
        setSelectedFile(null);
        setSelectedFolderFiles([{ file, relativePath: file.name }]);
        setFolderName('Single File Evidence');
      }
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setIntakeMode('FILES');
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const discovered: FolderFileItem[] = [];

      for (const file of files) {
        const relPath = file.webkitRelativePath || file.name;
        if (!isIgnoredRelativePath(relPath)) {
          discovered.push({ file, relativePath: relPath });
        }
      }

      if (discovered.length === 0) {
        setErrorMsg('Selected folder contain only ignored files or system directories (e.g. node_modules, .git).');
        return;
      }

      setSelectedFolderFiles(discovered);
      setSelectedFile(null);

      const firstPath = discovered[0].relativePath;
      const rootFolder = firstPath.includes('/') ? firstPath.split('/')[0] : 'Project Folder';
      setFolderName(rootFolder);
    }
  };

  const handleUpload = async () => {
    const isGitHubSubmission = intakeMode === 'GITHUB' || (githubUrl.trim().length > 0 && !selectedFile && selectedFolderFiles.length === 0);
    const hasZip = Boolean(selectedFile);
    const hasFolder = selectedFolderFiles.length > 0;

    if (!isGitHubSubmission && !hasZip && !hasFolder) {
      setErrorMsg('No evidence submitted. Please enter a public GitHub repository URL, select a .zip archive, or select a project folder.');
      return;
    }

    if (isGitHubSubmission && !githubUrl.trim()) {
      setErrorMsg('Please enter a valid public GitHub repository URL.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMsg(null);

    try {
      let res: Response;

      if (isGitHubSubmission) {
        setStatusLog('CONNECTING TO GITHUB VAULT & DOWNLOADING ARCHIVE...');
        setUploadProgress(30);

        res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            githubUrl: githubUrl.trim(),
          }),
        });
      } else {
        setStatusLog('SECURING SANDBOX ENVIRONMENT...');
        const formData = new FormData();

        if (hasZip && selectedFile) {
          formData.append('archive', selectedFile);
          formData.append('file', selectedFile);
          formData.append('projectName', selectedFile.name.replace(/\.zip$/i, ''));
        } else if (hasFolder) {
          formData.append('projectName', folderName || 'Uploaded Project Folder');
          for (const item of selectedFolderFiles) {
            formData.append('files', item.file);
            formData.append('paths', item.relativePath);
          }
        }

        setStatusLog('ANALYZING & DECOMPRESSING EVIDENCE...');
        setUploadProgress(40);

        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      }

      setUploadProgress(75);
      setStatusLog('BUILDING STATIC AST & SYMBOL GRAPH...');

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to analyze evidence.');
      }

      const data = await res.json();
      setUploadProgress(100);
      setStatusLog('CASE REGISTERED & INDEXED IN VAULT.');

      setSummary({
        caseId: data.caseId,
        caseNumber: data.caseNumber || 'CASE-2026-001',
        totalFiles: data.summary?.totalFiles || 0,
        includedFiles: data.summary?.includedFiles || 0,
        ignoredFiles: data.summary?.ignoredFiles || 0,
        totalLines: data.summary?.totalLines || 0,
        totalBytes: data.summary?.totalBytes || 0,
        primaryLang: data.summary?.primaryLang || data.summary?.primaryLanguage || 'TypeScript',
      });

      // Redirect to Case Brief (Orientation Landing Page)
      setTimeout(() => {
        window.location.href = `/cases/${data.caseId}`;
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Evidence ingestion aborted due to security violation.');
      setStatusLog('SECURITY INTERVENTION OCCURRED.');
    } finally {
      setIsUploading(false);
    }
  };


  const totalFolderSize = selectedFolderFiles.reduce((acc, item) => acc + item.file.size, 0);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleZipSelect}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        // @ts-ignore
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Investigation Vault Container */}
      <div data-tour="upload-dropzone" className="bg-[#FFFFFF] border-4 border-[#171717] shadow-[8px_8px_0px_#171717] p-6 md:p-8 relative">
        {/* Dossier Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-3 border-[#171717] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#3157D5] border-2 border-[#171717]"></div>
            <span className="font-mono font-black text-sm uppercase tracking-widest text-[#171717]">
              EVIDENCE INTAKE TERMINAL // PORT 8080
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EvidenceBadge label="SANDBOX SECURED" variant="mint" />
            <EvidenceBadge label="NO CODE EXECUTION" variant="dark" />
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setIntakeMode('FILES');
              setErrorMsg(null);
            }}
            className={`font-mono text-xs font-black px-4 py-2 border-2 border-[#171717] transition ${
              intakeMode === 'FILES'
                ? 'bg-[#F4C542] text-[#171717] shadow-[3px_3px_0px_#171717]'
                : 'bg-[#F5F1E8] text-[#4A4A4A] hover:bg-[#EBE5D8]'
            }`}
          >
            📁 ARCHIVE / FOLDER
          </button>
          <button
            type="button"
            onClick={() => {
              setIntakeMode('GITHUB');
              setErrorMsg(null);
            }}
            className={`font-mono text-xs font-black px-4 py-2 border-2 border-[#171717] transition flex items-center gap-1.5 ${
              intakeMode === 'GITHUB'
                ? 'bg-[#3157D5] text-white shadow-[3px_3px_0px_#171717]'
                : 'bg-[#F5F1E8] text-[#4A4A4A] hover:bg-[#EBE5D8]'
            }`}
          >
            <GitBranch className="w-4 h-4" /> 🐙 PUBLIC GITHUB REPO
          </button>
        </div>

        {/* GitHub Repo Mode */}
        {intakeMode === 'GITHUB' ? (
          <div className="border-3 border-[#171717] bg-[#F5F1E8] p-8 md:p-10 text-center relative shadow-[4px_4px_0px_#171717]">
            <div className="flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-[#171717] text-[#8ED8B0] border-2 border-[#171717] flex items-center justify-center shadow-[4px_4px_0px_#3157D5]">
                <GitBranch className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#171717]">
                  SUBMIT PUBLIC GITHUB REPOSITORY
                </h3>
                <p className="font-mono text-xs md:text-sm text-[#4A4A4A] mt-1 font-bold">
                  Provide a link to any public repository on GitHub for automated static analysis
                </p>
              </div>

              <div className="w-full mt-2">
                <div className="relative flex items-center">
                  <LinkIcon className="w-5 h-5 absolute left-3 text-[#171717] pointer-events-none" />
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="https://github.com/owner/repository"
                    className="w-full bg-white border-3 border-[#171717] pl-10 pr-4 py-3 font-mono text-sm font-bold text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#3157D5] shadow-[3px_3px_0px_#171717]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className="font-mono text-[11px] bg-white px-2 py-1 border border-[#171717] font-bold shadow-[2px_2px_0px_#171717]">
                  FORMAT: HTTPS://GITHUB.COM/OWNER/REPO
                </span>
                <span className="font-mono text-[11px] bg-[#8ED8B0] text-[#171717] px-2 py-1 border border-[#171717] font-bold shadow-[2px_2px_0px_#171717]">
                  PUBLIC REPOSITORIES ONLY
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Dropzone Area */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-3 border-dashed transition-all p-8 md:p-10 text-center relative ${
              isDragging
                ? 'border-[#3157D5] bg-[#3157D5]/10 scale-[0.99]'
                : 'border-[#171717] bg-[#F5F1E8] hover:bg-[#EBE5D8]'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-[#171717] text-white border-2 border-[#171717] flex items-center justify-center shadow-[4px_4px_0px_#3157D5]">
                {selectedFolderFiles.length > 0 ? (
                  <Folder className="w-8 h-8 text-[#8ED8B0]" />
                ) : selectedFile ? (
                  <FileArchive className="w-8 h-8 text-[#F4C542]" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-[#F4C542]" />
                )}
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#171717]">
                  {selectedFile ? (
                    `ZIP ARCHIVE: ${selectedFile.name}`
                  ) : selectedFolderFiles.length > 0 ? (
                    `FOLDER SELECTED: ${folderName}`
                  ) : (
                    'DROP CODEBASE ARCHIVE OR FOLDER HERE'
                  )}
                </h3>
                <p className="font-mono text-xs md:text-sm text-[#4A4A4A] mt-1 font-bold">
                  {selectedFile ? (
                    `Payload Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB — Ready to submit`
                  ) : selectedFolderFiles.length > 0 ? (
                    `${selectedFolderFiles.length} FILES DISCOVERED (${(totalFolderSize / 1024 / 1024).toFixed(2)} MB) — Ready to analyze`
                  ) : (
                    'Submit your repository as a .zip file or select the entire source folder'
                  )}
                </p>
              </div>

              {/* Quick Picker Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <BrutalistButton
                  type="button"
                  variant="caution"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 SELECT .ZIP ARCHIVE
                </BrutalistButton>
                <BrutalistButton
                  type="button"
                  variant="lavender"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                >
                  📂 SELECT ENTIRE FOLDER
                </BrutalistButton>
              </div>


              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <span className="font-mono text-[11px] bg-white px-2 py-1 border border-[#171717] font-bold shadow-[2px_2px_0px_#171717]">
                  MAX: 250 MB
                </span>
                <span className="font-mono text-[11px] bg-[#8ED8B0] text-[#171717] px-2 py-1 border border-[#171717] font-bold shadow-[2px_2px_0px_#171717]">
                  AUTO-IGNORES: NODE_MODULES, .GIT, BUILD
                </span>
                <span className="font-mono text-[11px] bg-[#B8A7E8] text-[#171717] px-2 py-1 border border-[#171717] font-bold shadow-[2px_2px_0px_#171717]">
                  STATIC AST ONLY
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto flex items-center gap-3">
            <div className="w-3 h-3 bg-[#F4C542] border border-[#171717] animate-ping"></div>
            <span className="font-mono text-xs font-bold text-[#171717] truncate">
              {statusLog}
            </span>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            {(selectedFile || selectedFolderFiles.length > 0 || githubUrl.length > 0) && (
              <BrutalistButton
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedFolderFiles([]);
                  setFolderName('');
                  setGithubUrl('');
                  setSummary(null);
                  setErrorMsg(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  if (folderInputRef.current) folderInputRef.current.value = '';
                }}
              >
                DISCARD
              </BrutalistButton>
            )}
            <BrutalistButton
              type="button"
              variant="cobalt"
              size="md"
              disabled={(intakeMode === 'GITHUB' ? !githubUrl.trim() : (!selectedFile && selectedFolderFiles.length === 0)) || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? 'ANALYZING...' : 'HAND OVER THE EVIDENCE.'}
            </BrutalistButton>
          </div>
        </div>


        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-6">
            <div className="flex justify-between font-mono text-xs font-bold mb-1">
              <span>EXTRACTION & CATALOGING</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-4 bg-[#EBE5D8] border-2 border-[#171717] overflow-hidden p-0.5">
              <div
                className="h-full bg-[#3157D5] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-6 bg-[#F27661] text-white p-4 border-3 border-[#171717] shadow-[4px_4px_0px_#171717] flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <div className="font-mono font-black text-sm uppercase tracking-wider">
                [ALERT // INGESTION NOTICE]
              </div>
              <p className="font-mono text-xs font-bold mt-1 opacity-95">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Case Logged Summary Dossier */}
        {summary && (
          <div className="mt-8 bg-[#171717] text-white p-6 border-3 border-[#171717] shadow-[6px_6px_0px_#F4C542]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-700 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#8ED8B0]" />
                <div>
                  <span className="font-mono text-xs text-[#8ED8B0] font-black uppercase">
                    EVIDENCE SECURED & INDEXED
                  </span>
                  <h4 className="text-xl font-mono font-black">{summary.caseNumber}</h4>
                </div>
              </div>
              <div className="stamp-classified">CLASSIFIED</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs mb-6">
              <div className="bg-[#242424] p-3 border border-zinc-700 shadow-[2px_2px_0px_#000]">
                <div className="text-zinc-400 font-bold">TOTAL DISCOVERED</div>
                <div className="text-lg font-black text-white mt-1">{summary.totalFiles} files</div>
              </div>
              <div className="bg-[#242424] p-3 border border-zinc-700 shadow-[2px_2px_0px_#000]">
                <div className="text-zinc-400 font-bold">ACTIVE EVIDENCE</div>
                <div className="text-lg font-black text-[#F4C542] mt-1">{summary.includedFiles} files</div>
              </div>
              <div className="bg-[#242424] p-3 border border-zinc-700 shadow-[2px_2px_0px_#000]">
                <div className="text-zinc-400 font-bold">LINES OF CODE</div>
                <div className="text-lg font-black text-white mt-1">{summary.totalLines.toLocaleString()}</div>
              </div>
              <div className="bg-[#242424] p-3 border border-zinc-700 shadow-[2px_2px_0px_#000]">
                <div className="text-zinc-400 font-bold">PRIMARY TECH</div>
                <div className="text-lg font-black text-[#8ED8B0] mt-1">{summary.primaryLang}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#242424] p-4 border border-zinc-700">
              <span className="font-mono text-xs text-zinc-300">
                🔍 All files cataloged into vault with SHA-256 integrity signatures.
              </span>
              <span className="font-mono text-xs font-black text-[#8ED8B0]">
                STATUS: INGESTION COMPLETE
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
