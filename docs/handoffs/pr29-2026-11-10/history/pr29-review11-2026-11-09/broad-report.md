# PR29 round11 — broad read-only verify

Exact target: `git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- .`
Ledger: `/tmp/codegraph-cjs-missing-fix-20261108/.review/commonjs-eval-callee-context.md`, latest shared-production-evidence section plus previous rulings. Integration delta reviewed; no unrelated parent re-audit.

## Finding — P2: Preserve explicit property aliases on a whole exported local value

Location: `/tmp/codegraph-cjs-missing-fix-20261108/src/resolution/commonjs-export-evidence.ts:226`.

The new collector discards assignments whose left receiver is a local value rather than the wrapper's module/exports bindings. Later `membersOf` enumerates the local value's compiler type, which in this wrapped program does not contain these assigned properties. Therefore a statically explicit callable alias disappears when its containing object/class/function is exported whole. The production import resolver now requires a positive record member at import-resolver.ts:3429 and the fallback guard blocks the old path, so this is an introduced loss of a correct call relationship, not a request to restore global guesses.

Concrete valid `m.js`:

```js
class Store { load() { return 42; } }
const api = {};
api.load = Store.prototype.load;
module.exports = api;
```

`use.js`:

```js
const named = require('./m');
function run() { return named.load(); }
module.exports.run = run;
```

Actual runtime: `named.load()` returns 42. Current collector: defaults points to api, members `{}`, unknown false. Current real CodeGraph graph: calls `[]`. With only the two pre-integration production resolver files loaded from saved source in memory, identical source/runtime yields calls `[{target:"m.js:Store::load",typeFrom:["m.js"]}]`.

The same fail-after/pass-before is independently reproduced for `class Factory {}; Factory.load = Store.prototype.load; module.exports = Factory`, and for `function Factory() {}; Factory.load = Store.prototype.load; module.exports = Factory`. The directly exported object-literal shorthand control continues to resolve with the new collector. This requires preserving the binding-owned property-write relationship in the record; unknown/completeness must not authorize a method-name guess.

Evidence: `cg-broad-pr29-evidence11-expando.cjs` with current and before logs (object/class variants); `cg-broad-pr29-evidence11-factory.cjs` with current and before logs (function variant named function-alias). Both commands exited 0. Runtime is executed with vm against the exact fixture source and graph comes from existing dist via real CodeGraph.init/SQLite/tree-sitter. Logs are observations, not a test-suite pass claim.

Baseline attribution: before-loader transpiles the saved round10 name-matcher.ts and import-resolver.ts from base875 into their existing dist module slots in memory. Import-resolver was unchanged before this integration; round10 had only the prior15 dirty paths. All other current modules remain loaded. No disk source/build mutation occurs. Both exact replacement sources are included in artifacts.

## Independently cleared originals and bounded checks

- F10 original optional `yield?.(eval)("ignored")` wrapper: runtime has only known, graph missing calls `[]`; ast replay asserts it.
- F11 both original directions: genuine direct eval in an ordinary computed method key inside outer generator resolves m.js:Store::load and runtime42; generator method key in outer nongenerator wrapper produces no missing edge. The asserted 11-case ast replay additionally passes class/nested keys and body/eval controls.
- F12 original root object/instance and round10 parenthesized/bracket/logical forms: 28-case original replay records genuine m.js:Store::load directly and through forwarders while missing controls remain empty. New 12 asserted sync/fresh comparisons pass across parenthesized object/instance and logical instance, wrapper add/remove, direct/forwarded paths. typeFrom includes m.js or index.js+m.js as appropriate.
- F13 original parameter/block/arrow module shadowing: runtime missing is undefined; current graph calls `[]` for each, recorded in evidence11.log. The local module assignments do not contribute defaults/members.
- Declared callable aliases through object shorthand, normal properties and arrow variables resolve correctly in the new record. Existing direct named inline default callable also resolves.
- Loading existing dist library and shared helper without analysis yielded compilerLoaded:false.
- git diff --check ran successfully. All22 current tracked source/test/package hashes match the provided final integration source-sha256.json; preservation JSON included.

Other exploratory missing edges were not reported: the same behavior existed before integration, or the old graph selected an unrelated decoy. The mixed import experiment is excluded from runtime conclusions because its exploratory VM step removed the import rather than executing an actual module transpilation.

## Replay and durable dependencies

All report scripts/logs and exact pre-integration replacement sources are in `/tmp/cg-broad-pr29-evidence11-artifacts/`. Copy that whole directory plus this report for durable evidence. `before-loader.cjs` resolves both copied baseline sources relative to itself.

From a preserved checkout with current dist and installed dependencies:

```bash
CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2 CODEGRAPH_TELEMETRY=0 node --liftoff-only /tmp/cg-broad-pr29-evidence11-artifacts/cg-broad-pr29-evidence11-expando.cjs
CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2 CODEGRAPH_TELEMETRY=0 node --liftoff-only -r /tmp/cg-broad-pr29-evidence11-artifacts/before-loader.cjs /tmp/cg-broad-pr29-evidence11-artifacts/cg-broad-pr29-evidence11-expando.cjs
```

For function variant, substitute cg-broad-pr29-evidence11-factory.cjs in both commands and inspect function-alias. Original controls replay with cg-broad-pr29-f12-10.cjs, cg-broad-pr29-ast9-verify.cjs, cg-broad-pr29-evidence11.cjs, cg-broad-pr29-evidence11-sync.cjs. All scripts hardcode the exact reviewed checkout. Runtime needs Node with node:sqlite and --liftoff-only, installed TypeScript5.9.3, current compiled dist and copied grammar WASMs. The before loader additionally needs the two included TS snapshots and uses transpileModule in memory only. Original snapshot pathname remains in a harmless unused loader constant; replacement lookup uses __dirname.

No native parity claimed: binary absent; CODEGRAPH_KERNEL=0. No build/fullsuite/npm test run by this reviewer. No source, ledger, gate, control files, commits, staging, pushes or network writes. Only /tmp scripts/logs/report and disposable fixture directories were written. All spawned probe processes completed and temp fixture projects were removed.
