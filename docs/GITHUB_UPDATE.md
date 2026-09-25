# GitHub Update & Release Checklist — Geometry Reasoning Stand V2.1.0

Follow this step-by-step checklist to safely review, commit, and push updates to the public repository.

---

## 1. Local Pre-Flight Verification

Execute all mandatory test and quality gates:

```bash
# 1. Autonomous mathematical kernel tests (74 tests)
npm run test:kernel

# 2. Agent contract environment tests (18 tests)
npm run test:env

# 3. Project persistence and transaction safety tests (30 tests)
npm run test:project

# 4. AAM language gateway benchmark (20 tests)
npm run test:aam

# 5. Full regression test suite (22 suites)
npm run test:all

# 6. Static type check (TypeScript)
npm run lint

# 7. Production bundle build
npm run build
```

---

## 2. Review Git Status & File Changes

Verify that the working tree contains only the intended persistence and localization assets:

```bash
git status
```

### Expected Modified Files:
- `package.json` (version bump to 2.1.0, test:project script)
- `CHANGELOG.md` (release 2.1.0 notes)
- `README.md` (project save/load description, updated test counts)
- `src/App.tsx` (ProjectMenu integration, clean load handler)
- `src/engines/dependencyRecomputer.ts` (perpendicular_bisector entity naming fix)
- `src/engines/semantic/types.ts` (SAVE_PROJECT and LOAD_PROJECT commands)
- `src/engines/semantic/semanticCommandExecutor.ts` (project command handlers)
- `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/en.ts` (localization keys)
- `docs/SEMANTIC_INTERFACE.md` (command catalog update)

### Expected New Files:
- `src/engines/project/types.ts`
- `src/engines/project/projectSerializer.ts`
- `src/engines/project/index.ts`
- `src/engines/tests/testGeometryProjectSerialization.ts`
- `src/components/project/ProjectMenu.tsx`
- `docs/GEOMETRY_PROJECT.md`
- `docs/RELEASE_V2.md`
- `docs/GITHUB_UPDATE.md`
- `docs/GOOGLE_AI_STUDIO_UPDATE.md`

---

## 3. Review Git Diff

Inspect key changes to ensure no unexpected modifications or secrets exist:

```bash
git diff package.json CHANGELOG.md README.md
```

---

## 4. Stage & Commit Changes

Stage all modified and newly created files:

```bash
git add package.json CHANGELOG.md README.md docs/ src/
git commit -m "feat(persistence): implement GeometryProjectV1, transaction safety, and UI Save/Load"
```

---

## 5. Push to GitHub

Push the verified commit to the main branch:

```bash
git push origin main
```

---

## 6. Post-Push Verification

1. Open repository at `https://github.com/a50kv109/geometry-reasoning-stand-2`.
2. Verify that `README.md` displays the updated project persistence section.
3. Verify that `docs/GEOMETRY_PROJECT.md` and `docs/RELEASE_V2.md` are accessible.
