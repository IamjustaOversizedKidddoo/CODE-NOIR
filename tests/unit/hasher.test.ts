import { describe, it, expect } from 'vitest';
import { calculateBufferHash } from '@/lib/ingestion/hasher';

describe('Hasher: Deterministic SHA-256 Calculation', () => {
  it('should compute deterministic hashes for buffers', () => {
    const buffer1 = Buffer.from('console.log("Crime Scene Evidence");');
    const buffer2 = Buffer.from('console.log("Crime Scene Evidence");');
    const buffer3 = Buffer.from('console.log("Modified Evidence");');

    const hash1 = calculateBufferHash(buffer1);
    const hash2 = calculateBufferHash(buffer2);
    const hash3 = calculateBufferHash(buffer3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});
