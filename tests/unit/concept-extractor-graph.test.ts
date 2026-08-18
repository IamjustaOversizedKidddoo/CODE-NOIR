import { describe, it, expect } from 'vitest';
import { extractProjectConcepts } from '@/lib/teaching/concept-extractor';
import { sortConceptsTopologically } from '@/lib/teaching/concept-graph';
import { ConceptDef } from '@/lib/teaching/types';

describe('ConceptExtractor & ConceptGraph: Derivation and Ordering', () => {
  it('should extract framework, language, security, and database concepts based on evidence', () => {
    const concepts = extractProjectConcepts({
      primaryLang: 'TypeScript',
      files: [{ path: 'src/auth.ts' }, { path: 'src/db.ts' }],
      symbols: [{ name: 'verifyToken', kind: 'FUNCTION' }, { name: 'UserPayload', kind: 'INTERFACE' }],
      techProfile: { databases: [{ name: 'Prisma' }] },
      endpoints: [{ path: '/api/login', method: 'POST' }],
      envVars: [{ name: 'JWT_SECRET' }],
      dbEvidence: [{ type: 'Prisma' }],
    });

    const names = concepts.map((c) => c.name);
    expect(names).toContain('TypeScript & JavaScript Async/Await');
    expect(names).toContain('Type Contracts & Interfaces');
    expect(names).toContain('REST API & Route Handlers');
    expect(names).toContain('Database Persistence & ORM Modeling');
    expect(names).toContain('JWT & Token-Based Authentication');
  });

  it('should sort concept dependencies topologically without cycle deadlocks', () => {
    const rawConcepts: ConceptDef[] = [
      {
        name: 'Concept C',
        description: 'Advanced Concept',
        category: 'ARCHITECTURE',
        difficulty: 'ADVANCED',
        prerequisites: ['Concept B'],
        confidence: 'CONFIRMED',
      },
      {
        name: 'Concept A',
        description: 'Foundational Concept',
        category: 'LANGUAGE',
        difficulty: 'BEGINNER',
        prerequisites: [],
        confidence: 'CONFIRMED',
      },
      {
        name: 'Concept B',
        description: 'Intermediate Concept',
        category: 'FRAMEWORK',
        difficulty: 'INTERMEDIATE',
        prerequisites: ['Concept A'],
        confidence: 'CONFIRMED',
      },
    ];

    const sorted = sortConceptsTopologically(rawConcepts);
    const sortedNames = sorted.map((c) => c.name);

    expect(sortedNames).toEqual(['Concept A', 'Concept B', 'Concept C']);
  });
});
