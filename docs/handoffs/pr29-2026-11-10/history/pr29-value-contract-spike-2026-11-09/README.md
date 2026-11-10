# Binding-owned value contract experiment

This is the isolated experiment requested after the independent Astra/Sol plans. Production remains frozen at the round11 snapshot: 22 dirty paths, F14/F15 still open there. No production source, dependency, schema, grammar, index or control file was changed.

## Result

**99 tests pass: 24 pure value-graph tests and 75 source-contract tests.** All seven JavaScript files pass `node --check`. Actual red/green histories and milestone snapshots are preserved.

The selected semantic gate passes, including F10–F15. The standalone source adapter **does not pass a broader coverage gate**: all three installed Commander files tested return unknown because unsupported destructured initialization invalidates the default export too broadly. This is a concrete reason not to promote the adapter wholesale.

## Contract

`ContractWorkspace.lookup(file, path)` returns independent results:

- `reference`: known storage/declaration ownership, absent, or unknown. A data export can retain its binding reference even when its runtime value is unknown.
- `callable`: a positive implementation selector **and source identity**, proven non-callable, absent, or unknown with a reason.
- `constructible`: separate from ordinary calls; a class constructor is not an ordinary callable.
- `complete`, dependency source hashes, and analyzer version.

Selectors are display labels in this experiment. `identity` and `binding` distinguish source declarations/allocations; identical display names never establish equality. Production needs explicit source-range-to-CodeGraph-node mapping. A positive value without an indexed selector cannot produce a graph edge.

Bindings and property slots point to values. Object/class/function identities retain explicit expando writes and share them through aliases. Rebinding an alias preserves the original object's identity. Strong overwrites replace prior facts; writes through uncertain receivers are weak. Branch alternatives must agree on implementation identity before proving a callable. Unknown keys and escapes invalidate affected properties; they never authorize name guessing or stale callable reuse.

An absent property and an exported `undefined` value are distinct: evaluating a missing property as a value yields undefined; a new export containing that value is non-callable rather than absent.

## What is tested

- F14 object/class/function property assignment before whole-value export.
- F15 numeric/string data exports, data references, and callable reassignment to an actual function body rather than a variable declaration.
- Original F10/F11 optional wrappers and generator/computed-key literal eval; F12 root/parenthesized/logical exports; F13 function/arrow/block shadowing.
- Direct and relative-forwarded modules, alias mutation/rebinding, property/binding overwrites, post-export writes, branch agreement/conflict, uncertain receiver writes, escapes and dynamic keys.
- Separate constructor/call capabilities, same-named distinct declarations, indirect/optional/local eval handling, and synthetic eval declarations lacking indexed bodies.
- Source updates compared with a fresh workspace. This is not CodeGraph's actual incremental sync.

Runtime witnesses use actual CommonJS wrappers for controlled fixtures only. Unknown-control-flow fixtures are deliberately not executed. No project or dependency JavaScript is executed by the analyzer.

## Files and replay

- `value-graph.cjs`: independent binding/property/value/capability representation.
- `source-contract.cjs`: bounded syntax-to-fact transfers, using the reused compiler binder and lexical eval expansion. It executes no functions or generators.
- `bindings.cjs`: TypeScript 5.9.3 lexical identities via `resolveName`, source mapping and public syntactic diagnostics.
- `runtime.cjs`: controlled-fixture runtime oracle.
- `*.test.cjs`, `final-tests.tap`: fixed contract/fixture acceptance tests.
- `measure.cjs`, `measurements-*.json`: read-only source analysis measurements.
- `progress.json`, `results.json`, snapshots and TAP logs: progress and actual failures.

From this directory:

```bash
node -e 'require("./value-graph.test.cjs"); require("./source-contract.test.cjs")'
node --expose-gc measure.cjs baseline
node --expose-gc measure.cjs contract
```

The existing checkout supplies TypeScript. Set `CODEGRAPH_PROTOTYPE_REPO` for the binder if it moves; the measurement script also names the original checkout explicitly. No packages were installed. Restore the frozen production dist/dependencies before replaying the baseline comparison.

## Limits and decision

This is a bounded def-use/value experiment, not complete JavaScript analysis. Source lowering supports selected synchronous declarations/assignments and static potential literal-eval relationships. It neither proves generator invocation nor exact runtime exports. Arbitrary function return values, construction/inheritance effects, reflective behavior, many declaration forms and broader module semantics remain unknown. Unindexed declarations introduced inside eval supply no indexed body/constructor selector.

Custom constructors, inheritance and class prototype descriptor replacement are explicitly unknown instead of yielding fabricated class-method calls. Loops and unsupported statements are conservative; the current whole-default invalidation is broader than the desired localized production policy. Destructuring on real dependency sources demonstrates that gap.

The package-file measurements cover Commander sources of 812, 10,289 and 87,209 bytes, in separate sequential processes for baseline and experiment. They are analyzer-only, not real-project indexing, workers, graph queries, sync, native parity or a production performance acceptance bar. Output contracts differ. Initial concurrent measurements are kept separately; final measurements are sequential.

**Recommendation:** reuse the tested value/capability representation and corpus when adapting the existing production collector. Preserve its broader source handling and lexical eval adapter; replace declaration-as-callable and type-shape-as-write-ledger assumptions. Do not replace production with this standalone adapter. Real CodeGraph node mapping, existing-suite compatibility, real sync/dependencies and representative project performance remain integration gates. No fresh review or publication was performed.
