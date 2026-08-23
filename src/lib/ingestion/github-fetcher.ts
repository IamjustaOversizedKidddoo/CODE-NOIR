import { IngestionSecurityError } from './security-guard';

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  ref?: string;
  fullUrl: string;
}

/**
 * Parses and validates a public GitHub repository URL.
 * Supports forms:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/main
 */
export function parseGitHubUrl(rawUrl: string): GitHubRepoInfo {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new IngestionSecurityError('Empty or invalid GitHub URL provided.', 'INVALID_GITHUB_URL');
  }

  let trimmed = rawUrl.trim();

  // Auto-prefix missing scheme for bare domain URLs
  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.toLowerCase().startsWith('github.com/') || trimmed.toLowerCase().startsWith('www.github.com/')) {
      trimmed = `https://${trimmed}`;
    }
  }

  // Basic sanity check against SSRF and non-HTTPS/non-GitHub protocols
  if (!trimmed.startsWith('https://github.com/') && !trimmed.startsWith('https://www.github.com/')) {
    throw new IngestionSecurityError(
      'Only public https://github.com repository URLs are supported.',
      'INVALID_GITHUB_HOST'
    );
  }

  try {
    const urlObj = new URL(trimmed);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.length < 2) {
      throw new IngestionSecurityError(
        'GitHub URL must contain both owner and repository name (e.g., https://github.com/owner/repo).',
        'MALFORMED_GITHUB_URL'
      );
    }

    const owner = pathSegments[0];
    let repo = pathSegments[1].replace(/\.git$/i, '');
    let ref: string | undefined = undefined;

    if (pathSegments.length >= 4 && (pathSegments[2] === 'tree' || pathSegments[2] === 'blob')) {
      ref = pathSegments[3];
    }

    // Validate characters to prevent injection
    if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
      throw new IngestionSecurityError(
        'Invalid characters detected in repository owner or name.',
        'INVALID_GITHUB_IDENTIFIER'
      );
    }

    return {
      owner,
      repo,
      ref,
      fullUrl: trimmed,
    };
  } catch (err: any) {
    if (err instanceof IngestionSecurityError) throw err;
    throw new IngestionSecurityError(`Failed to parse GitHub URL: ${err.message}`, 'MALFORMED_GITHUB_URL');
  }
}

/**
 * Downloads a public GitHub repository zipball archive as a Buffer.
 * Includes timeout guard and size limit checks.
 */
export async function fetchGitHubRepositoryZipball(
  rawUrl: string,
  maxBytes: number = 262144000 // 250 MB
): Promise<{ buffer: Buffer; repoInfo: GitHubRepoInfo }> {
  const repoInfo = parseGitHubUrl(rawUrl);
  const { owner, repo, ref } = repoInfo;

  // Candidate download URLs in order of precedence:
  // 1. If explicit ref provided (e.g. branch/tag), try codeload and GitHub API zipball.
  // 2. Otherwise try codeload for 'main', 'master', 'HEAD', and fallback to GitHub default branch zipball.
  const candidateUrls: string[] = [];

  if (ref) {
    candidateUrls.push(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${ref}`);
    candidateUrls.push(`https://codeload.github.com/${owner}/${repo}/zip/refs/tags/${ref}`);
    candidateUrls.push(`https://codeload.github.com/${owner}/${repo}/zip/${ref}`);
    candidateUrls.push(`https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`);
  } else {
    candidateUrls.push(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/main`);
    candidateUrls.push(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/master`);
    candidateUrls.push(`https://codeload.github.com/${owner}/${repo}/zip/HEAD`);
    candidateUrls.push(`https://api.github.com/repos/${owner}/${repo}/zipball`);
  }

  let lastError: Error | null = null;

  for (const downloadUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout guard

    try {
      const response = await fetch(downloadUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CODE-NOIR-Evidence-Fetcher/1.0',
          Accept: 'application/zip, application/octet-stream',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // Candidate URL 404'd, try next candidate branch
          continue;
        }
        if (response.status === 403) {
          throw new IngestionSecurityError(
            `Access forbidden by GitHub for repository ${owner}/${repo}. Check if the repository is public.`,
            'GITHUB_ACCESS_FORBIDDEN'
          );
        }
        throw new IngestionSecurityError(
          `GitHub returned HTTP error ${response.status} ${response.statusText}`,
          'GITHUB_FETCH_FAILED'
        );
      }

      // Check Content-Length header if available
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > maxBytes) {
          throw new IngestionSecurityError(
            `GitHub repository archive size (${(contentLength / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit (${(maxBytes / 1024 / 1024).toFixed(1)} MB).`,
            'EXCESSIVE_EXTRACTED_SIZE'
          );
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new IngestionSecurityError(
          `Received empty archive payload from GitHub repository ${owner}/${repo}.`,
          'EMPTY_FILE'
        );
      }

      if (buffer.length > maxBytes) {
        throw new IngestionSecurityError(
          `GitHub repository archive size (${(buffer.length / 1024 / 1024).toFixed(1)} MB) exceeds limit of ${(maxBytes / 1024 / 1024).toFixed(1)} MB.`,
          'EXCESSIVE_EXTRACTED_SIZE'
        );
      }

      return { buffer, repoInfo };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        lastError = new IngestionSecurityError(
          `Download timed out after 30 seconds fetching ${owner}/${repo} from GitHub.`,
          'GITHUB_FETCH_TIMEOUT'
        );
      } else {
        lastError = err;
      }
      // If it's a security error (like size limit), stop trying candidate URLs immediately
      if (err instanceof IngestionSecurityError && err.code !== 'GITHUB_FETCH_FAILED') {
        throw err;
      }
    }
  }

  throw (
    lastError ||
    new IngestionSecurityError(
      `Could not locate or download public GitHub repository ${owner}/${repo}. Verify the URL and repository visibility.`,
      'GITHUB_REPO_NOT_FOUND'
    )
  );
}
