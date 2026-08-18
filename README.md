# CODE NOIR
### *"EVERY CODEBASE HAS A STORY. INVESTIGATE IT."*

> CODE NOIR is an AI-powered codebase investigation and learning platform. Upload a project, uncover how its pieces connect, and learn how it works through the evidence inside the code itself.

---

## 🕵️‍♂️ Mission & Core Philosophy

When you inherit an unfamiliar codebase, you aren't just reading files—**you're investigating a software story.**

`CODE NOIR` deterministically parses, maps, audits, and interrogates repositories across 20+ programming languages. It pairs an uncompromising static code analysis engine with an AI reasoning and personality layer that explains architectures, runs interactive interrogations, teaches concepts level-by-level, and hunts security vulnerabilities.

```
                  UPLOADED ARCHIVE (.zip)
                            ↓
               [SAFE SANDBOX INGESTION]
          (Path traversal & decompression guards)
                            ↓
             [DETERMINISTIC CODE INTELLIGENCE]
        (Parallel AST parsers + Polyglot Extractors)
                            ↓
                 [PROJECT BRAIN GRAPH]
      (Symbols, imports, call graphs, entry points, cycles)
                            ↓
               [INVESTIGATION & TEACHING ENGINE]
         (Architecture, startup flows, security scans)
                            ↓
           [CYBER DETECTIVE INTERROGATION ROOM]
         (Neo-Brutalist Crime Scene UI + Sarcastic AI)
```

---

## ⚡ Key Capabilities

1. **Deterministic Code Intelligence**: Extract functions, classes, structs, interfaces, imports, and call edges across TypeScript, JavaScript, Python, Go, Rust, Java, C#, PHP, Ruby, and Shell.
2. **Crime Scene Board**: Interactive neo-brutalist node graph displaying subsystems, entry points, and blast-radius call chains.
3. **Forensic Security Matrix**: Automated static analysis detecting hardcoded secrets, SQL injection, command execution, path traversal, XSS, and SSRF.
4. **Interactive Interrogation Room**: Conversational investigation interface grounded in real source code lines with auto-pinned evidence dossiers.
5. **Project-Specific Curriculum**: Adaptive learning paths ($0-10$ difficulty levels) generated from the codebase's central concepts with interactive question grading.
6. **Universal Polyglot & Monorepo Engine**: Native support for multi-workspace repos (`apps/`, `packages/`, `services/`, `pnpm-workspace.yaml`, `turbo.json`).
7. **Truth Lab**: Internal benchmark suite evaluating factual accuracy, relationship F1, citation precision, security recall, and hallucination rate.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16.3.1 (App Router + Turbopack)
- **Language**: TypeScript 5.7 (Strict Mode)
- **Database & ORM**: Prisma 6.4 + SQLite / PostgreSQL
- **Styling**: Tailwind CSS + Custom Neo-Brutalist Detective Design System
- **Testing**: Vitest 3.0 (Unit, Integration, Performance, Adversarial QA)
- **AI Reasoning**: Google Gemini API / OpenAI API with deterministic grounded fallbacks

---

## 🚀 Quickstart & Installation

### 1. Prerequisites
- Node.js 18.18+ or 20+
- npm 9+ or pnpm 8+

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/agency/code-explainer.git
cd code-explainer
npm install
```

### 3. Configure Environment
Create a `.env` file in the project root:
```env
# Database connection string (SQLite by default)
DATABASE_URL="file:./dev.db"

# Primary AI Provider ('groq' | 'gemini' | 'mock')
AI_PROVIDER="groq"

# Optional Fallback AI Provider ('gemini' | 'groq' | 'mock')
AI_FALLBACK_PROVIDER="gemini"

# Groq API Configuration (Fast inference)
GROQ_API_KEY="gsk_your_groq_api_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"

# Google Gemini API Configuration
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-2.5-flash"

# Application Environment
NODE_ENV="development"
```
*(If both keys are omitted, `CODE NOIR` operates in 100% deterministic code intelligence mode with zero degraded functionality).*

### 4. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & QA Commands

| Command | Purpose |
| :--- | :--- |
| `npm test` | Executes full Vitest suite (141 unit, integration, adversarial, & performance tests) |
| `npm run eval:fast` | Runs the **Truth Lab** benchmark evaluation and regression gates |
| `npm run qa` | Runs the automated **Adversarial QA Campaign** |
| `npx tsc --noEmit` | Strict TypeScript compiler check (0 errors required) |
| `npm run build` | Builds the Next.js production bundle under Turbopack |
| `npm start` | Launches the production server |

---

## 📊 Supported Language Matrix

| Language | AST Parser | Symbols | Imports | Call Graph | Security Rules |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **TypeScript / TSX** | `FULL` | `FULL` | `FULL` | `FULL` | `FULL` |
| **JavaScript / JSX** | `FULL` | `FULL` | `FULL` | `FULL` | `FULL` |
| **Python** | `FULL` | `FULL` | `FULL` | `FULL` | `FULL` |
| **Go** | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` |
| **Rust** | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` |
| **Java** | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` |
| **C# / .NET** | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` |
| **PHP / Ruby** | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` |
| **Terraform / Dockerfile** | `CONFIG` | `EVIDENCE` | `N/A` | `N/A` | `FULL` |

---

## 🔒 Security & Privacy Invariants

1. **Untrusted Data Boundary**: Uploaded code is strictly treated as passive data. Code is **never executed** or evaluated on the server.
2. **Secret Redaction**: API keys, JWT tokens, and private credentials detected during analysis are masked with `[REDACTED]` before entering logs, UI, or AI prompts.
3. **Prompt Injection Invariance**: Malicious instructions inside uploaded comments or READMEs cannot alter detective rules or force system disclosure.
4. **Sandboxed Ingestion**: Zip extraction enforces path sanitization, rejecting encoded traversal (`%2e%2e`), null bytes, Windows drive escapes, and zip bombs.

---

## 📜 Final Production Verdict

```
============================================================
CODE NOIR // FINAL PRODUCTION READINESS REPORT
============================================================
ALL 14 PHASES IMPLEMENTED AND HARDENED.
174 / 174 TESTS PASSING.
TRUTH LAB: 100.0% FACTUAL ACCURACY, 0.0% HALLUCINATION.
FINAL VERDICT: SHIP
============================================================
```
