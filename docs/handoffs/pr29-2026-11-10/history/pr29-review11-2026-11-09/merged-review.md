# PR29 round11 — two new P2 findings

Exact Git target: git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- .
Same ledger .review/commonjs-eval-callee-context.md. Both fresh native lanes completed read-only. All22tested source hashes remain unchanged. No source edits, build/fullsuite, commit/push/merge/deploy or gate reset.

## F14 — P2 — Preserve explicit property aliases on a whole exported local value (broad)

Location: src/resolution/commonjs-export-evidence.ts:226.

The new collector discards assignments whose left receiver is a local value rather than the wrapper's module/exports bindings. Later membersOf enumerates the local value's compiler type, which in this wrapped program does not contain these assigned properties. Therefore a statically explicit callable alias disappears when its containing object/class/function is exported whole.

class Store { load() { return 42; } }
const api = {};
api.load = Store.prototype.load;
module.exports = api;

Caller named.load(): runtime42, current graph[], record.members{}. Identical before-integration resolver graph reaches m.js:Store::load with typeFrom[m.js]. Class Factory.load and function Factory.load alias variants independently fail-after/pass-before. This is introduced loss of a correct call relationship, not a request to restore global guesses. Full broad claim/repros: broad-report.md and broad-artifacts/.

## F15 — P2 — Do not emit calls to exported non-callable values (adversarial)

Location: src/resolution/import-resolver.ts:3430 (positive member return), with classification at commonjs-export-evidence.ts:148-156 and declaration acceptance at309-313.

m.js: const value=42; exports.load=value;
use.js: const named=require('./m');function run(){return named.load();}module.exports=run;

Runtime throws TypeError: named.load is not a function. Current graph adds run → m.js:value (constant), identical before-integration graph has no call. String-valued object-export variant reproduces. Supporting valid callable assignment function real(){return 42;}let value;value=real;exports.load=value runtime42/current graph targets variable value rather than callable real; before graph has no target. Same declaration fallback, one finding. Preserve legitimate data import/reference relationships while withholding unsupported call identity. Full adversarial claim/repros: adversarial-report.md and adversarial-artifacts/.

Both independently cleared original F10/F11/F12/F13 cases. Broad11asserted AST controls and12asserted sync/fresh comparisons pass;28original observations correct. Adversarial originals runtime-backed. Other observed gaps were excluded because baseline also missed them or selected an unrelated decoy.

STOP after reporting. Review count11completed, no resets. Prior631focusedPASS1nativeSKIP remains actual but misses new findings. No final normal build/fullsuite or native execution. No fixes or another review authorized by this review-only turn.
