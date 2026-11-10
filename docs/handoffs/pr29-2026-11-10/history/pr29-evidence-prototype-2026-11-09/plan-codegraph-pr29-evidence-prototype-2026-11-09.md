# PR29 isolated export-evidence prototype — approved

User approved isolated prototype + acceptance tests, then requested save-as-you-go checkpoints. Production checkout and its 15 dirty source paths must remain unchanged. Current review state F12 variants/F13 open, round10 complete; no new review/publication authorized.

Workspace: /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-evidence-prototype-2026-11-09 . Use installed TypeScript 5.9.3 only as a dev-time scope/binding experiment, no dependencies added to project. Node built-in test runner, controlled runtime fixtures only.

Milestones, each saved before proceeding:
1. Validate established binder: actual CommonJS wrapper parameter identity vs local function/block/arrow bindings; parse diagnostics for F10/F11 contextual yield. Record feasibility and limits before choosing implementation.
2. Implement minimal evidence model/proof paths in isolated files. Positive export/member/instance evidence, independent unknown states, deterministic conflict/unsupported policy. No global-name fallback. Explicitly constrain initialization/order/conditional/alias behavior. Retain proof provenance/ranges and source hash+analyzer version.
3. Acceptance tests first/red, then implementation/green: original and variant F12, F13; syntax-equivalence/shadow/decoy properties; direct/forwarded; controlled literal eval vs unknown; fresh vs cached/updated model. Compare controlled Node runtime witnesses where applicable, mark unsupported distinctly. Do not claim real CodeGraph sync/native integration or parity.
4. Record measurements, failures/limits and next integration decision. Save all prototype source/tests/results and a self-contained handoff in plans. Verify production hashes every milestone. No production code, root dependencies/schema/grammar, fullsuite/build, commits/pushes/merge/deploy.

Approval boundary: further production integration requires user approval. A failed feasibility assumption is a result to report, not permission for an unbounded compiler subsystem.

## Completed
Isolated prototype complete:78tests,6syntax checks passed. Milestone snapshots and actual failure histories saved; production15hashes unchanged. Final report/limits: /home/ericm/.codex/plans/handoff-codegraph-pr29-evidence-prototype-complete-2026-11-09.md. No production integration approved.
