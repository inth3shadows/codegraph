# PR29 harness comparison

The candidate improved the tested call-resolution behavior and introduced no new correctness differences in this harness. It also introduced a measurable indexing slowdown on the JavaScript and TypeScript projects. This is not a clean performance clearance.

The baseline is PR29 HEAD `87576a8d9ff0d8aba235db5535f5f4429f14b037`; the candidate is the saved30path working diff. Both were copied into independent directories with copied dependencies, then passed normal builds, viewer/grammar/runtime checks. The original checkout was never checked out, stashed, reset, rebuilt, committed or edited. All2,019tracked-file hashes, Git status and working patch match the pre-run snapshot. No staged content.

## Correctness evidence

- **32/32PR29fixtures FIXED** on the candidate. All70anonymous canaries PASS; baseline69PASS1FAIL on the optional-wrapper case. Targeted fixtures extend the frozen contract inputs; they are not32new independently discovered cases.
- All38existing QA fixture verdicts are unchanged:4FIXED,32BROKEN,2GUESSED. These known failures remain visible; replay exit0alone does not mean they passed.
- Requests, Click, Mux and Ky have identical canonical graphs. Express loses64call edges and gains64unresolved calls, with no files/nodes changed.52old edges targeted the wrong function/value;12targeted a variable holding an external import without evidence for its call body. No removed edge in this set was a confirmed correct call. See express-classification.json for every site and source/runtime evidence; this does not establish complete Express call coverage.
- Agent-facing CLI comparison:17SAME,6CHANGED,0FAILED,0UNSTABLE. Changes show the intended PR29targets, removal of incorrect Express callers, and correct returned-function resolution in issue2952.
- Both builds pass99execution-mode comparisons each across11inputs (98raw IDENTICAL,1SAME-GRAPH). Covers repeat, parse1/4, resolver pool, serial resolution, no store worker, no fast init, reindex and sync-from-empty. The canonical-equivalent row-order difference occurs for Requests sync-from-empty on both builds.
- Metamorphic comparison:73seeds ×3relations per build. Candidate192CLEAN,17DIFF,10N/A; baseline183CLEAN,26DIFF,10N/A; no indexing errors. Exact diff multiset comparison finds9baseline differences removed and zero new candidate differences. The17remaining differences match baseline exactly. One is unrelated unbound opaque-call-name capture in a PR29seed; its exported-load assertions still pass. Repeat graphs are stable for all73seeds; shift checks pass wherever applicable. All remaining differences are decoy relations.

## Indexing time

Four fresh CLI indexes per build per project, alternating build order, after the other harness jobs finished. Same source copies, node22.22.2, WASM, two parse workers. Median and full range:

| Project | Baseline median (range) | Candidate median (range) | Median change |
|---|---|---|---|
| requests | 2.069s (2.062–2.292) | 2.066s (2.007–2.193) | -0.2% |
| ky | 5.045s (5.000–5.140) | 5.676s (5.474–5.783) | +12.5% |
| express | 2.378s (2.360–2.444) | 3.281s (3.241–3.825) | +38.0% |

All24indexes completed successfully. Ky and Express timing ranges do not overlap across builds. Requests is effectively flat. These are measurements on one shared local host with four samples per arm; they do not prove behavior for all repositories or identify the cause of the slowdown. Profile the JS/TS indexing path before further implementation or release readiness claims.

## Scope and saved evidence

This run used the existing deterministic QA fixture, canonical build-diff, CLI shadow, execution-mode and metamorphic harnesses, with saved unchanged scorer/adapter code. It did not run a model-agent A/B, refresh the compiler oracle, resume experimental T0, run overnight private-project history replay, run the complete repository test suite, or test native-kernel parity. Independent code review is still pending. No fixes, review agents or publication were performed.

`manifest.json` records corpus pins and candidate source hashes. `qa-inputs/` and its hash manifest preserve exact harness code and inputs. `baseline-source.tar.gz` and `candidate-source.tar.gz` preserve source snapshots; package locks identify dependencies. `candidate.patch`, all actual logs/JSON, exit codes in `execution.json`, timing samples, per-edge classification, metamorphic comparison and the final preservation audit are saved beside this report. Nonzero diff/shadow/metamorphic exits were retained and classified; no failing rows were hidden.
