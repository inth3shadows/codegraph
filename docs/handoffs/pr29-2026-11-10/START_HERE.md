# PR29 handoff — start here

Read this file first. The archive contains historical checkpoints, including failures and earlier permissions. This file describes the current state; older notes do not authorize new work.

The user requested that all task notes be committed for continuation in Claude. This is a documentation-only handoff. The implementation remains uncommitted in `/tmp/codegraph-cjs-missing-fix-20261108` on `fix/commonjs-eval-callee-context`. Preserve every existing implementation change. The implementation baseline is `87576a8d9ff0d8aba235db5535f5f4429f14b037`; a documentation commit above it changes the repository HEAD without changing that tested baseline.

## Read next

1. [Latest harness handoff](plans/handoff-codegraph-pr29-harness-complete-2026-11-10.md) and [full harness report](history/pr29-harness-20261110T013135Z/report.md).
2. [Implementation handoff](plans/handoff-codegraph-pr29-value-model-integrated-2026-11-09.md).
3. [PR29 review ledger](ledgers/commonjs-eval-callee-context.md), then [review 11 findings](history/pr29-review11-2026-11-09/merged-review.md) if needed.
4. [Harness results](harness/results.json), [timing samples](harness/timings.json), and [source hash manifest](implementation/source-sha256.json).

## What is implemented

The CommonJS export collector now tracks binding-owned values and object properties, with independent reference, callable and constructor evidence. Explicit local object/class/function writes retain their callable targets; exported data cannot become call targets; assigned functions target their implementations rather than storage variables. Import resolution carries intent through named/default/namespace imports and forwarding. Alias callers request reference evidence. Failed forwarded calls retry after source changes using the existing bounded importer/barrel walk. Lexical eval handling, caller shadows, source ownership and lazy compiler loading are retained.

F14/F15 are implemented and focused-tested; independent verification of the redesign is still pending.11 dual-review rounds completed historically. No new review was launched during the harness work and the review count was not reset.

## Actual validation

- 819 focused tests passed, 1 native check skipped, over 26 files. Type check and whitespace check passed on the implementation snapshot.
- Both isolated baseline/candidate normal builds passed, including viewer/grammar/runtime checks. No full repository test suite was run on this implementation revision.
- 32/32 targeted PR29fixtures passed;70/70 candidate anonymous canaries passed. The 38 existing QA verdicts stayed unchanged:4 FIXED, 32 BROKEN, 2 GUESSED. Known failures are not hidden.
- Requests, Click, Mux and Ky graphs match baseline. Express removes64 old call edges:52 incorrect targets and12 external-import variables without proven callable bodies; no confirmed correct call lost in that set. Files/nodes are unchanged.
- Both builds pass 99 execution-mode comparisons across 11 inputs. CLI shadow:17 SAME, 6 CHANGED, 0 FAILED, 0 UNSTABLE.
- Metamorphic candidate:192 CLEAN, 17 DIFF, 10 N/A over 219 checks; baseline:183 CLEAN, 26 DIFF, 10 N/A. Exact diff comparison finds9 old differences removed and0 new ones.17 baseline-identical differences remain; no indexing errors.

## Current issue: indexing cost

Four fresh indexes per build/project with alternating build order measured:

| Project | Baseline median | Candidate median | Change |
|---|---:|---:|---:|
| Requests |2.069s|2.066s|effectively flat|
| Ky |5.045s|5.676s|+12.5%|
| Express |2.379s|3.282s|+38.0%|

The Ky/Express timing ranges do not overlap. This is a measured indexing regression on these projects on one shared local host, not a universal bound or a proven cause. Recommended next work is profiling that cost. No performance fixes or profiling have been performed. Ask before implementing further fixes. Preserve existing source and use isolated copies for investigation.

## Resume safely

1. Verify repository, branch, personal identity, and the 30 implementation source hashes before changing anything. Git status should retain all 30 pending source/test/package paths, plus any later explicitly authorized work. Do not reset, stash, clean, or overwrite them.
2. Summarize the performance finding and confirm the user's next scope. Suggested next action: profile the isolated builds to locate indexing overhead; success means an evidence-backed cost attribution with unchanged source, not a speculative patch.
3. Keep11 completed review rounds explicit. If a fresh review is authorized, use the native broad/adversarial dual-review workflow and the same ledger, frozen source manifest and exact Git target. Do not claim prior focused passes or harness results are review clearance.

Local-only evidence remains at `/home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/`. Both build copies/dependencies/dist remain at `/tmp/codegraph-pr29-harness-6fevujfy`; its `baseline` and `candidate` directories are independent. Exact notes and result JSON are committed here so continuation does not depend on access to the private notes directory.

[The implementation patch](implementation/working-tree.patch.gz) preserves all 30 pending paths against the frozen baseline. It is gzip-compressed and preserves the patch bytes exactly. It is a backup: do not apply it on top of the existing dirty checkout. [inventory.json](inventory.json) records every copied note and its SHA256. Full build archives, dependency trees and raw logs remain local and are referenced from the reports.

The experimental T0 pilot and unrelated QA working changes stay paused and untouched. Native kernel binary is absent; validation is WASM-only. No agent-model A/B, compiler-oracle refresh or overnight private-project history replay was performed. No implementation commit, push, merge, deployment or upstream report is authorized by this handoff. Use the personal `inth3shadows` remote/identity; never use Transactly credentials or identity.
