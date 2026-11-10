# PR29 isolated harness comparison — approved

User said proceed after recommendation to run baseline-versus-candidate harness on isolated copies. Preserve the original checkout, every uncommitted change, existing QA workspace and paused experimental T0. No implementation edits, review agents, commits, pushes, deployment, account work or publication.

Use the QA workspace's deterministic harness: fixture replay with anonymous canaries on baseline and candidate, canonical graph build comparison on pinned available dev corpus, agent-facing shadow comparison, and execution-mode/metamorphic checks including sync/reindex/repeat. Baseline is original PR29 HEAD87576a8d; candidate is current saved30path working diff. Copy source and dependencies into independent /tmp directories; build only those copies. Keep exact source and adapter hashes, corpus pins, commands, logs, results and limitations in private originalQA .review. No model agents or API spend needed for deterministic measurement.

Classify expected fixes separately from newly lost correct edges, baseline-known problems, harness failures and actual regressions. A successful process exit is not a clean result unless verdicts support it. Preserve failures and stop before fixing discovered defects. Native binary absent, so WASM-only; no native parity claim. Do not resume T0 or run overnight private-project history harness. Verify original source hashes and Git status at the end.

## Running checkpoint

Work /tmp/codegraph-pr29-harness-6fevujfy; durable output /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-harness-20261110T013135Z. Both isolated normal builds PASS.70fixtures replayed per arm, candidate32/32PR29casesFIXED and70/70canariesPASS; all38existingverdictsunchanged. Baseline canary1FAIL optional-wrapper. Four of five dev corpus graphs identical; Express64oldcalltargetsremoved (52incorrect,12externalvariable/unproven), no files/nodes changed. Shadow17SAME6CHANGED, no failures/unstable. Both modes99comparisonsPASS (11inputs; repeat/workers/reindex/sync), no DIFFER/FAILED. Meta jobs running (sessions82881/24349), timing queued after them. Original2019trackedfilehashes and Git status match. Inputs/source archives copied durably; no fixes. See execution.json/progress.json in output.

## Completed2026-11-10

Harness complete; correctness improves in testedscope, no new invariantdifferences, measured indexing regressions Ky+12.5%,Express+38.0% (4samples/build), Requestsflat. Originalcheckout unchanged. Read /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-harness-20261110T013135Z/report.md and handoff-codegraph-pr29-harness-complete-2026-11-10.md. No fixes or new review. Recommend profiling next with user authorization before implementation.
