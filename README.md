# CODE NOIR

### Every codebase has a story. Investigate it.

**CODE NOIR is an AI-powered codebase investigation and learning platform that transforms unfamiliar repositories into structured, interactive experiences.**

Instead of throwing hundreds of files and thousands of lines of code at a developer, CODE NOIR analyzes the repository, identifies important components and relationships, and guides the user through the system step by step.

> **Don't just read the code. Investigate it.**

---

## Overview

Understanding an unfamiliar codebase is rarely about reading more code.

The real challenge is understanding the relationships between the code:

- Where does the application start?
- Which files actually matter?
- What calls what?
- Where does the data go?
- Why does a particular module exist?
- Which components depend on it?
- What happens if something changes?
- How does the entire system fit together?

CODE NOIR is designed to answer these questions through a combination of deterministic code intelligence, repository-grounded AI, interactive investigation, and guided learning.

---

## How It Works

```text
                         REPOSITORY
                             │
                             ▼
                    ┌─────────────────┐
                    │    INGESTION    │
                    │ ZIP / FOLDER    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ CODE INTELLIGENCE│
                    │ AST / SYMBOLS   │
                    │ IMPORTS / CALLS │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ EVIDENCE LAYER  │
                    │ VERIFIED FACTS  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         CASE BRIEF        LEARN      DETECTIVE'S DESK
              │              │              │
              ▼              ▼              ▼
           STORY         LESSONS          AI CHAT
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                       INVESTIGATION
                             │
                             ▼
                        UNDERSTANDING
```

The central principle is simple:

> **Evidence first. Explanation second.**

The repository is analyzed before AI is asked to explain it.

---

# Core Experience

## 1. Case Brief

The Case Brief is the starting point for every investigation.

After a repository is uploaded, CODE NOIR builds a high-level overview containing information such as:

- Project size
- File count
- Symbol count
- Detected languages
- Entry points
- Important modules
- Major systems
- Architectural relationships
- Evidence-backed project summaries

The objective is to answer the first question every newcomer has:

> **"What am I looking at?"**

---

## 2. Guided Learning

CODE NOIR turns a repository into a structured learning experience.

Instead of asking a beginner to understand the entire project at once, the system progressively introduces the codebase:

```text
PROJECT
   ↓
ENTRY POINT
   ↓
IMPORTANT FILE
   ↓
FUNCTION
   ↓
CALLER / CALLEE
   ↓
DATA FLOW
   ↓
SYSTEM
   ↓
ARCHITECTURE
```

Learning experiences can include:

- Focused source-code excerpts
- Plain-English explanations
- Technical explanations
- Line-by-line explanations
- Concept breakdowns
- Prediction challenges
- Active recall
- Mastery tracking

The objective is not to expose more code.

The objective is to make more of the code understandable.

---

## 3. The Detective's Desk

The Detective's Desk is the conversational AI workspace.

Users can ask questions about the uploaded repository and continue the conversation naturally.

For example:

```text
"Where does this application start?"

"Why does this function call that one?"

"What does this file actually do?"

"Explain this like I'm completely new to programming."

"Where is the database accessed?"

"Why does this module exist?"

"What happens if I remove this?"

"I still don't understand. Can you explain it differently?"

"Show me the relevant code."

"Quiz me on what we just learned."
```

The experience is designed around conversation rather than isolated AI responses.

A user should be able to ask:

> Why?

Then:

> How?

Then:

> I still don't understand.

Then:

> Show me.

Then:

> Quiz me.

The objective is to help the user build a mental model of the repository.

---

## 4. Crime Scene

The Crime Scene is the visual architecture layer.

It represents the repository as an interactive relationship map.

Depending on the analyzed project, it can expose relationships such as:

```text
FILES
  │
  ├── IMPORT
  │
  ├── CALL
  │
  ├── REFERENCE
  │
  └── DEPENDENCY
```

It can help identify:

- Entry points
- Central modules
- Important dependencies
- Callers
- Callees
- Circular dependencies
- Architectural relationships

### Beginner View

The default experience reduces unnecessary graph noise.

The purpose is not to display every relationship at once.

The purpose is to make the architecture understandable.

---

## 5. Investigation Room

The Investigation Room translates complex architectural questions into guided investigations.

Examples include:

| User Question | Investigation |
|---|---|
| How does the project start? | Application Startup |
| What are the major systems? | System Map |
| Who talks to whom? | Call Graph |
| Where does a request go? | API Routing |
| Where does the data go? | Database Pipeline |
| How does authentication work? | Security & Auth |
| What happens if I change this? | Blast Radius |
| How does everything connect? | Complete Story |

Each investigation is intended to connect technical relationships with understandable explanations.

---

## 6. Evidence Locker

The Evidence Locker contains the indexed repository.

Users can inspect:

- Source files
- Tests
- Configuration
- Manifests
- Documentation
- Symbols
- References
- Security findings
- Unconfirmed files

Files can be organized according to their discovered role:

```text
CORE
SUPPORTING
TESTS
CONFIG
SECURITY
API
DATA
UNCONFIRMED
```

Where supported by repository evidence, CODE NOIR can explain why a file is important using signals such as:

- Import relationships
- Caller relationships
- Reference counts
- Graph centrality
- Entry-point proximity
- Symbol relationships

---

## 7. Security Dossier

CODE NOIR includes static security analysis for suspicious source patterns.

Depending on the configured security rules, the system can identify patterns associated with:

- Hardcoded secrets
- API keys
- JWTs
- Private keys
- SQL injection risks
- Command injection risks
- Insecure defaults
- Suspicious source patterns

Security findings are intended for investigation and validation.

> Static analysis identifies potentially dangerous patterns. Findings should be manually validated before being treated as confirmed vulnerabilities.

---

# Evidence-First AI Architecture

One of the core architectural principles of CODE NOIR is the separation between repository facts and AI-generated explanations.

A conventional workflow might look like:

```text
REPOSITORY
     ↓
    AI
     ↓
EXPLANATION
```

CODE NOIR instead follows:

```text
REPOSITORY
     ↓
INGESTION
     ↓
PARSING
     ↓
STATIC ANALYSIS
     ↓
RELATIONSHIP EXTRACTION
     ↓
EVIDENCE
     ↓
RETRIEVAL
     ↓
AI
     ↓
EXPLANATION
```

This separation is important.

The AI should not be responsible for inventing the architecture.

The analysis layer establishes what can be supported from the repository.

The AI explains that evidence to the user.

---

# Grounding Model

CODE NOIR is designed around the following pipeline:

```text
STATIC FACT
     ↓
VERIFICATION
     ↓
CLAIM
     ↓
EVIDENCE
     ↓
EXPLANATION
```

Where applicable, the system can distinguish between:

```text
CONFIRMED
LIKELY
INFERRED
UNKNOWN
```

The fundamental principle is:

> **Unknown is better than fabricated certainty.**

If the repository does not contain enough evidence to establish something, the system should communicate that uncertainty rather than inventing an answer.

---

# AI Provider Architecture

CODE NOIR supports multiple AI providers behind a unified conversational experience.

```text
                    USER
                     │
                     ▼
             THE DETECTIVE
                     │
                     ▼
             EVIDENCE RETRIEVAL
                     │
                     ▼
                   GROQ
                     │
              failure / timeout
                     ▼
                  GEMINI
                     │
              unavailable
                     ▼
             FALLBACK ENGINE
```

The provider implementation remains behind the application layer.

The user interacts with **The Detective**, rather than needing to understand the underlying provider architecture.

---

# Repository Ingestion

CODE NOIR supports multiple repository input methods.

### ZIP Archives

```text
project.zip
```

### Folder Uploads

```text
project/
├── src/
├── tests/
├── package.json
├── README.md
└── ...
```

### Drag & Drop

Supported project archives and folders can be submitted through the upload interface.

Relative paths are preserved while passing through ingestion security validation.

---

# Security Architecture

Security is treated as a first-class subsystem.

## Path Traversal Protection

The ingestion layer validates paths and rejects malicious patterns including:

```text
../
..\
encoded traversal
null bytes
Windows drive paths
```

## Archive Protection

Archive extraction is bounded to reduce resource-exhaustion risks.

## Secret Protection

Sensitive values such as:

```text
API keys
JWTs
Private keys
Credentials
```

are protected or redacted across relevant layers.

## Prompt Injection Resistance

Repository files are treated as untrusted data.

For example, if a README contains:

```text
IGNORE ALL PREVIOUS INSTRUCTIONS
```

that text remains repository content rather than becoming an application instruction.

## No Arbitrary Code Execution

CODE NOIR intentionally does not execute uploaded repositories.

The platform is designed around static analysis rather than running untrusted project code.

---

# Performance & Scalability

Large repositories introduce a fundamental challenge:

> **How can a system analyze more without making the experience slower?**

CODE NOIR uses several optimization strategies.

### Bounded Parallel Parsing

Limits concurrent parsing work to prevent uncontrolled resource usage.

### Analysis Caching

Versioned content-based cache keys reduce unnecessary re-analysis.

Conceptually:

```text
SHA256(
    fileHash
    :
    component
    :
    version
)
```

### Batch Persistence

Large collections of records can be persisted in chunks rather than unnecessary sequential operations.

### Indexed Graph Queries

Forward and reverse adjacency indexes improve relationship lookup performance.

### Bounded Graph Traversal

Blast-radius analysis uses bounded traversal with visited-state tracking.

### API Pagination

Large datasets are paginated instead of unnecessarily transferred to the browser.

### Progressive Graph Rendering

Large architectural graphs can be expanded progressively to reduce browser workload.

---

# Truth & Evaluation

CODE NOIR includes an internal evaluation layer for testing repository understanding and AI grounding.

The evaluation framework tracks metrics such as:

- Factual Accuracy
- Citation Accuracy
- Relationship F1
- Security Precision
- Security Recall
- Hallucination Rate
- Persona Invariance
- Ambiguity Handling

Latest internal verification:

```text
FACTUAL ACCURACY       100.0%
CITATION ACCURACY       98.0%
RELATIONSHIP F1         92.3%
SECURITY PRECISION     100.0%
SECURITY RECALL        100.0%
HALLUCINATION RATE       0.0%
PERSONA INVARIANCE     100.0%
AMBIGUITY HANDLING     100.0%
```

> These are internal benchmark results from the project's evaluation suite and should not be interpreted as guarantees for arbitrary repositories.

---

# Scalability Model

CODE NOIR is designed to progressively handle increasing repository complexity.

```text
TINY
  ↓
SMALL
  ↓
MEDIUM
  ↓
LARGE
  ↓
VERY LARGE
  ↓
POLYGLOT
  ↓
MONOREPO
```

The objective is not simply to process more files.

It is to prevent repository size from overwhelming the user's understanding.

---

# User Journey

The intended experience follows a clear progression:

```text
┌─────────────────────┐
│    UPLOAD PROJECT   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│     CASE BRIEF      │
│   "What is this?"   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│       LEARN         │
│ "Show me the basics"│
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ THE DETECTIVE'S DESK│
│    "Ask anything"   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    INVESTIGATION    │
│ "How does it work?" │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│     CRIME SCENE     │
│ "Show me the system"│
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│      EVIDENCE       │
│  "Show me the code" │
└──────────┬──────────┘
           ↓
       UNDERSTANDING
```

The product is designed to feel like a guided journey rather than a collection of disconnected dashboards.

---

# Progressive Learning

CODE NOIR is designed to support users from beginner to advanced levels.

### Beginner

```text
WHAT IS THIS?
WHERE DO I START?
WHAT DOES THIS FILE DO?
```

### Intermediate

```text
HOW DOES THIS FUNCTION CONNECT?
WHERE DOES THE DATA GO?
WHY DOES THIS MODULE EXIST?
```

### Advanced

```text
WHAT IS THE BLAST RADIUS?
WHERE ARE THE CIRCULAR DEPENDENCIES?
WHICH MODULES ARE ARCHITECTURAL HUBS?
```

Technical depth increases as the user's understanding increases.

---

# Technical Architecture

```text
┌──────────────────────────────────────────────────────┐
│                    CODE NOIR UI                      │
│                                                      │
│ Case Brief │ Learn │ Detective │ Files │ Explore    │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                   │
│                                                      │
│ Learning │ Story │ Interrogation │ Investigation    │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                 EVIDENCE LAYER                       │
│                                                      │
│ Claims │ Retrieval │ Ranking │ Graph │ Citations    │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│               CODE INTELLIGENCE                      │
│                                                      │
│ AST │ Symbols │ Imports │ Calls │ Dependencies      │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                    INGESTION                         │
│                                                      │
│ ZIP / Folder → Validation → Extraction → Indexing  │
└──────────────────────────────────────────────────────┘
```

---

# Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| Frontend | React |
| Styling | Tailwind CSS |
| Database | SQLite / PostgreSQL |
| ORM | Prisma |
| Testing | Vitest |
| AI Providers | Groq + Google Gemini |
| Code Intelligence | AST / Static Analysis |
| Build | Next.js / Turbopack |

---

# Project Structure

```text
src/
│
├── app/
│   ├── api/
│   ├── cases/
│   │   └── [caseId]/
│   │       ├── board/
│   │       ├── evidence/
│   │       ├── investigate/
│   │       ├── interrogate/
│   │       ├── learn/
│   │       └── security/
│   │
│   └── ...
│
├── components/
│   ├── detective/
│   ├── landing/
│   └── ...
│
└── lib/
    ├── ingestion/
    ├── intelligence/
    ├── investigation/
    ├── learning/
    ├── security/
    ├── truth-lab/
    └── ...
```

---

# Getting Started

## Prerequisites

- Node.js
- npm
- Database configuration
- Groq API key
- Gemini API key

## Clone

```bash
git clone <YOUR_REPOSITORY_URL>
cd code-noir
```

## Install

```bash
npm install
```

## Configure Environment

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"

GROQ_API_KEY="your_groq_api_key"

GEMINI_API_KEY="your_gemini_api_key"
```

> Never commit real credentials.

## Generate Prisma Client

```bash
npx prisma generate
```

Initialize the database according to your configured environment.

## Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Development Commands

```bash
# Development server
npm run dev

# Test suite
npm test

# Fast evaluation
npm run eval:fast

# Full QA campaign
npm run qa

# TypeScript validation
npx tsc --noEmit

# Production build
npm run build
```

---

# Design Principles

## Evidence Before Explanation

The repository establishes the facts.

## Relationships Before Isolation

Files make more sense when you understand how they connect.

## Progressive Disclosure

Do not expose the entire architecture at once.

Reveal complexity when it becomes useful.

## Conversation Over One-Shot Answers

Understanding is iterative.

Users should be able to continue asking questions until the concept makes sense.

## Unknown Over Hallucination

If the evidence isn't there, say so.

## Learning Over Information Dumping

The goal isn't to show more code.

The goal is to help the user understand more code.

---

# Who Is CODE NOIR For?

### Students

Learn how real repositories are structured.

### Junior Developers

Understand unfamiliar codebases without drowning in complexity.

### Developers

Build a mental model of an existing system faster.

### Open-Source Contributors

Investigate a repository before making changes.

### Security Researchers

Explore architecture and security-sensitive areas.

### Educators

Use real-world repositories as interactive learning material.

### Experienced Engineers

Quickly investigate large or unfamiliar systems.

---

# What CODE NOIR Is Not

CODE NOIR is intentionally not:

- An autonomous coding agent
- An arbitrary shell execution environment
- A production code modification system
- A replacement for an IDE
- An automatic vulnerability certification system
- A guarantee that every AI response is correct

CODE NOIR is an **investigation and learning environment**.

---

# Security Disclaimer

Uploaded repositories may contain sensitive information.

Do not upload repositories containing:

- Production credentials
- Private keys
- Confidential customer information
- Proprietary source code
- Sensitive infrastructure information

unless you understand the security implications of your deployment.

CODE NOIR intentionally avoids arbitrary execution of uploaded source code.

Security findings generated by static analysis must be manually validated before being treated as confirmed vulnerabilities.

---

# Roadmap

## Investigation

- [ ] Deeper execution-flow reconstruction
- [ ] Improved framework detection
- [ ] Advanced dependency analysis
- [ ] Repository comparison
- [ ] Git history investigation
- [ ] Commit-level architecture changes

## Learning

- [ ] More adaptive learning paths
- [ ] More interactive challenges
- [ ] Spaced repetition
- [ ] Personalized curriculum
- [ ] Learning analytics

## AI

- [ ] Improved multi-turn repository reasoning
- [ ] Better contextual memory
- [ ] More evidence-aware explanations
- [ ] Additional model providers
- [ ] More advanced tutoring modes

## Security

- [ ] Expanded static security rules
- [ ] Dependency intelligence
- [ ] Security investigation workflows
- [ ] Improved finding correlation

## Collaboration

- [ ] Team investigations
- [ ] Shared cases
- [ ] Investigation reports
- [ ] Exportable architecture maps

---

# Limitations

CODE NOIR performs static analysis.

It cannot automatically establish runtime behavior that is not represented in the uploaded source or available project artifacts.

Examples may include:

- External infrastructure
- Unavailable databases
- Runtime-generated code
- Undocumented services
- Environment-specific behavior
- External APIs without local representations

When evidence is missing, the system should distinguish uncertainty rather than pretending otherwise.

---

# Contributing

Contributions are welcome.

Before submitting a pull request:

```bash
npm install
npm test
npx tsc --noEmit
npm run build
```

Please keep contributions:

- Focused
- Tested
- Documented
- Backwards compatible where possible

For significant architectural changes, describe:

1. What changed?
2. Why was it necessary?
3. What does it affect?
4. How was it tested?
5. What limitations remain?

---

# License

Add the project's chosen license here.

For example:

```text
MIT License
```

---

# The Idea Behind CODE NOIR

Software is rarely difficult simply because there are too many lines of code.

It's difficult because there are too many **relationships** between those lines.

A function calls another function.

That function imports another module.

That module communicates with a service.

That service writes to a database.

A configuration file changes the behavior.

A security boundary protects the system.

And somewhere in the middle sits the file you were originally trying to understand.

CODE NOIR is built around one idea:

> **Don't make people understand the entire codebase at once.**
>
> **Give them the next piece of evidence.**

---

<div align="center">

# ◼ CODE NOIR

### Every codebase has a story.

**Investigate it. Learn it. Understand it.**

<br/>

`UPLOAD` · `INVESTIGATE` · `QUESTION` · `LEARN` · `UNDERSTAND`

</div>
