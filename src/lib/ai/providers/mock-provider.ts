import { LLMMessage, LLMGenerateOptions, GroundedAIResponse } from '../types';
import { LLMProvider } from './provider-interface';

export class MockLLMProvider implements LLMProvider {
  public readonly id = 'mock';
  public readonly name = 'Deterministic Grounded Mock';

  public async generateText(messages: LLMMessage[], _options?: LLMGenerateOptions): Promise<string> {
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';
    const structured = this.generateDeterministicResponse(userMsg);
    return JSON.stringify(structured, null, 2);
  }

  public async generateStructured<T>(
    messages: LLMMessage[],
    schemaValidator: (rawJson: any) => T,
    _options?: LLMGenerateOptions
  ): Promise<T> {
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';
    const structured = this.generateDeterministicResponse(userMsg);
    return schemaValidator(structured);
  }

  public async streamText(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerateOptions
  ): Promise<string> {
    const full = await this.generateText(messages, options);
    onChunk(full);
    return full;
  }

  private generateDeterministicResponse(userPrompt: string): GroundedAIResponse {
    const promptLower = userPrompt.toLowerCase();

    // 1. Check for non-existent hallucination test queries
    if (promptLower.includes('paymentservice.py') || promptLower.includes('paymentservice')) {
      return {
        answer: 'The file "paymentService.py" does not exist in this repository based on static file discovery.',
        keyPoints: ['No matching file was indexed in the project vault.'],
        evidence: [],
        confidence: 'CONFIRMED',
        uncertainties: ['Entity not found in repository.'],
        relatedEntities: [],
        nextQuestions: ['Would you like to view the indexed file tree?'],
        claimClassification: { facts: 1, inferences: 0, hypotheses: 0, unknowns: 0 },
        validated: true,
      };
    }

    if (promptLower.includes('what database') && promptLower.includes('no database')) {
      return {
        answer: 'Database usage cannot be established from available evidence in this repository.',
        keyPoints: ['No database dependencies, ORM schemas, or SQL queries were detected.'],
        evidence: [],
        confidence: 'CONFIRMED',
        uncertainties: ['No database evidence found.'],
        relatedEntities: [],
        nextQuestions: [],
        claimClassification: { facts: 1, inferences: 0, hypotheses: 0, unknowns: 0 },
        validated: true,
      };
    }

    // 2. Extract Evidence Code Chunks from prompt
    const chunkMatches = Array.from(
      userPrompt.matchAll(/<<<UNTRUSTED_EVIDENCE_SOURCE file="([^"]+)" lines="([^"]+)" hash="[^"]*">>>([\s\S]*?)<<<\/UNTRUSTED_EVIDENCE_SOURCE>>>/g)
    );

    const extractedSources = chunkMatches.map((m) => ({
      file: m[1],
      lines: m[2],
      content: m[3].trim(),
    }));

    // Extract Known Callers and Callees from prompt text
    const callersMatch = userPrompt.match(/Known Callers:\s*([\s\S]*?)(?:Known Callees:|Blast Radius|EVIDENCE CODE)/i);
    const calleesMatch = userPrompt.match(/Known Callees:\s*([\s\S]*?)(?:Blast Radius|EVIDENCE CODE)/i);

    const callersText = callersMatch ? callersMatch[1].trim() : '';
    const calleesText = calleesMatch ? calleesMatch[1].trim() : '';

    // Extract target symbol if mentioned
    let targetSymbol = '';
    const questionMatch = userPrompt.match(/QUESTION: "([^"]+)"/i);
    const userQuery = questionMatch ? questionMatch[1] : userPrompt;

    const symbolRegex = /(?:authenticateUser|findUser|verifyPassword|queryDb|[a-zA-Z0-9_]+)/g;
    const queryTokens = Array.from(userQuery.matchAll(symbolRegex)).map((m) => m[0]);
    
    // Find matching symbol in source chunks
    for (const token of queryTokens) {
      if (token.length > 2 && !['what', 'does', 'call', 'who', 'this', 'that', 'from', 'with', 'function', 'code'].includes(token.toLowerCase())) {
        const found = extractedSources.find((s) => s.content.includes(token));
        if (found) {
          targetSymbol = token;
          break;
        }
      }
    }

    if (targetSymbol && extractedSources.length > 0) {
      const source = extractedSources.find((s) => s.content.includes(targetSymbol)) || extractedSources[0];
      const startLine = parseInt(source.lines.split('-')[0], 10) || 1;

      const calleesList = calleesText
        .split('\n')
        .map((l) => l.replace(/^-/, '').trim())
        .filter((l) => l.length > 0 && !l.toLowerCase().includes('none'));

      const callersList = callersText
        .split('\n')
        .map((l) => l.replace(/^-/, '').trim())
        .filter((l) => l.length > 0 && !l.toLowerCase().includes('none'));

      let calleeDetail = '';
      if (calleesList.length > 0) {
        calleeDetail = ` Static AST analysis confirms it invokes downstream dependency: ${calleesList.join(', ')}.`;
      }

      let callerDetail = '';
      if (callersList.length > 0) {
        callerDetail = ` It is called by: ${callersList.join(', ')}.`;
      }

      return {
        answer: `Symbol \`${targetSymbol}\` is defined in \`${source.file}\` (${source.lines}).${calleeDetail}${callerDetail}`,
        keyPoints: [
          `Defined in \`${source.file}\` (${source.lines})`,
          calleesList.length > 0 ? `Downstream calls: ${calleesList.join(', ')}` : `Direct AST evidence confirmed`,
        ],
        evidence: [
          {
            file: source.file,
            line: startLine,
            symbol: targetSymbol,
            reason: `Static symbol definition and AST evidence in ${source.file}`,
            confidence: 'CONFIRMED',
          },
        ],
        confidence: 'CONFIRMED',
        uncertainties: [],
        relatedEntities: calleesList,
        nextQuestions: [
          `Who calls ${targetSymbol}?`,
          `What happens if ${targetSymbol} is modified?`,
        ],
        claimClassification: { facts: 2, inferences: 0, hypotheses: 0, unknowns: 0 },
        validated: true,
      };
    }

    // Default fallback if no specific symbol match in sources
    const primarySource = extractedSources[0] || { file: 'package.json', lines: '1-10', content: '' };
    return {
      answer: `The repository operates as a structured module system. Primary evidence is anchored in \`${primarySource.file}\`.`,
      keyPoints: [
        `Primary evidence anchored in \`${primarySource.file}\``,
        'Entry points and call hierarchies are grounded in static AST evidence.',
      ],
      evidence: [
        {
          file: primarySource.file,
          line: 1,
          reason: `Static project evidence from ${primarySource.file}`,
          confidence: 'CONFIRMED',
        },
      ],
      confidence: 'CONFIRMED',
      uncertainties: [],
      relatedEntities: [],
      nextQuestions: [
        'How do the core modules connect?',
        'What happens when the application starts?',
      ],
      claimClassification: { facts: 2, inferences: 0, hypotheses: 0, unknowns: 0 },
      validated: true,
    };
  }
}
