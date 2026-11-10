# PR29 bounded value contract experiment — approved

User said proceed after independent Astra/Sol plans converged. Scope is combined isolated contract experiment, not production integration/review/publication. Preserve22dirtypaths and round11 F14/F15 evidence. Save checkpoints after each milestone.

Workspace: /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-value-contract-spike-2026-11-09

1. Fixed IR acceptance matrix before code: reference/call/construct distinctions; object/class/function property writes; data exports; reassigned callables; alias identity/rebinding/overwrites/post-export mutation; uncertain branches/escapes; localized completeness. Compiler bindings and existing recorded fixtures reused.
2. Implement typed value/property/binding graph with independent reference/callable/constructor selectors. No general calls/interpreter or custom scope parser. Failures are contract evidence; do not weaken tests.
3. Bounded source-to-facts adapter using existing binder and lexical eval expansion. Static potential literal-eval relationships include F10/F11 generator/computed-key cases without executing generators. Unknown supplies no name fallback or stale callable. Original F10–F15 cases mandatory; existing dynamic-eval compatibility must be explicit.
4. Direct/forwarded source fixtures and update=fresh checks; controlled runtime oracle only. These do not claim actual CodeGraph sync/native integration. Measure only what runs; representative performance remains a later integration gate.
5. Save all source/tests/red-green logs/contract table/results/handoff. Verify production22hashes at each checkpoint. Stop and report if mandatory coverage requires arbitrary execution or fixture-specific authority; no production edits until user decision.

## Complete
99testsPASS,7syntaxchecksPASS. Production22hashes unchanged. Representation/selected semantic gate passes; source adapter broader coverage gate fails (3Commander files unknown/destructured initialization). Do not promote adapter wholesale. Latest checkpoint: /home/ericm/.codex/plans/handoff-codegraph-pr29-value-contract-complete-2026-11-09.md . Production integration/new review remain separate decision.
