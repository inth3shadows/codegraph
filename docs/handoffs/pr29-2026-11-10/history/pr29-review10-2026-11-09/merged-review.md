# PR29 focused verification round 10 — two P2 findings

Both fresh native read-only lanes completed. User explicitly authorized review only. Exact Git target: git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- . Ledger: .review/commonjs-eval-callee-context.md. All 15 source hashes match focused-tested F12 checkpoint. No source changes, build/full suite, commits, pushes, merge, deploy or gate reset.

## F13 — P2 — Shadowed module writes disable the unknown-eval guard (adversarial)

P2 — Shadowed module writes disable the unknown-eval guard. src/resolution/commonjs-export-members.ts:75 treats a local parameter’s assignment as a CommonJS root export:

exports.known = function known() {};
function pretend(module) { module.exports = {}; }
pretend({});
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");

With caller const named=require('./m'); function run(){named.missing();} and unrelated export class Decoy { missing() {} }, actual CommonJS runtime exports only known; missing is undefined. Current graph incorrectly returns calls:["decoy.js:Decoy::missing"]. The reader records exportForm:"value", evalState:"unknown", bypassing the guard at name-matcher.ts:25403. Block-local and arrow-parameter shadowing reproduce.

Loading both saved pre-F12 source files in memory yields calls:[] for identical inputs, confirming this correction introduces the regression.

Evidence: /tmp/cg-a10-boundary.cjs, /tmp/cg-a10-boundary.log, /tmp/cg-a10-before-loader.cjs, /tmp/cg-a10-boundary-before-source.log, /tmp/cg-a10-shadow-runtime.log.

Original F12 object/instance reproducers independently clear: runtime returns 42, graph reaches m.js:Store::load. Original F10 and both F11 directions independently remain cleared.

Read-only preservation confirmed: all 15 source hashes match the checkpoint. No source/control edits, build, full suite, commits, or network writes.

## F12 — P2 — F12 remains for equivalent whole-value assignment syntax (broad)

One P2 finding: F12 remains for equivalent whole-value assignment syntax at src/resolution/commonjs-export-members.ts:75.

class Store { load() { return 42; } }
(module.exports) = new Store();
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");

With const named=require('./m'); function run(){named.load();}, runtime returns 42, but graph calls are []. The reader records exportForm:"opaque" because it expects = immediately after module.exports; name-matcher.ts:25403 then suppresses the genuine call.

Removing only the optional wrapper restores m.js:Store::load. (module.exports) = {load:Store.prototype.load} and module.exports &&= new Store() reproduce. Direct and forwarded imports both fail; fresh indexing and sync agree. Removing the wrapper during sync restores the edge and expected typeFrom dependencies. This is an incompletely corrected F12 case, not a demonstrated new regression introduced by the latest patch.

Independently cleared on current dist:
- Original F12 unparenthesized root object and instance assignments, including forwarded/bracket/mixed controls.
- F10 optional wrapper: no Decoy::missing edge.
- Both F11 computed-key directions: real eval retained; wrapper produces no false edge.

Evidence: 28 runtime/graph probes in /tmp/cg-broad-pr29-f12-10.{cjs,log}; 12 asserted sync/fresh comparisons in /tmp/cg-broad-pr29-f12-10-sync.{cjs,log}. Ran with CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2 CODEGRAPH_TELEMETRY=0 node --liftoff-only.

All 15 source/test hashes remain unchanged against /tmp/cg-broad-pr29-f12-10-source-before.sha256. No repository edits, rebuild, full suite, or native-kernel parity claim. Overall F12 clearance remains pending.

Both reviewers independently clear the original F12 unparenthesized object/instance cases, F10 optional wrapper, and both F11 computed-key directions. This does not clear the two cases above. STOP: no fixes or another review without user decision. Final normal build/fullsuite remain deferred; prior 241 focused passes/1native skip do not cover these new findings. Review count 10 completed honestly; no resets.
