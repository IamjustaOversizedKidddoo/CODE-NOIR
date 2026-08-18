import ts from 'typescript';
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

export class TypeScriptParser implements LanguageParser {
  public readonly language: SupportedLanguage = 'TYPESCRIPT';

  public canParse(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext);
  }

  public async parse(
    fileId: string,
    filePath: string,
    content: string
  ): Promise<FileAnalysisResult> {
    const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const scriptKind = isJsx
      ? isTs
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.JSX
      : isTs
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const symbols: ExtractedSymbol[] = [];
    const imports: ExtractedImport[] = [];
    const exports: ExtractedExport[] = [];
    const calls: ExtractedCall[] = [];
    const endpoints: ExtractedEndpoint[] = [];
    const envVars: ExtractedEnvVar[] = [];
    const dbEvidence: ExtractedDbEvidence[] = [];

    // Helper for source position
    const getPos = (node: ts.Node) => {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      return {
        startLine: start.line + 1,
        startCol: start.character + 1,
        endLine: end.line + 1,
        endCol: end.character + 1,
      };
    };

    // Calculate cyclomatic complexity
    const calculateComplexity = (node: ts.Node): number => {
      let score = 1;
      const walk = (n: ts.Node) => {
        if (
          ts.isIfStatement(n) ||
          ts.isConditionalExpression(n) ||
          ts.isForStatement(n) ||
          ts.isForInStatement(n) ||
          ts.isForOfStatement(n) ||
          ts.isWhileStatement(n) ||
          ts.isDoStatement(n) ||
          ts.isCaseClause(n) ||
          ts.isCatchClause(n)
        ) {
          score++;
        } else if (ts.isBinaryExpression(n)) {
          if (
            n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          ) {
            score++;
          }
        }
        ts.forEachChild(n, walk);
      };
      ts.forEachChild(node, walk);
      return score;
    };

    // Check if node has 'export' modifier
    const hasExportModifier = (node: ts.Node): boolean => {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    };

    const hasDefaultModifier = (node: ts.Node): boolean => {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    };

    // Keep track of current enclosing symbol for call attribution
    const symbolStack: string[] = [];

    const visit = (node: ts.Node) => {
      // 1. Imports Analysis
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const rawSource = moduleSpecifier.text;
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const importClause = node.importClause;

          if (!importClause) {
            // Side-effect import: import './styles.css'
            imports.push({
              rawSource,
              importedSymbols: ['*'],
              importType: 'SIDE_EFFECT',
              line,
              confidence: 'CONFIRMED',
            });
          } else {
            const importedSymbols: string[] = [];
            let importType: ExtractedImport['importType'] = 'NAMED';

            if (importClause.name) {
              importedSymbols.push('default');
              importType = 'DEFAULT';
            }

            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                importedSymbols.push('*');
                importType = 'NAMESPACE';
              } else if (ts.isNamedImports(importClause.namedBindings)) {
                importClause.namedBindings.elements.forEach((el) => {
                  importedSymbols.push(el.name.text);
                });
              }
            }

            imports.push({
              rawSource,
              importedSymbols,
              importType,
              line,
              confidence: 'CONFIRMED',
            });
          }
        }
      }

      // 2. CommonJS require() & dynamic import()
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        // require("...")
        if (ts.isIdentifier(expression) && expression.text === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({
              rawSource: arg.text,
              importedSymbols: ['default'],
              importType: 'REQUIRE',
              line,
              confidence: 'CONFIRMED',
            });
          }
        }

        // import("...")
        if (expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({
              rawSource: arg.text,
              importedSymbols: ['*'],
              importType: 'DYNAMIC',
              line,
              confidence: 'LIKELY',
            });
          }
        }

        // Function Calls Extraction
        let calleeName = '';
        if (ts.isIdentifier(expression)) {
          calleeName = expression.text;
        } else if (ts.isPropertyAccessExpression(expression)) {
          calleeName = expression.getText(sourceFile);
        }

        if (calleeName && calleeName !== 'require' && calleeName !== 'import') {
          const pos = getPos(node);
          const currentCaller = symbolStack[symbolStack.length - 1];

          // Check if this is an Express endpoint call (e.g. app.get('/path', handler))
          if (
            ts.isPropertyAccessExpression(expression) &&
            ['get', 'post', 'put', 'delete', 'patch', 'use'].includes(
              expression.name.text.toLowerCase()
            ) &&
            node.arguments.length >= 2 &&
            ts.isStringLiteral(node.arguments[0])
          ) {
            const routePath = (node.arguments[0] as ts.StringLiteral).text;
            endpoints.push({
              method: expression.name.text.toUpperCase(),
              path: routePath,
              line: pos.startLine,
              framework: 'Express',
              confidence: 'LIKELY',
              evidence: `Express ${expression.name.text.toUpperCase()} route: "${routePath}"`,
            });
          }

          // Check Database Access Evidence (Prisma / Mongoose / SQL)
          if (
            calleeName.startsWith('prisma.') ||
            calleeName.includes('$queryRaw') ||
            calleeName.startsWith('db.') ||
            calleeName.includes('findUnique') ||
            calleeName.includes('findMany') ||
            calleeName.includes('create')
          ) {
            dbEvidence.push({
              system: calleeName.startsWith('prisma') ? 'Prisma' : 'ORM / Query Engine',
              operation: calleeName,
              line: pos.startLine,
              evidence: `Database query invocation: ${calleeName}()`,
              confidence: 'LIKELY',
            });
          }

          calls.push({
            calleeName,
            callerSymbolName: currentCaller,
            line: pos.startLine,
            col: pos.startCol,
            relationship: 'CALLS',
            confidence: 'CONFIRMED',
            evidence: `Call to ${calleeName}() at line ${pos.startLine}`,
          });
        }
      }

      // 3. Environment Variables (process.env.VAR)
      if (ts.isPropertyAccessExpression(node)) {
        const objText = node.expression.getText(sourceFile);
        if (objText === 'process.env') {
          const varName = node.name.text;
          const pos = getPos(node);
          envVars.push({
            name: varName,
            line: pos.startLine,
            evidence: `process.env.${varName}`,
          });
        }
      } else if (ts.isElementAccessExpression(node)) {
        const objText = node.expression.getText(sourceFile);
        if (objText === 'process.env' && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
          const varName = node.argumentExpression.text;
          const pos = getPos(node);
          envVars.push({
            name: varName,
            line: pos.startLine,
            evidence: `process.env["${varName}"]`,
          });
        }
      }

      // 4. Exports Extraction
      if (ts.isExportDeclaration(node)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const sourceModule = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : undefined;

        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach((el) => {
            exports.push({
              name: el.name.text,
              isDefault: el.name.text === 'default',
              isReExport: !!sourceModule,
              sourceModule,
              line,
            });
          });
        }
      }

      // 5. Function Declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const pos = getPos(node);
        const isExported = hasExportModifier(node);
        const isDefault = hasDefaultModifier(node);

        // Next.js Route Handler detection: export async function GET / POST in app/api/ route
        if (
          isExported &&
          ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name.toUpperCase()) &&
          (filePath.includes('/api/') || filePath.includes('route.ts') || filePath.includes('route.js'))
        ) {
          endpoints.push({
            method: name.toUpperCase(),
            path: filePath.replace(/^.*\/app/, '').replace(/\/route\.(ts|js)$/, '') || '/',
            line: pos.startLine,
            handlerSymbol: name,
            framework: 'Next.js App Router',
            confidence: 'CONFIRMED',
            evidence: `Next.js Route Handler export function ${name}()`,
          });
        }

        const parentSymbol = symbolStack[symbolStack.length - 1];
        symbols.push({
          name,
          qualifiedName: parentSymbol ? `${parentSymbol}.${name}` : name,
          kind: 'FUNCTION',
          location: pos,
          complexity: calculateComplexity(node),
          isExported,
          confidence: 'CONFIRMED',
          parentName: parentSymbol,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault,
            isReExport: false,
            line: pos.startLine,
          });
        }

        symbolStack.push(name);
        ts.forEachChild(node, visit);
        symbolStack.pop();
        return;
      }

      // 6. Variable Statement (const myFunc = () => {}, export const x = ...)
      if (ts.isVariableStatement(node)) {
        const isExported = hasExportModifier(node);
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            const pos = getPos(decl);
            const isArrowOrFunc =
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));

            const kind: ExtractedSymbol['kind'] = isArrowOrFunc
              ? 'FUNCTION'
              : node.declarationList.flags & ts.NodeFlags.Const
              ? 'CONSTANT'
              : 'VARIABLE';

            const parentSymbol = symbolStack[symbolStack.length - 1];
            symbols.push({
              name,
              qualifiedName: parentSymbol ? `${parentSymbol}.${name}` : name,
              kind,
              location: pos,
              complexity: decl.initializer ? calculateComplexity(decl.initializer) : 1,
              isExported,
              confidence: 'CONFIRMED',
              parentName: parentSymbol,
            });

            if (isExported) {
              exports.push({
                name,
                isDefault: false,
                isReExport: false,
                line: pos.startLine,
              });
            }

            if (isArrowOrFunc) {
              symbolStack.push(name);
              ts.forEachChild(decl.initializer!, visit);
              symbolStack.pop();
            }
          }
        });
      }

      // 7. Class Declarations
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const pos = getPos(node);
        const isExported = hasExportModifier(node);

        symbols.push({
          name,
          qualifiedName: name,
          kind: 'CLASS',
          location: pos,
          complexity: 1,
          isExported,
          confidence: 'CONFIRMED',
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: hasDefaultModifier(node),
            isReExport: false,
            line: pos.startLine,
          });
        }

        symbolStack.push(name);

        // Class Members
        node.members.forEach((member) => {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            const mPos = getPos(member);
            symbols.push({
              name: methodName,
              qualifiedName: `${name}.${methodName}`,
              kind: 'METHOD',
              location: mPos,
              complexity: calculateComplexity(member),
              isExported: false,
              confidence: 'CONFIRMED',
              parentName: name,
            });
            symbolStack.push(methodName);
            ts.forEachChild(member, visit);
            symbolStack.pop();
          } else if (ts.isConstructorDeclaration(member)) {
            const cPos = getPos(member);
            symbols.push({
              name: 'constructor',
              qualifiedName: `${name}.constructor`,
              kind: 'CONSTRUCTOR',
              location: cPos,
              complexity: calculateComplexity(member),
              isExported: false,
              confidence: 'CONFIRMED',
              parentName: name,
            });
            symbolStack.push('constructor');
            ts.forEachChild(member, visit);
            symbolStack.pop();
          } else if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            symbols.push({
              name: member.name.text,
              qualifiedName: `${name}.${member.name.text}`,
              kind: 'PROPERTY',
              location: getPos(member),
              complexity: 1,
              isExported: false,
              confidence: 'CONFIRMED',
              parentName: name,
            });
          }
        });

        symbolStack.pop();
        return;
      }

      // 8. Interface Declarations
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const pos = getPos(node);
        const isExported = hasExportModifier(node);

        symbols.push({
          name,
          qualifiedName: name,
          kind: 'INTERFACE',
          location: pos,
          complexity: 1,
          isExported,
          confidence: 'CONFIRMED',
        });
      }

      // 9. Type Alias Declarations
      if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const pos = getPos(node);
        const isExported = hasExportModifier(node);

        symbols.push({
          name,
          qualifiedName: name,
          kind: 'TYPE',
          location: pos,
          complexity: 1,
          isExported,
          confidence: 'CONFIRMED',
        });
      }

      // 10. Enum Declarations
      if (ts.isEnumDeclaration(node)) {
        const name = node.name.text;
        const pos = getPos(node);
        const isExported = hasExportModifier(node);

        symbols.push({
          name,
          qualifiedName: name,
          kind: 'ENUM',
          location: pos,
          complexity: 1,
          isExported,
          confidence: 'CONFIRMED',
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      fileId,
      path: filePath,
      language: isTs ? 'TYPESCRIPT' : 'JAVASCRIPT',
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
