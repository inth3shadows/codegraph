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
