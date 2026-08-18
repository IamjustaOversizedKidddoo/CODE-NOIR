import { describe, it, expect } from 'vitest';
import { PythonParser } from '@/lib/intelligence/parsers/python-parser';

describe('PythonParser: AST & Symbol Extraction', () => {
  const parser = new PythonParser();

  it('should extract Python classes, functions, methods, and decorators', async () => {
    const code = `
import os
from fastapi import FastAPI

app = FastAPI()

class DatabaseManager:
  def __init__(self, url):
    self.url = url

  def connect(self):
    return True

@app.get("/api/status")
def get_status():
  db = DatabaseManager("sqlite:///./test.db")
  return {"connected": db.connect()}
`;

    const result = await parser.parse('file_py_1', 'app/main.py', code);

    expect(result.language).toBe('PYTHON');
    expect(result.symbols.length).toBeGreaterThanOrEqual(4);

    const cls = result.symbols.find((s) => s.name === 'DatabaseManager');
    expect(cls).toBeDefined();
    expect(cls?.kind).toBe('CLASS');

    const method = result.symbols.find((s) => s.name === 'connect');
    expect(method).toBeDefined();
    expect(method?.kind).toBe('METHOD');
    expect(method?.parentName).toBe('DatabaseManager');

    const func = result.symbols.find((s) => s.name === 'get_status');
    expect(func).toBeDefined();
    expect(func?.kind).toBe('FUNCTION');

    // Endpoints
    expect(result.endpoints.length).toBe(1);
    expect(result.endpoints[0].method).toBe('GET');
    expect(result.endpoints[0].path).toBe('/api/status');
  });

  it('should extract environment variable accesses (os.getenv, os.environ)', async () => {
    const code = `
import os

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PASS = os.environ["DB_PASSWORD"]
`;
    const result = await parser.parse('file_py_2', 'app/settings.py', code);

    expect(result.envVars.length).toBe(2);
    expect(result.envVars.map((e) => e.name)).toContain('DB_HOST');
    expect(result.envVars.map((e) => e.name)).toContain('DB_PASSWORD');
  });
});
