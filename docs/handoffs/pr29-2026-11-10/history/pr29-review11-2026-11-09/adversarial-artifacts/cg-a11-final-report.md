# PR29 verify round 11 — adversarial lane

Reviewed exact target `git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- .`, focusing the nine-file shared production export-evidence integration delta. Read-only source; no edits, build, full suite, commits, publication, gate/ledger changes, or native-kernel claim.

## P2 — Do not emit calls to exported non-callable values

Location: `src/resolution/import-resolver.ts:3430` (positive member return), with evidence classification at `src/resolution/commonjs-export-evidence.ts:148-156` and declaration acceptance at `:309-313`.

Complete failing two-file fixture:

```js
// m.js
const value=42; exports.load=value;
// use.js
const named=require('./m');function run(){return named.load();}module.exports=run;
```

Runtime: executing `require('./use.js')()` throws `TypeError: named.load is not a function`.

Current real CodeGraph index: `use.js:run` has a `calls` edge to `m.js:value`, whose node kind is `constant`. It is data, not a callable declaration. The collector follows its initializer only for selected expression kinds, then falls through to a `kind:'value'` selector for the numeric variable declaration; the import resolver returns the selected constant directly for a `calls` reference. Thus a positive data-export relationship becomes an invented call target. This is a new integration regression: the exact before-integration import resolver/name matcher, loaded in memory on identical fixtures, has `calls:[]`.

Second complete m.js variant (same use.js):

```js
const value="payload";module.exports={load:value};
```

Same runtime TypeError, current `calls:[m.js:value]` (constant), before `calls:[]`.

Callable assignment supporting variant (same use.js):

```js
function real(){return 42;}let value;value=real;exports.load=value;
```

Runtime returns42. Current graph calls the uninitialized `m.js:value` variable rather than callable `m.js:real`; before has no target. This illustrates the same declaration fallback and does not add another finding. Preserve legitimate data import/reference relationships while withholding unsupported call identity.

## Original-case clears

Executed runtime-backed real-index controls in `/tmp/cg-a11-evidence-probe.cjs`:

- F12 parenthesized instance, parenthesized object, and `module.exports &&= new Store()` under optional `yield?.(eval)("ignored")`: runtime42; all graph calls exactly `m.js:Store::load`.
- F13 function parameter, arrow parameter and block-local `module` writes: runtime exports only `known`; graph calls empty, no Decoy.missing.
- F10 optional wrapper: only `known`, calls empty.
- F11 real eval in ordinary computed method key inside outer generator: runtime42, Store::load; generator method key in surrounding nongenerator wrapper context: only known, calls empty.
- Shorthand callable alias and literal-eval local alias: runtime42, Store::load. Whole relative forwarding fixture: runtime42, graph calls impl.js:load. Named default callable function: runtime42, graph calls m.js:load.

Additional uninvoked binding-reassignment, member-forwarding and alias escape gaps were compared against the before integration and also fail there. They are excluded as pre-existing gaps, with no new finding claimed.

## Replay and evidence

Commands ran directly with `CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2 CODEGRAPH_TELEMETRY=0 node --liftoff-only <script>`; real SQLite/temp projects, runtime `require` evaluation, current frozen dist. No test/build invoked.

New defect standalone replay: `/tmp/cg-a11-values.cjs`; current output `/tmp/cg-a11-values-current.log`, structured `/tmp/cg-a11-values-current.json`.
Before replay: `/tmp/cg-a11-before-values-loader.cjs` with `CG_RESULTS=/tmp/cg-a11-values-before.json`; output `/tmp/cg-a11-values-before.log`, structured `/tmp/cg-a11-values-before.json`.
Baseline loader uses the saved round10 name matcher from the integration `before/` directory. The import resolver was unchanged before integration, so its exact `87576a8d` source was read with `git show` into `/tmp/cg-a11-before-import-resolver.ts`. Loader transpiles those two files in memory, changing no repo files.

Original cases script/log/results: `/tmp/cg-a11-evidence-probe.cjs`, `/tmp/cg-a11-evidence-probe.log`, `/tmp/cg-a11-evidence-results.json`.
Filtered gap baseline: `/tmp/cg-a11-before-loader.cjs`, `/tmp/cg-a11-before.log`, `/tmp/cg-a11-before-results.json`.
Forwarding/alias supporting controls: `/tmp/cg-a11-forward-probe.cjs`, `/tmp/cg-a11-forward-current.{log,json}`, `/tmp/cg-a11-before-forward-loader.cjs`, `/tmp/cg-a11-forward-before.{log,json}`.

Replay dependencies: this frozen checkout's dist/, node_modules/, TypeScript package; baseline source file `/tmp/cg-a11-before-import-resolver.ts`; saved `before/src/resolution/name-matcher.ts` under `/home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-export-evidence-integration-2026-11-09`; checkpoint `source-sha256.json` in that same backup. For durable backup copy these scripts/logs/JSON, baseline import resolver source and the saved before name matcher. Temp fixture directories were cleaned by scripts.

Initial 22-source hash check passed with mismatches[]. Final check stored separately in `/tmp/cg-a11-source-hash-check.json`. No remaining processes or further probes planned.
