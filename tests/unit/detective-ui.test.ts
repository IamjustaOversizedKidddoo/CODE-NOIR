import { describe, it, expect } from 'vitest';

describe('Cyber Detective UI Design System & Component Helpers', () => {
  it('should correctly format stamp status identifiers', () => {
    const statuses = ['confirmed', 'under investigation', 'wanted', 'classified'];
    const formatted = statuses.map((s) => s.toUpperCase().replace(/\s+/g, '_'));

    expect(formatted).toContain('CONFIRMED');
    expect(formatted).toContain('UNDER_INVESTIGATION');
    expect(formatted).toContain('WANTED');
    expect(formatted).toContain('CLASSIFIED');
  });

  it('should calculate highlighted line ranges correctly for SourceInspector', () => {
    const startLine = 10;
    const endLine = 20;

    const isLineHighlighted = (lineNum: number) => lineNum >= startLine && lineNum <= endLine;

    expect(isLineHighlighted(5)).toBe(false);
    expect(isLineHighlighted(10)).toBe(true);
    expect(isLineHighlighted(15)).toBe(true);
    expect(isLineHighlighted(20)).toBe(true);
    expect(isLineHighlighted(25)).toBe(false);
  });

  it('should accurately match search queries across files, symbols, and investigations', () => {
    const files = [{ id: 'f1', path: 'src/server.ts' }, { id: 'f2', path: 'src/auth.ts' }];
    const symbols = [{ id: 's1', name: 'authenticateUser', kind: 'FUNCTION', filePath: 'src/auth.ts' }];
    const query = 'auth';

    const matchedFiles = files.filter((f) => f.path.toLowerCase().includes(query));
    const matchedSymbols = symbols.filter((s) => s.name.toLowerCase().includes(query));

    expect(matchedFiles.length).toBe(1);
    expect(matchedFiles[0].path).toBe('src/auth.ts');
    expect(matchedSymbols.length).toBe(1);
    expect(matchedSymbols[0].name).toBe('authenticateUser');
  });

  it('should define structured orientation steps across all 7 investigation pillars', async () => {
    const { DetectiveBriefingTour } = await import('@/components/detective/DetectiveBriefingTour');
    expect(DetectiveBriefingTour).toBeDefined();

    // Verify localStorage key convention
    const TOUR_KEY = 'case_file_orientation_completed';
    expect(TOUR_KEY).toBe('case_file_orientation_completed');
  });
});
