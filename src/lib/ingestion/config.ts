import path from 'path';

export interface IngestionConfig {
  storageRoot: string;
  maxExtractedBytes: number;
  maxFilesCount: number;
  maxSingleFileBytes: number;
  maxCompressionRatio: number;
}

export function getIngestionConfig(): IngestionConfig {
  const isServerless =
    !!process.env.VERCEL ||
    process.cwd().startsWith('/var/task') ||
    process.cwd().startsWith('/tmp');

  let storageRoot: string;
  if (isServerless) {
    storageRoot = '/tmp/.storage';
  } else if (process.env.STORAGE_ROOT) {
    storageRoot = path.resolve(process.env.STORAGE_ROOT);
  } else {
    storageRoot = path.join(process.cwd(), '.storage');
  }

  return {
    storageRoot,
    maxExtractedBytes: parseInt(
      process.env.MAX_EXTRACTED_BYTES || '262144000',
      10
    ), // 250 MB
    maxFilesCount: parseInt(process.env.MAX_FILES_COUNT || '10000', 10), // 10,000 files
    maxSingleFileBytes: parseInt(
      process.env.MAX_SINGLE_FILE_BYTES || '10485760',
      10
    ), // 10 MB per text file
    maxCompressionRatio: parseInt(
      process.env.MAX_COMPRESSION_RATIO || '100',
      10
    ), // 100:1 ratio
  };
}
