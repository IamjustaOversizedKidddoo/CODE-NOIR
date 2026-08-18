import { describe, it, expect } from 'vitest';
import { isBinaryExtension, isBinaryBuffer } from '@/lib/ingestion/binary-detector';

describe('BinaryDetector: Classification Heuristics', () => {
  it('should identify binary extensions correctly', () => {
    expect(isBinaryExtension('image.png')).toBe(true);
    expect(isBinaryExtension('app.exe')).toBe(true);
    expect(isBinaryExtension('module.wasm')).toBe(true);
    expect(isBinaryExtension('database.sqlite')).toBe(true);
  });

  it('should identify text extensions correctly', () => {
    expect(isBinaryExtension('server.ts')).toBe(false);
    expect(isBinaryExtension('main.py')).toBe(false);
    expect(isBinaryExtension('package.json')).toBe(false);
    expect(isBinaryExtension('README.md')).toBe(false);
  });

  it('should detect binary buffers containing null bytes', () => {
    const textBuffer = Buffer.from('function hello() { return "world"; }\n');
    const binaryBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x00, 0x01, 0x01, 0x00]);

    expect(isBinaryBuffer(textBuffer)).toBe(false);
    expect(isBinaryBuffer(binaryBuffer)).toBe(true);
  });
});
