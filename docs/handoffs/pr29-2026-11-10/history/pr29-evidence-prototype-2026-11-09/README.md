# CommonJS export evidence experiment

This isolated experiment tests whether compiler binding identities and explicit export-to-target relationships can address the PR29 review failures. It is not integrated into CodeGraph. The production checkout and all 15 dirty source files are unchanged.

Run from this directory:

```bash
node -e 'require("./bindings.test.cjs"); require("./acceptance.test.cjs")'
node --expose-gc measure.cjs
```

The experiment uses Node 22 and the existing development installation of TypeScript 5.9.3. It installs no dependencies. If the original checkout moves, point `CODEGRAPH_PROTOTYPE_REPO` at a checkout with TypeScript installed. The files here do not require the repository's `dist/` output.

## What the experiment established

- Compiler lexical name resolution distinguishes the CommonJS wrapper parameter from shadowed local bindings. `getSymbolAtLocation` is insufficient for this purpose because TypeScript can return inferred CommonJS export symbols; the experiment uses `checker.resolveName` for identifier bindings.
- Parenthesized/bracket assignment syntax is represented structurally, without spelling exceptions.
- Targets are reached through modeled export members/values and actual declaration records. There is no search for a method with a matching global name.
- Object identity and statement order matter. Replacing `module.exports` does not rebind `exports`; old aliases and subsequent prototype writes must retain their identities.
- Unhandled constructs return `unknown` with a reason and no target. Unknown is distinct from absence in the modeled object subset.

Final verification: **78 tests passed, 0 failed, 0 skipped** in `final-tests.tap`; all six current JavaScript files passed `node --check`.

## Files and contract

- `bindings.cjs`: virtual compiler host, synthetic CommonJS wrapper, lexical symbol identities, source ranges, source hash and analyzer version.
- `evidence.cjs`: bounded, ordered symbolic reducer. `EvidenceWorkspace.resolveImport(from, specifier, member)` returns `resolved` with target/proof records, `absent` for a missing modeled property, or `unknown` with reasons. Target strings label declarations; proof ranges disambiguate identities. They are not CodeGraph node IDs.
- `runtime.cjs`: independent binding/assignment behavior oracle using actual Node CommonJS wrappers, executing only fixtures defined in the test file. It never loads or executes project source. The model and oracle share only the small relative fixture-path resolver.
- `bindings.test.cjs`: 15 compiler identity/parser tests, including eight shadowing forms and the inferred CommonJS symbol pitfall.
- `acceptance.test.cjs`: 63 acceptance/property/boundary tests.
- `measure.cjs` / `measurements.json`: reproducible small-fixture measurements.
- `progress.json`: saved milestones, including actual failures. Earlier source snapshots and red/green TAP logs remain available.

Proof records carry import, whole-export/member-write, declaration, instance and forwarding steps, source ranges, hashes, and analyzer version. Literal eval payload records identify the call site and payload hash separately.

## Supported experimental subset

The reducer models selected synchronous statements, compiler-bound variables/functions, plain object members, classes with ordinary methods and implicit constructors, instance/prototype identity, direct aliases, relative forwarding, and `=`, `&&=`, `||=`, `??=` assignments. It models simple local calls so that a parameter named `module` modifies its argument rather than the wrapper object.

Direct intrinsic eval with a statically known string can supply property assignments in the current modeled scope. Its payload is parsed and reduced; the analyzer does not execute it. Indirect/optional eval returns unknown. A local function called `eval` is modeled as that local function.

The analyzer has 2,048 reduction steps and a call-depth limit of eight. These budgets do not bound the compiler's parsing/binding cost and are not a production robustness claim.

## Explicit limitations

- **Generator execution is unsupported.** The genuine F11 generator-eval example returns unknown. Existing production compatibility therefore remains a blocker. The opposite F11 computed-key wrapper example passes.
- This already contains a small symbolic evaluator. Do not copy it wholesale into the product as another narrow matcher fix.
- Arbitrary calls, asynchronous effects, unknown conditions, custom constructors, inheritance, spreads/accessors, destructured/default/rest parameters, and cyclic initialization are outside the subset. Unsupported operations conservatively stop the modeled analysis.
- This is not a complete ECMAScript interpreter or sound analysis of arbitrary programs. Parse diagnostics are checked; full early-error/semantic validation, all descriptor/prototype semantics and all JavaScript built-ins are not modeled.
- Tests exercise controlled JavaScript fixtures. They do not establish TypeScript/JSX/native-kernel parity or real-project coverage.
- Editing an `EvidenceWorkspace` recomputes analysis and is compared with a fresh workspace. This is **not** validation of CodeGraph's actual incremental sync, persisted metadata, cache invalidation or worker transport.
- There are no production graph edges, node-ID mapping, schema changes or dependency changes here. TypeScript is currently a development dependency in the repository; using it at runtime would require a separate packaging/performance decision.

## Measurements and recommendation

In the recorded run, loading the experimental model/compiler took about 249 ms and increased heap use by about 17 MiB. Warm median resolution was about 1.25 ms for a 147-byte fixture and 1.70 ms through a forwarder. These are process-local toy measurements, not indexing throughput or a performance acceptance bar.

Retain this as an offline reference model and regression corpus. The production direction remains one binding-aware export fact model consumed by import resolution and candidate selection. A candidate needs an export relationship to its declaration/type; a file-level flag must not authorize a global name guess. Production integration needs a defined dynamic-eval contract, one fact producer, node-ID/provenance mapping, and measured runtime/dependency costs. The closed reducer's exact initialization model should not accidentally become the product's promised JavaScript semantics.

F12 equivalent-assignment cases and F13 remain open in the unchanged production checkout. No independent review, normal build/full suite, commit, push, merge or deployment was performed for this experiment.
