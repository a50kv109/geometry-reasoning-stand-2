# Configuration Passport & Semantic Projection (CONFIGURATION_PASSPORT.md)

## 1. Core Principle: Pure Read-Only Projection

The **Configuration Passport** (`GeometryConfigurationView`) is a transient, read-only semantic lens projected over the current `GeometryState`:

```
┌───────────────────────────────────────────────┐
│               GeometryState                   │
│        (Coordinates & Primitives)             │
└───────────────────────┬───────────────────────┘
                        │ Pure Projection
                        ▼
┌───────────────────────────────────────────────┐
│         configurationProjector.ts             │
│   (Semantic Relations, Quantities, Rules)     │
└───────────────────────┬───────────────────────┘
                        │ Immutable Passport
                        ▼
┌───────────────────────────────────────────────┐
│          GeometryConfigurationView            │
│   • Semantic Relations (S-01)                 │
│   • Semantic Constructions (S-02)             │
│   • Semantic Quantities (S-03)                │
│   • Epistemic Fact Ledger                     │
└───────────────────────┬───────────────────────┘
                        │ Props
                        ▼
┌───────────────────────────────────────────────┐
│         UI & AI Agent Consumers               │
│   (Tables, Inspectors, Agent Observations)    │
└───────────────────────────────────────────────┘
```

> **Critical Rule:** The Configuration Passport never stores independent state, never caches stale theorems, and never serves as a secondary source of truth.

---

## 2. Structure of the Configuration Passport

Defined in `src/engines/configuration/types.ts`:

```typescript
export interface GeometryConfigurationView {
  readonly summary: ConfigurationSummary;
  readonly semanticRelations: readonly SemanticRelation[];
  readonly semanticConstructions: readonly SemanticConstruction[];
  readonly semanticQuantities: readonly SemanticQuantity[];
  readonly epistemicLedger: readonly ConfigurationEpistemicEntry[];
  readonly trace?: ConstructionTrace;
}
```

### Components
1. **Semantic Relations (S-01):** High-level relationships (`TANGENT_TO`, `DIAMETER_OF`, `PERPENDICULAR_BISECTOR_OF`, `INSCRIBED_IN`) accompanied by formal notations and theorem references.
2. **Semantic Constructions (S-02):** Descriptions of constructive operations (`PERPENDICULAR`, `PARALLEL`, `ANGLE_BISECTOR`, `CHORD`) linking results to their reference entities.
3. **Semantic Quantities (S-03):** Numerical values (lengths, angles, areas, ratios) with precision, physical bounds ($L \le 2R$), and LaTeX representations.
4. **Epistemic Fact Ledger:** Table of all active facts categorized by certainty tier (`CONSTRUCTED`, `DERIVED`, `VERIFIED`).

---

## 3. Dynamic Re-evaluation

Every time a point moves or a construction is added/removed:
1. `buildConfigurationView(state)` executes deterministically.
2. Quantities are calculated.
3. Relations are extracted and tested against canonical rules.
4. The updated passport is delivered to the UI and external agent callers in a single render pass.
