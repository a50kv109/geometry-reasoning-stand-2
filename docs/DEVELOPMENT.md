# Developer Guide & Repository Structure (DEVELOPMENT.md)

## 1. Directory Structure

```
geometry-reasoning-stand/
├── docs/                   # Complete architectural and reference documentation
├── examples/               # Standalone usage and integration examples
├── src/
│   ├── components/         # React presentation components
│   │   ├── configuration/  # Passport panels and property inspectors
│   │   ├── layout/         # Header, sidebar, and container components
│   │   ├── research/       # Research mode panels and experiment controls
│   │   ├── school/         # School mode toolbar, object inventory, canvas wrapper
│   │   └── CanvasStage.tsx # Main 2D drawing canvas and mouse interaction
│   ├── engines/            # Core geometric computation engines
│   │   ├── configuration/  # Configuration passport projector & semantic relations
│   │   ├── research/       # Canonical rules, research graph, dynamic experiments
│   │   ├── semantic/       # Universal semantic command interface & NL adapter
│   │   ├── constructionCore.ts     # Primitive entity factories & DAG builder
│   │   ├── dependencyRecomputer.ts # Analytical propagation of vertex movements
│   │   └── geometryState.ts        # Canonical base state initialization
│   ├── environment/        # Machine-readable gym interface for AI reasoning agents
│   │   ├── GeometryEnvironment.ts  # Isolated observation & execution facade
│   │   └── types.ts                # Environment action and observation schemas
│   ├── kernel/             # Frozen mathematical knowledge base & graph solver
│   │   ├── canonicalPaths.ts       # Formal derivation paths (DP-*)
│   │   ├── consistencyEngine.ts    # Trust boundary & contradiction validator
│   │   └── navigator.ts            # Deterministic graph search engine
│   ├── presentation/       # Educational templates, typography, and card schemas
│   ├── tools/              # Visual construction state machines
│   ├── types.ts            # Root application interfaces
│   ├── App.tsx             # Root application assembly
│   ├── main.tsx            # Vite entry point
│   └── index.css           # Tailwind CSS imports
├── package.json            # Scripts, dependencies, and metadata
├── tsconfig.json           # Strict TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## 2. How to Add a New School Construction Tool

1. **Analytical Definition (`src/engines/`):**
   - Implement a pure function that calculates child coordinates from parent entities.
   - Assign a distinct `macroType` in `GeometryProvenance`.
2. **DAG Propagation (`src/engines/dependencyRecomputer.ts`):**
   - Register the construction type in the recomputer to ensure child coordinates update when parents move.
3. **Semantic Adapter (`src/engines/configuration/semanticRelation.ts`):**
   - Define the corresponding `SemanticConstructionOperation` and extraction logic.
4. **UI Toolbar Integration (`src/components/school/SchoolToolbar.tsx`):**
   - Add tool button and state machine in `src/tools/`.
5. **Autonomous Test:**
   - Create a dedicated unit test in `src/engines/tests/` asserting analytical accuracy and dynamic invariance.

---

## 3. How to Add a New Canonical Rule

1. Open `src/engines/research/canonicalRules.ts`.
2. Define a `CanonicalRuleDefinition` containing:
   - Unique identifier (`id`).
   - Formula and natural language statement.
   - Pure `evaluatePreconditions` function checking analytical conditions against `state`.
3. Export the rule and include it in `CANONICAL_RULES_REGISTRY`.
4. Add verification tests verifying both positive validation and the **vanishing property** when preconditions are perturbed.
