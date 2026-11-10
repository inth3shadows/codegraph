# Exploration: PR29 export evidence boundary

Recommendation: keep PR29, split into two reviewable commits rather than adding a third stacked PR. Exploration only; no implementation authorized by /explore and no code changes made.

Root cause: reader members records explicit property writes, not a complete inventory of the value assigned by module.exports. The evalUnknown guard treats an empty partial set as grounds to reject root-object/instance calls. Both reported inputs return42 at runtime; current policy drops them.

Proposed contract: represent export form (namespace writes / stated value / opaque) separately from eval certainty (present / absent / unknown). Preserve existing resolution for stated exported values and explicit aliases. Suppress unrelated guesses for namespace members unsupported by available evidence. Unknown eval must not override a stated exported value or pretend the member is absent. Keep existing handling of confirmed eval exports.

Commit boundaries:
1. AST fact production, transport and source-hash storage, with its tests.
2. Export classification and resolver policy, with the complete behavior matrix.

Narrow remaining fix scope: src/resolution/commonjs-export-members.ts, src/resolution/name-matcher.ts, and their two test files. Existing extraction/storage/grammar work need not change for F12.

Effort: M by skill file-count rubric (2source+2test files); no new dependencies or schema changes. Integration: export summary -> module classification -> method-guess gate, including existing forwarder propagation and sync invalidation.

Technical checks before coding: establish how root assignments/mixed writes/bracket syntax map to export form; confirm forwarding and sync carry classification consistently. No external account/production/deploy blocker.

Validation: build a matrix of namespace writes, direct aliases, root objects and instances against eval absent/present/unknown, plus forwarding and fresh-v-sync. Include F12's two runtime-backed cases and retain F10/F11 controls. A blanket unknown block loses real calls; a blanket bypass restores false captures. Review the policy contract before another full-suite run.

Current state: checkout/tmp/codegraph-cjs-missing-fix-20261108 HEAD87576a8d,15dirtypaths. PR28/29 remain drafts; ASTrevision not pushed. Latest factual evidence and recovery: handoff-codegraph-pr29-review9-root-export-regression-2026-11-09.md. F10/F11 independentlyclear; F12P2open.172focusedPASS1SKIP predates F12testcoverage; no finalfull/build on dirtyASTrevision. Overallreviewcount9,noreset. Await user decision before implementation; preserve all dirty work/T0/deploy/control files.
