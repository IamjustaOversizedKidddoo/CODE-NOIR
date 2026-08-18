import fs from 'fs';
import path from 'path';

const KNOWN_BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.svgz',
  // Audio & Video
  '.mp3', '.mp4', '.wav', '.ogg', '.flac', '.webm', '.avi', '.mov', '.mkv',
  // Binaries & Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.o', '.obj', '.pyc', '.pyo',
  // Packages & Archives
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar', '.jar', '.war', '.ear',
  // Documents & Data
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.sqlite', '.db',
  // WebAssembly & Fonts
  '.wasm', '.ttf', '.otf', '.woff', '.woff2', '.eot',
]);

const KNOWN_TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyi',
  '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.swift', '.kt',
  '.json', '.jsonc', '.yaml', '.yml', '.toml', '.xml', '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.md', '.mdx', '.txt', '.csv', '.env', '.example', '.gitignore', '.dockerignore',
  '.sql', '.graphql', '.gql', '.proto', '.sh', '.bash', '.zsh', '.bat', '.ps1',
]);

/**
 * Fast check based on extension.
 */
export function isBinaryExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return KNOWN_BINARY_EXTENSIONS.has(ext);
}

/**
 * Checks if a file buffer appears to be binary by checking for null bytes and control chars in the first 4KB.
 */
export function isBinaryBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;

  const checkLength = Math.min(buffer.length, 4096);
  let nullBytes = 0;
  let controlChars = 0;

  for (let i = 0; i < checkLength; i++) {
    const byte = buffer[i];
    if (byte === 0x00) {
      nullBytes++;
      // A single null byte in the first 4KB strongly indicates a binary file
      if (nullBytes > 0) return true;
    } else if (byte < 0x08 || (byte > 0x0d && byte < 0x20) || byte === 0x7f) {
      controlChars++;
    }
  }

  // If more than 10% of characters are non-standard control characters, classify as binary
  return controlChars / checkLength > 0.1;
}

/**
 * Inspects a file on disk for binary content.
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  if (isBinaryExtension(filePath)) {
    return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (KNOWN_TEXT_EXTENSIONS.has(ext)) {
    return false;
  }

  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await fd.read(buffer, 0, 4096, 0);
    await fd.close();

    return isBinaryBuffer(buffer.subarray(0, bytesRead));
  } catch {
    return false;
  }
}
