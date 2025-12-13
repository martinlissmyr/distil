# Alinea

**A local-first writing environment built on the Layered Contextual Relevance Framework (LCRF)** — enabling structured, intention-driven co-creation with large language models.

Alinea is not a generic “AI writing app.”  
It is a methodological system for long-form creative work, where **human intention governs structure, and AI operates as a context-bound cognitive amplifier**.

---

## Conceptual Foundation

Alinea is a concrete implementation of the **Layered Contextual Relevance Framework (LCRF)**, a human-intention–driven architecture for structured collaboration with LLMs.

LCRF models creative work as a **stack of contextual layers**, where each layer constrains and informs the next:

1. **Identity & Governance** — values, voice, tone, constraints  
2. **Domain & Methodology** — how work is done (narrative craft, editorial standards, etc.)  
3. **Project Intent** — goals, audience, scope, creative direction  
4. **Structured Knowledge** — outlines, worldbuilding, characters, plans  
5. **Task Execution** — moment-to-moment writing and problem-solving  

In Alinea:
- **Humans define and validate every layer**
- **LLMs assist within explicitly bounded layers**
- **The AI never acts outside the contextual boundaries defined above it**

This prevents drift, hallucination, and stylistic inconsistency over long creative timelines.

---

## What Alinea Is (and Is Not)

### Alinea *is*:
- A **local-first creative system** for long-form writing
- A **layer-governed AI collaboration environment**
- A tool for **iterative, multi-document creative work**
- A framework-driven alternative to ad-hoc prompt engineering

### Alinea is *not*:
- A chat UI pasted next to a text editor
- A prompt-template generator
- An autonomous agent system
- A cloud-hosted writing platform

---

## Core Features (Mapped to LCRF)

### 1. Identity & Governance Layer
- **Author Manifest**
  - Defines voice, tone, values, aesthetic rules
  - Governs *all* downstream AI behavior
- Used as a persistent, upstream context in every interaction

### 2. Domain & Methodology Layer
- Encoded implicitly via:
  - Editor roles
  - System prompts
  - Wizard definitions
- Supports different creative methodologies without hard-coding them into the UI

### 3. Project Intent Layer
- **Story Brief**
  - Purpose, themes, audience, conceptual direction
- AI uses this layer to stay aligned with *why* the work exists

### 4. Structured Knowledge Layer
- **Outlines**
- **World descriptions**
- **Characters & entities** (extensible)
- These documents act as the project’s operational memory

### 5. Task Execution Layer
- **Prose editor with AI side-panel**
- Context-aware assistance for:
  - Writing
  - Revision
  - Analysis
  - Exploration
- The AI dynamically reasons about *which layers matter* for each question

---

## Intelligent Context Selection

Alinea uses **meta-level context reasoning**, a core principle of LCRF:

When you ask a question, the system determines:
- Which contextual layers are relevant
- Which documents should be included
- Which should be excluded to avoid noise

This happens via:
1. **Model-derived context rules** (document layer ordering)
2. **Heuristic filtering** (fast keyword signals)
3. **LLM-based classification** for ambiguous cases

Result:  
The AI receives *just enough context* — no more, no less.

---

## Wizard System (Structured Co-Creation)

Wizards are **not UI helpers** — they are **formalized co-creation protocols**.

### Design Principles
- Declarative JSON definitions
- Pure functional execution engine
- Human-validated progression
- Optional LLM processing steps
- Deterministic, inspectable behavior

### What Wizards Do
- Help *build* contextual layers (not just consume them)
- Externalize tacit knowledge
- Structure complex creative decisions
- Produce reusable artifacts (text, plans, summaries)

This reflects the LCRF principle that **AI helps construct the layers it later operates within**.

---

## Architecture Overview

```
alinea/
├── electron/              # Main process & IPC
│   ├── chat.ts           # OpenAI boundary
│   ├── secureStore.ts    # API key storage
│   └── fs/               # Local persistence
├── src/
│   ├── models/
│   │   └── docs/         # Canonical document model (LCRF layers)
│   ├── chat/
│   │   ├── buildPrompt.ts
│   │   ├── contextSelector.ts
│   │   └── prompts/
│   ├── wizards/
│   │   ├── engine.ts     # Pure wizard engine
│   │   ├── registry.ts   # Wizard discovery
│   │   └── configs/      # Wizard definitions
│   ├── components/
│   │   ├── editor/
│   │   ├── layout/
│   │   └── playground/
│   ├── state/            # Zustand stores
│   └── hooks/
└── CLAUDE.md              # Detailed architectural notes
```

---

## Data & Privacy

- **Local-first**
  - All data stored in \`~/Alinea/\`
- **No cloud sync**
- **No telemetry**
- **API keys stored securely**
  - macOS Keychain
- **Explicit human control at every layer**

---

## Development Philosophy

Alinea treats AI as:

> A precision instrument — not an autonomous agent — fully governed by human intention.

This aligns with the LCRF principle that:
- Humans provide meaning, direction, and judgment
- LLMs provide abstraction, structure, and synthesis
- Authority always flows *down* the contextual stack

---

## Status

Alinea is a project exploring:
- Long-horizon AI-assisted creativity
- Intentional governance of generative systems
- Practical applications of LCRF in real tools

---