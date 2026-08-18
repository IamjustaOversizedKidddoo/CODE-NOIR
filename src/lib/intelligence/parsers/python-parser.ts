import path from 'path';
import {
  FileAnalysisResult,
  ExtractedSymbol,
  ExtractedImport,
  ExtractedExport,
  ExtractedCall,
  ExtractedEndpoint,
  ExtractedEnvVar,
  ExtractedDbEvidence,
  SupportedLanguage,
} from '../../types/intelligence';
import { LanguageParser } from './parser-interface';

export class PythonParser implements LanguageParser {
  public readonly language: SupportedLanguage = 'PYTHON';

  public canParse(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.py' || ext === '.pyi';
  }

  public async parse(
    fileId: string,
    filePath: string,
    content: string
  ): Promise<FileAnalysisResult> {
    const lines = content.split(/\r?\n/);

    const symbols: ExtractedSymbol[] = [];
    const imports: ExtractedImport[] = [];
    const exports: ExtractedExport[] = [];
    const calls: ExtractedCall[] = [];
    const endpoints: ExtractedEndpoint[] = [];
    const envVars: ExtractedEnvVar[] = [];
    const dbEvidence: ExtractedDbEvidence[] = [];

    // Track active classes and functions for hierarchy & call attribution
    interface ScopeItem {
      name: string;
      indent: number;
      kind: 'CLASS' | 'FUNCTION';
    }
    const scopeStack: ScopeItem[] = [];

    // Regular expressions for Python constructs
    const importFromRegex = /^\s*from\s+([\w.]+)\s+import\s+(.+)$/;
    const importRegex = /^\s*import\s+(.+)$/;
    const defRegex = /^(\s*)(async\s+)?def\s+([a-zA-Z_]\w*)\s*\((.*?)\)(\s*->\s*[^:]+)?:/;
    const classRegex = /^(\s*)class\s+([a-zA-Z_]\w*)\s*(\((.*?)\))?:/;
    const decoratorRegex = /^\s*@([a-zA-Z_][\w.]*(\(.*?\))?)/;
    const callRegex = /\b([a-zA-Z_][\w.]*)\s*\(/g;
    const envVarRegex = /(?:os\.environ\.get|os\.getenv)\s*\(\s*["']([^"']+)["']|os\.environ\s*\[\s*["']([^"']+)["']\]/g;
    const allExportRegex = /^__all__\s*=\s*\[(.*?)\]/;

    let pendingDecorators: { name: string; line: number }[] = [];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineNum = lineIdx + 1;
      const rawLine = lines[lineIdx];
      const trimmed = rawLine.trim();

      // Skip empty lines and full comment lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Compute leading indent (number of spaces)
      const leadingSpaces = rawLine.search(/\S/);
      const indent = leadingSpaces === -1 ? 0 : leadingSpaces;

      // Pop scopes that are at or deeper than current indentation
      while (scopeStack.length > 0 && indent <= scopeStack[scopeStack.length - 1].indent) {
        scopeStack.pop();
      }

      const currentParent = scopeStack[scopeStack.length - 1];

      // 1. Environment Variable Extraction (os.getenv, os.environ)
      let envMatch: RegExpExecArray | null;
      while ((envMatch = envVarRegex.exec(rawLine)) !== null) {
        const varName = envMatch[1] || envMatch[2];
        if (varName) {
          envVars.push({
            name: varName,
            line: lineNum,
            evidence: `Python environment access: ${envMatch[0]}`,
          });
        }
      }

      // 2. Database Evidence (SQLAlchemy / Django / psycopg2)
      if (
        rawLine.includes('db.session') ||
        rawLine.includes('models.Model') ||
        rawLine.includes('objects.filter') ||
        rawLine.includes('sqlite3.connect') ||
        rawLine.includes('psycopg2.connect') ||
        rawLine.includes('engine.connect')
      ) {
        dbEvidence.push({
          system: rawLine.includes('models.Model') ? 'Django ORM' : 'SQLAlchemy / DB Engine',
          operation: 'Database Query/Model',
          line: lineNum,
          evidence: `Python DB pattern: ${trimmed}`,
          confidence: 'LIKELY',
        });
      }

      // 3. Decorator Tracking (@app.get, @router.post, @property, etc.)
      const decMatch = rawLine.match(decoratorRegex);
      if (decMatch) {
        const fullDec = decMatch[1];
        pendingDecorators.push({ name: fullDec, line: lineNum });

        // FastAPI / Flask Endpoint check (e.g. @app.get("/users"), @router.post("/login"))
        const endpointMatch = fullDec.match(/^(?:app|router|api)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/i);
        if (endpointMatch) {
          endpoints.push({
            method: endpointMatch[1].toUpperCase(),
            path: endpointMatch[2],
            line: lineNum,
            framework: fullDec.includes('router') || fullDec.includes('app') ? 'FastAPI / Flask' : 'Python Web',
            confidence: 'CONFIRMED',
            evidence: `@${fullDec}`,
          });
        }
        continue;
      }

      // 4. Imports Extraction
      const fromMatch = rawLine.match(importFromRegex);
      if (fromMatch) {
        const moduleSource = fromMatch[1];
        const symbolsList = fromMatch[2]
          .split(',')
          .map((s) => s.trim().split(/\s+as\s+/)[0])
          .filter(Boolean);

        imports.push({
          rawSource: moduleSource,
          importedSymbols: symbolsList,
          importType: 'NAMED',
          line: lineNum,
          confidence: 'CONFIRMED',
        });
        pendingDecorators = [];
        continue;
      }

      const impMatch = rawLine.match(importRegex);
      if (impMatch) {
        const moduleSource = impMatch[1].trim().split(/\s+as\s+/)[0];
        imports.push({
          rawSource: moduleSource,
          importedSymbols: ['*'],
          importType: 'DEFAULT',
          line: lineNum,
          confidence: 'CONFIRMED',
        });
        pendingDecorators = [];
        continue;
      }

      // 5. Class Declaration
      const classMatch = rawLine.match(classRegex);
      if (classMatch) {
        const className = classMatch[2];
        const parentClass = classMatch[4];

        // Find end line by indentation
        let endLine = lineNum;
        for (let j = lineIdx + 1; j < lines.length; j++) {
          const nextRaw = lines[j];
          const nextTrimmed = nextRaw.trim();
          if (!nextTrimmed || nextTrimmed.startsWith('#')) continue;
          const nextIndent = nextRaw.search(/\S/);
          if (nextIndent <= indent) break;
          endLine = j + 1;
        }

        symbols.push({
          name: className,
          qualifiedName: currentParent ? `${currentParent.name}.${className}` : className,
          kind: 'CLASS',
          location: {
            startLine: lineNum,
            endLine,
            startCol: indent + 1,
            endCol: rawLine.length + 1,
          },
          complexity: 1,
          isExported: !className.startsWith('_'),
          confidence: 'CONFIRMED',
          signature: parentClass ? `class ${className}(${parentClass})` : `class ${className}`,
        });

        if (!className.startsWith('_')) {
          exports.push({
            name: className,
            isDefault: false,
            isReExport: false,
            line: lineNum,
          });
        }

        scopeStack.push({ name: className, indent, kind: 'CLASS' });
        pendingDecorators = [];
        continue;
      }

      // 6. Function / Method Declaration
      const defMatch = rawLine.match(defRegex);
      if (defMatch) {
        const funcName = defMatch[3];
        const params = defMatch[4];
        const isAsync = !!defMatch[2];

        // Find end line by indentation
        let endLine = lineNum;
        let complexity = 1;
        for (let j = lineIdx + 1; j < lines.length; j++) {
          const nextRaw = lines[j];
          const nextTrimmed = nextRaw.trim();
          if (!nextTrimmed || nextTrimmed.startsWith('#')) continue;
          const nextIndent = nextRaw.search(/\S/);
          if (nextIndent <= indent) break;
          endLine = j + 1;
          if (
            nextTrimmed.startsWith('if ') ||
            nextTrimmed.startsWith('elif ') ||
            nextTrimmed.startsWith('for ') ||
            nextTrimmed.startsWith('while ') ||
            nextTrimmed.startsWith('except ')
          ) {
            complexity++;
          }
        }

        const isMethod = currentParent && currentParent.kind === 'CLASS';
        const qualifiedName = currentParent ? `${currentParent.name}.${funcName}` : funcName;

        symbols.push({
          name: funcName,
          qualifiedName,
          kind: isMethod ? 'METHOD' : 'FUNCTION',
          location: {
            startLine: lineNum,
            endLine,
            startCol: indent + 1,
            endCol: rawLine.length + 1,
          },
          complexity,
          isExported: !funcName.startsWith('_'),
          confidence: 'CONFIRMED',
          signature: `${isAsync ? 'async ' : ''}def ${funcName}(${params})`,
          parentName: currentParent?.name,
        });

        if (!isMethod && !funcName.startsWith('_')) {
          exports.push({
            name: funcName,
            isDefault: false,
            isReExport: false,
            line: lineNum,
          });
        }

        scopeStack.push({ name: funcName, indent, kind: 'FUNCTION' });
        pendingDecorators = [];
        continue;
      }

      // 7. __all__ Exports
      const allMatch = rawLine.match(allExportRegex);
      if (allMatch) {
        const exportedItems = allMatch[1]
          .split(',')
          .map((s) => s.replace(/["'\s]/g, ''))
          .filter(Boolean);

        for (const item of exportedItems) {
          exports.push({
            name: item,
            isDefault: false,
            isReExport: false,
            line: lineNum,
          });
        }
      }

      // 8. Function Calls Extraction
      let callMatch: RegExpExecArray | null;
      while ((callMatch = callRegex.exec(rawLine)) !== null) {
        const calleeName = callMatch[1];
        if (
          !['def', 'class', 'if', 'elif', 'while', 'for', 'return', 'raise', 'import', 'from', 'except'].includes(
            calleeName
          )
        ) {
          calls.push({
            calleeName,
            callerSymbolName: currentParent?.name,
            line: lineNum,
            col: callMatch.index + 1,
            relationship: 'CALLS',
            confidence: 'CONFIRMED',
            evidence: `Python call to ${calleeName}() at line ${lineNum}`,
          });
        }
      }

      pendingDecorators = [];
    }

    return {
      fileId,
      path: filePath,
      language: 'PYTHON',
      symbols,
      imports,
      exports,
      calls,
      endpoints,
      envVars,
      dbEvidence,
    };
  }
}
