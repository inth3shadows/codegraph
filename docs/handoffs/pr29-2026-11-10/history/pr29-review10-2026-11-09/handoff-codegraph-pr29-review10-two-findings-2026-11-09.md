# PR29 focused round10 complete: F12 incomplete + new F13; awaiting decision


## Tenth native focused verification completed — original F12 clears; F12 variants and new F13 remain

User explicitly authorized this focused review. Both fresh read-only lanes review_broad_pr29_f12_10 and review_adversarial_pr29_f12_10 completed normally against exact git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- . and the same ledger / saved F12 delta. All 15 source hashes match the focused-tested F12 snapshot. No source edits, rebuild, fullsuite, commits, pushes, merge, deploy or gate reset. Parent merged actual reports without duplicate probes/source re-audit.

Both independently CLEARED original F12 unparenthesized root object/instance, original F10 optional wrapper, and both F11 computed-key directions. Original passing examples do not clear adjacent syntax/scope findings.

### F13 — P2 — Shadowed module writes disable the unknown-eval guard (adversarial)

Exact location src/resolution/commonjs-export-members.ts:75, gate name-matcher.ts:25403. Concrete input:

```js
exports.known = function known() {};
function pretend(module) { module.exports = {}; }
pretend({});
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");
```

Caller const named=require('./m'); function run(){named.missing();}, unrelated export class Decoy { missing() {} }. Actual CommonJS exports only known; missing undefined. Current graph incorrectly calls decoy.js:Decoy::missing. Reader records exportForm:value/evalState:unknown from local parameter's module.exports assignment, bypassing unknown-eval guard. Block-local and arrow parameter variants reproduce. Loading both saved pre-F12 source files in memory yields calls[] on identical inputs, proving NEW regression in latest correction. Evidence /tmp/cg-a10-boundary.{cjs,log}, /tmp/cg-a10-before-loader.cjs, /tmp/cg-a10-boundary-before-source.log, /tmp/cg-a10-shadow-runtime.log.

### F12 — P2 — F12 remains for equivalent whole-value assignment syntax (broad)

Exact location src/resolution/commonjs-export-members.ts:75, gate name-matcher.ts:25403. class Store { load() { return 42; } }; (module.exports) = new Store(); function yield(v){return function ignored(){}} yield?.(eval)("ignored"); with named.load() returns42 at runtime but graph calls[]. Reader expects = immediately after module.exports, records opaque and suppresses call. Parenthesized root object and module.exports &&= new Store() reproduce. Removing only optional wrapper restores Store::load. Direct/forwarded imports both fail; fresh/sync agree, removing wrapper during sync restores edge and typeFrom. This is incompletely corrected F12, not a demonstrated NEW regression in latest correction. Broad evidence /tmp/cg-broad-pr29-f12-10.{cjs,log} (28 runtime/graph probes), /tmp/cg-broad-pr29-f12-10-sync.{cjs,log} (12 asserted sync/fresh comparisons).

STOP/report both P2 findings. No fix or new review authorized by this yes-to-review turn. Review count10 completed honestly, no resets. Prior 241 focused PASS /1native SKIP remains actual but misses these cases. No final normal build/fullsuite on dirty AST revision; no native-kernel execution claim. PR28/29 stay draft/unpublished current correction; T0/live/control/deploy files untouched. Sources remain 15 dirty paths on HEAD87576a8d. Preserve checkout and all work.

Durable review evidence: original QA .review/commonjs-fix-2026-11-08/pr29-review10-2026-11-09/ includes broad/adversarial reports, merged-review.md, completed review-status.json, source hashes, scripts/logs, and ledger. F12 before/after source backups/cumulative+delta patches remain adjacent pr29-f12-2026-11-09/. New handoff /home/ericm/.codex/plans/handoff-codegraph-pr29-review10-two-findings-2026-11-09.md.

Read handoff-codegraph-pr29-session-end-2026-11-09.md for publication/identity/recovery boundaries. Latest checkpoint supersedes F12-focused review-pending state. User must decide next step; do not start another correction or review automatically. Repeated changes in this block warrant revisiting the evidence boundary rather than adding ad hoc syntax exceptions; no new design has been approved. Existing intended two-commit PR29 structure remains pending. No commits/pushes/merge/deploy or upstream writes authorized.
