import { ConceptDef } from './types';

export function extractProjectConcepts(projectData: {
  primaryLang: string;
  files: { path: string }[];
  symbols: { name: string; kind: string }[];
  techProfile: { frameworks?: { name: string }[]; runtimes?: { name: string }[]; databases?: { name: string }[] };
  endpoints: { path: string; method: string }[];
  envVars: { name: string }[];
  dbEvidence: { type: string }[];
}): ConceptDef[] {
  const concepts: ConceptDef[] = [];
  const lang = (projectData.primaryLang || 'TypeScript').toUpperCase();

  // 1. Language Fundamentals
  if (lang.includes('TYPESCRIPT') || lang.includes('JAVASCRIPT')) {
    concepts.push({
      name: 'TypeScript & JavaScript Async/Await',
      description: 'Handling non-blocking asynchronous I/O and Promise resolution.',
      category: 'LANGUAGE',
      difficulty: 'BEGINNER',
      prerequisites: ['Basic Variables & Functions'],
      confidence: 'CONFIRMED',
    });

    if (projectData.symbols.some((s) => s.kind === 'INTERFACE' || s.kind === 'TYPE')) {
      concepts.push({
        name: 'Type Contracts & Interfaces',
        description: 'Defining strict data shape guarantees and compile-time contracts.',
        category: 'LANGUAGE',
        difficulty: 'BEGINNER',
        prerequisites: ['TypeScript & JavaScript Async/Await'],
        confidence: 'CONFIRMED',
      });
    }
  } else if (lang.includes('PYTHON')) {
    concepts.push({
      name: 'Python Decorators & Functions',
      description: 'Metaprogramming and wrapping route handlers using @decorator syntax.',
      category: 'LANGUAGE',
      difficulty: 'BEGINNER',
      prerequisites: ['Python Functions & Classes'],
      confidence: 'CONFIRMED',
    });
  }

  // 2. Framework & API Concepts
  if (projectData.endpoints.length > 0) {
    concepts.push({
      name: 'REST API & Route Handlers',
      description: 'Mapping HTTP methods (GET, POST) and URIs to business logic controllers.',
      category: 'FRAMEWORK',
      difficulty: 'BEGINNER',
      prerequisites: ['HTTP Request/Response Basics'],
      confidence: 'CONFIRMED',
    });
  }

  // 3. Database & ORM Concepts
  if (projectData.dbEvidence.length > 0 || (projectData.techProfile.databases && projectData.techProfile.databases.length > 0)) {
    concepts.push({
      name: 'Database Persistence & ORM Modeling',
      description: 'Mapping database tables/collections to typed data entities and executing queries.',
      category: 'DATA_FLOW',
      difficulty: 'INTERMEDIATE',
      prerequisites: ['REST API & Route Handlers'],
      confidence: 'CONFIRMED',
    });
  }

  // 4. Security & Authentication Concepts
  const hasAuth =
    projectData.files.some((f) => /auth|jwt|token|login/i.test(f.path)) ||
    projectData.symbols.some((s) => /auth|token|verify|jwt/i.test(s.name));

  if (hasAuth) {
    concepts.push({
      name: 'JWT & Token-Based Authentication',
      description: 'Stateless cryptographic verification of client identities and session claims.',
      category: 'SECURITY',
      difficulty: 'INTERMEDIATE',
      prerequisites: ['REST API & Route Handlers'],
      confidence: 'CONFIRMED',
    });
  }

  // 5. Configuration Concepts
  if (projectData.envVars.length > 0) {
    concepts.push({
      name: 'Environment & Configuration Management',
      description: 'Safely loading runtime secret keys and dynamic connection strings.',
      category: 'ARCHITECTURE',
      difficulty: 'BEGINNER',
      prerequisites: ['Basic Variables & Functions'],
      confidence: 'CONFIRMED',
    });
  }

  // 6. Architecture & Directed Graph
  concepts.push({
    name: 'Modular Architecture & Dependency Graph',
    description: 'Decomposing software into isolated subsystems linked by explicit imports.',
    category: 'ARCHITECTURE',
    difficulty: 'INTERMEDIATE',
    prerequisites: ['Type Contracts & Interfaces', 'REST API & Route Handlers'],
    confidence: 'CONFIRMED',
  });

  return concepts;
}
