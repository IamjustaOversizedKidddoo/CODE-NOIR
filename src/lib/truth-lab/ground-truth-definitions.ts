import {
  GroundTruthFact,
  GroundTruthRelationship,
  GroundTruthFlow,
  GroundTruthSecurityFinding,
} from './types';

export const BENCHMARK_FACTS: GroundTruthFact[] = [
  {
    id: 'FACT-001',
    statement: 'src/index.ts is the main application entry point',
    expectedResult: true,
    expectedFile: 'src/index.ts',
    difficulty: 'EASY',
  },
  {
    id: 'FACT-002',
    statement: 'AuthService delegates password checking to verifyPassword',
    expectedResult: true,
    expectedFile: 'src/auth/service.ts',
    expectedSymbol: 'verifyPassword',
    difficulty: 'EASY',
  },
  {
    id: 'FACT-003',
    statement: 'verifyPassword directly executes a SQL query against the database',
    expectedResult: false,
    expectedFile: 'src/auth/password.ts',
    difficulty: 'MEDIUM',
  },
  {
    id: 'FACT-004',
    statement: 'src/utils/unused.ts is unreferenced by any other module in the codebase',
    expectedResult: true,
    expectedFile: 'src/utils/unused.ts',
    difficulty: 'HARD',
  },
];

export const BENCHMARK_RELATIONSHIPS: GroundTruthRelationship[] = [
  {
    source: 'src/index.ts',
    target: 'src/auth/service.ts',
    relationship: 'IMPORTS',
  },
  {
    source: 'src/index.ts',
    target: 'src/api/routes.ts',
    relationship: 'IMPORTS',
  },
  {
    source: 'src/auth/service.ts',
    target: 'src/auth/password.ts',
    relationship: 'IMPORTS',
  },
  {
    source: 'src/api/users.ts',
    target: 'src/db/client.ts',
    relationship: 'IMPORTS',
  },
  {
    source: 'src/cyclic/a.ts',
    target: 'src/cyclic/b.ts',
    relationship: 'IMPORTS',
  },
  {
    source: 'src/cyclic/b.ts',
    target: 'src/cyclic/a.ts',
    relationship: 'IMPORTS',
  },
];

export const BENCHMARK_FLOWS: GroundTruthFlow[] = [
  {
    id: 'FLOW-001',
    name: 'Safe User Fetch Flow',
    description: 'HTTP request routed to controller and executed via parameterized query',
    isVulnerable: false,
    expectedSteps: [
      { entity: 'setupRoutes', file: 'src/api/routes.ts', action: 'MOUNT_ROUTE' },
      { entity: 'getUsersHandler', file: 'src/api/users.ts', action: 'HANDLE_REQUEST' },
      { entity: 'safeGetUsers', file: 'src/db/client.ts', action: 'PARAMETERIZED_SQL' },
    ],
  },
  {
    id: 'FLOW-002',
    name: 'Unsafe Search Flow',
    description: 'User input concatenated directly into unescaped SQL query',
    isVulnerable: true,
    expectedSteps: [
      { entity: 'setupRoutes', file: 'src/api/routes.ts', action: 'MOUNT_ROUTE' },
      { entity: 'searchUsersHandler', file: 'src/api/users.ts', action: 'HANDLE_REQUEST' },
      { entity: 'unsafeSearchUsers', file: 'src/db/client.ts', action: 'CONCAT_SQL_SINK' },
    ],
  },
];

export const BENCHMARK_SECURITY_CASES: GroundTruthSecurityFinding[] = [
  // 1. MUST DETECT: Hardcoded JWT secret
  {
    id: 'SEC-GT-001',
    type: 'SECRET_LEAK',
    filePath: 'src/auth/service.ts',
    startLine: 4,
    severity: 'HIGH',
    isFalsePositiveExpected: false,
    reason: 'Hardcoded secret token in AuthService class definition.',
  },
  // 2. MUST DETECT: SQL Injection
  {
    id: 'SEC-GT-002',
    type: 'SQL_INJECTION',
    filePath: 'src/db/client.ts',
    startLine: 10,
    severity: 'HIGH',
    isFalsePositiveExpected: false,
    reason: 'Unparameterized string concatenation in unsafeSearchUsers query.',
  },
  // 3. MUST DETECT: Command Injection
  {
    id: 'SEC-GT-003',
    type: 'COMMAND_INJECTION',
    filePath: 'src/utils/exec.ts',
    startLine: 11,
    severity: 'HIGH',
    isFalsePositiveExpected: false,
    reason: 'Dynamic shell invocation via child_process.exec in unsafeExec.',
  },
  // 4. MUST NOT FLAG: Safe Parameterized SQL
  {
    id: 'SEC-GT-004',
    type: 'SQL_INJECTION',
    filePath: 'src/db/client.ts',
    startLine: 3,
    severity: 'HIGH',
    isFalsePositiveExpected: true, // Scanner should NOT flag this line
    reason: 'safeGetUsers uses static placeholder string.',
  },
];
