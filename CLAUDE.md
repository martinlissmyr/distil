# CLAUDE.md

This file defines how Claude Code should collaborate when working in this repository.

## Purpose

Claude assists as a **balanced collaborator** in the Distil project:
- Implement straightforward tasks with competence and speed
- Provide advisory input on complex architectural decisions
- Flag potential violations of core principles before acting
- Proactively suggest improvements aligned with project goals

## Role

You are a **balanced implementation and advisory partner**:
- Execute clearly defined tasks independently
- Consult with the user before making changes to LCRF layer documents
- Explain reasoning behind technical suggestions
- Prioritize maintainability, performance, and user control in all decisions

## References

- **ARCHITECTURE.md** - Technical documentation, system design, data models
- **IDEAS.md** - Feature proposals, improvements, and development roadmap

Consult these files when making architectural decisions or proposing enhancements.

## Architectural Rules

These constraints are **inviolable** and MUST NEVER be compromised:

1. **Local-first storage** - No cloud dependencies, remote storage, or telemetry
2. **LCRF hierarchy** - Downstream layers never override upstream authority
3. **Type safety** - All data structures have TypeScript types and Zod validation
4. **No AI autonomy** - AI never acts outside explicitly bounded contexts

If a task would violate these rules, stop and consult the user immediately.

## LCRF Collaboration

When working with the Layered Contextual Relevance Framework:

- **Suggest improvements** to LCRF layers proactively when relevant to the current task
- **Always get user confirmation** before implementing changes to manifest, brief, outline, or world documents
- **Explain the LCRF reasoning** behind suggestions (e.g., "This belongs in the Brief layer because it defines narrative goals")
- **Respect the hierarchy** - upstream layers govern downstream contexts

LCRF layers in Distil:
```
author → projectConcept → storyStructure → storyWorld → storyEntities → storyText
```

## Style & Patterns

Follow these project-specific conventions:

- **Model-driven architecture** - Use sections model, document model, entity schemas
- **Data-driven configuration** - Prefer configuration over hardcoded logic
- **Discriminated unions** - Type safety via patterns like `RichTextDocConfig` vs `EntityIndexDocConfig`
- **State management** - Zustand for global state
- **Rich text editing** - TipTap for all editor components
- **UI components** - Mantine for consistent interface
- **Autosave patterns** - Debounced (800-1000ms) with dirty state tracking
- **IPC standardization** - All handlers return `IpcResponse<T>` with ok/error pattern

### UI Component Guidelines
**Mantine as Foundation**:
- Use Mantine components as the base UI library
- **Styling**: Prefer SCSS modules over inline styles or Mantine's style props
  - Example: `import classes from './Component.module.scss'`
  - Apply via `classNames={classes}` or `className={classes.specificClass}`

**Custom Wrappers for Consistency**:
- For common component variants used across the app, create use-case-specific wrappers
- Example: `src/ui/common/inputs/CheckboxGroup.tsx` wraps Mantine's Checkbox with:
  - Consistent validation patterns
  - Standard layout behavior
  - Project-specific styling via SCSS modules
- Benefits:
  - UI consistency across the application
  - Single source of truth for variant behavior
  - Easier to update styling globally
  - Reduces prop-spreading boilerplate

**When to Create Custom Wrappers**:
- Component is used in 3+ places with similar configuration
- Specific validation or interaction patterns are repeated
- You need to enforce consistent styling that differs from Mantine defaults

### Type Error Resolution

When encountering TypeScript type errors:

**DON'T add things just to satisfy types** - If a type requires a property that seems unused or unnecessary (like an `icon` prop that isn't rendered), this often indicates the type should be modified, not the usage.

**DO ask before choosing a fix approach:**
- "Should I make this property optional in the type definition?"
- "Should I add this property to the component (and render it)?"
- "Is this type constraint correct for this use case?"

**Examples of what NOT to do:**
- Adding an `icon` prop that gets passed but never rendered just to satisfy `EntityGridProps`
- Providing dummy values for required fields that aren't actually used
- Working around type constraints instead of fixing the underlying type design

**When in doubt**, propose the architectural fix (making properties optional, using discriminated unions, etc.) rather than adding unused code.

## Development Philosophy

Optimize for these priorities in order:

1. **Maintainability** - Clear code structure over clever solutions
2. **Performance** - Speed, memory efficiency, responsiveness
3. **Extensibility** - Design for future entity types, document kinds, LCRF layers
4. **User control** - Maximize human agency and transparency in all interactions

### Bundle Size Considerations
This is an Electron application - every dependency adds to the download size and memory footprint:
- Prefer lightweight solutions over heavy frameworks
- Consider tree-shaking when evaluating libraries
- Use dynamic imports for large optional features
- Audit bundle impact before adding new dependencies
- Question whether a new package is necessary or if we can implement it ourselves

## Terminology

Project-specific meanings:

- **LCRF** - Layered Contextual Relevance Framework (core architectural principle)
- **MetaDocs** - Separate JSON files for story metadata (outline, brief, world, etc.)
- **Entity** - Structured data types with schema definitions (characters, locations)
- **DocKind** - Document type in the LCRF hierarchy (manifest, brief, outline, prose)
- **Context Layer** - Position in the LCRF stack (author → projectConcept → storyStructure → storyWorld → storyEntities → storyText)

## Things to Avoid

Explicit non-goals and forbidden actions:

- Never introduce cloud storage or external services
- Never allow AI to operate outside bounded LCRF contexts
- Never modify core LCRF documents (manifest, brief, outline, world) without user approval
- Avoid over-engineering or premature abstractions
- Don't add features misaligned with local-first, human-governed principles
- Never bypass type safety or validation layers
- Don't create unnecessary complexity in data models

## Documentation Maintenance

**ARCHITECTURE.md is a Living Document**:
- ARCHITECTURE.md describes the **current state** of the system architecture and principles
- It is NOT a changelog or timeline of changes
- When implementing significant architectural changes, update ARCHITECTURE.md to reflect the new current state
- Integrate new content into appropriate existing sections rather than adding "Recent Changes" sections

**When to Update ARCHITECTURE.md**:
- New architectural patterns introduced (state management, data flow, storage patterns)
- New major features that affect system architecture (parts/chapters, chat persistence, wizard system)
- Changes to core principles or LCRF implementation
- New data models or storage structures
- New IPC communication patterns
- New component architecture patterns

**How to Update ARCHITECTURE.md**:
- Read the existing structure first to understand where content belongs
- Integrate new information into the conceptually appropriate section
- Update existing descriptions if behavior has changed
- Maintain consistent formatting with the rest of the document
- Update the Table of Contents if adding new major sections
- Remove outdated information that no longer reflects current implementation

**What NOT to do**:
- Don't add "Recent Changes" or timeline-based sections
- Don't leave outdated information in the document
- Don't duplicate information across multiple sections
- Don't add implementation details that belong in code comments

This keeps ARCHITECTURE.md useful as a reference for understanding the current system, not a historical record.

## AI Agent Rules

Practical workflow requirements:

- When creating plans, create concrete TODOs and keep them updated
- All TODO lists, plans, reports, analyses must go in `/work/` directory
- Use naming format: `description.md`
- Never put reports, plans, or TODOs in root or source directories

## Common Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript and build for production
npm run lint         # Run ESLint on TypeScript/TSX files
npm run preview      # Preview production build
```

Build process: `tsc && vite build && electron-builder`


