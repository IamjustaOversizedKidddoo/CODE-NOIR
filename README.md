# CODE NOIR

### Every codebase has a story. Investigate it.

**CODE NOIR** is an AI-powered codebase investigation and learning platform that transforms unfamiliar repositories into interactive, understandable systems.

Instead of opening a repository and facing hundreds of files with no idea where to begin, CODE NOIR analyzes the project, reconstructs its architecture, identifies important files and relationships, and guides the user through the code using evidence from the repository itself.

> **Don't just read the code. Investigate it.**

---

## Overview

Understanding an unfamiliar codebase is one of the hardest problems for developers.

A repository may contain:

- hundreds or thousands of files
- multiple programming languages
- deeply nested dependencies
- undocumented execution flows
- configuration layers
- database interactions
- security-sensitive code
- tests and supporting infrastructure
- legacy or unreferenced files

Most code-reading tools simply expose the files.

CODE NOIR tries to answer the more important questions:

> **Where do I start?**

> **What actually matters?**

> **How does this project work?**

> **What talks to what?**

> **Where does the data go?**

> **Why does this file exist?**

> **What happens if I change this?**

> **Can I ask someone about the code while I'm learning it?**

CODE NOIR turns those questions into an interactive investigation.

---

# Core Concept

CODE NOIR treats a repository as an investigation.

```text
                    YOUR PROJECT
                         │
                         ▼
                ┌─────────────────┐
                │ PROJECT INGESTION│
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ CODE INTELLIGENCE│
                │   AST ANALYSIS   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ EVIDENCE VAULT  │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     CASE BRIEF        LEARN      DETECTIVE'S DESK
          │              │              │
          ▼              ▼              ▼
       STORY       GUIDED LESSONS    AI CHAT
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    INVESTIGATE
                         │
                         ▼
                    UNDERSTAND
