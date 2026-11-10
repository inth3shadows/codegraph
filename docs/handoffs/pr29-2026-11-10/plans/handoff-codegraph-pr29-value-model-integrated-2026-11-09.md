# PR29 production value-model integration — saved and awaiting review

2026-11-09. Checkout `/tmp/codegraph-cjs-missing-fix-20261108`, branch `fix/commonjs-eval-callee-context`, HEAD `87576a8d9ff0d8aba235db5535f5f4429f14b037` unchanged. Preserve checkout and every uncommitted change. User approved production integration after the isolated contract experiment. No new review, commit, push, merge, deployment, or release was authorized or performed.

Implemented the binding-owned value/property graph in the existing lazy TypeScript collector, retaining its lexical binding and eval adapter. Typed source declaration selectors are separate from runtime values, storage references, callability and constructibility. Local object/class/function property writes, aliases and post-export writes retain their identity. Strong overwrites replace slots; uncertain receivers/branches join conservatively; data and unknown values cannot authorize a call. Compiler type seeding distinguishes class statics from instances and does not pre-apply expando writes from unexecuted branches. Logical assignments preserve RHS short-circuit behavior. Unsupported constructors/inheritance/prototype descriptor replacement remain unknown. No schema/grammar/dependency change was added in this phase; TypeScript runtime dependency and persisted eval facts are from prior approved work.

Import resolution selects the actual exported path for default, namespace and named imports, carries reference/call/construct intent through re-exports and memo keys, and preserves typeFrom dependencies. Bare imported CommonJS calls cannot borrow a namesake global; caller shadows remain eligible for local resolution. The const-alias synthesizer now requests reference evidence for the root it reads, rather than pretending to call a class.

The real sync acceptance test exposed failed forwarded calls not retrying after data becomes callable. Added a bounded failed-reference retry using the existing importer/barrel walk and binding-aware whole-module CommonJS forwarding. Positive edges retain their existing typeFrom resurrection. `src/index.ts` still reaches the new helper only through engine(); lazy read loading remains verified.

## Actual final verification

- Combined25files:812PASS,1nativeSKIP. Log `codegraph-pr29-value-verification.log`. Includes CommonJS/export/eval, import and alias resolution, source/type memo lifetimes, actual repeated forwarded sync edits, default export sync, and module-importer/barrel neighbors.
- Lazy engine7PASS outside sandbox, using previously authorized exception for known child-process pipe restriction. Log `codegraph-pr29-value-lazy.log`.
- Distinct819PASS,1SKIP over26files; no double counting supplemental runs.171production contract/core/import-boundary tests comprise24value-graph +46source/runtime contract +101real graph tests (included in812).
- `node node_modules/typescript/bin/tsc --noEmit`:PASS. `git diff --check`:PASS. After intent-to-add made the fixture visible, trimmed one extra EOF blank line; no semantic source changed after final tests.
- Normal standalone `npm run build` and full suite remain deferred until stable independent review, per existing boundary. Test setup rebuilt engine tsc/assets during implementation. Native kernel binary absent; no parity claim.
- Installed Commander3-file screen retains explicit exports/forwarded class identities through destructured imports instead of globally poisoning them. Warm analyzer medians approximately8.26ms/13.92ms/64.66ms for812/10289/87209byte files. This is source coverage and analyzer timing only, not an indexing/worker/large-project benchmark. Exact JSON saved.

## Failures diagnosed along the way

-16new F14/F15real-boundary cases failed before implementation; all pass now, direct and forwarded.
-Initial40PASS1FAIL identified class name's compiler type as the instance; corrected to getTypeOfSymbolAtLocation for the static side.
-Expanded639PASS1FAIL1SKIP exposed the const-alias caller's false call intent for a class reference; corrected the caller.
-92PASS1FAIL in real-boundary expansion exposed missing failed-forwarded-call sync retry; bounded retry added and targeted regression passed.
-778PASS1FAIL1SKIP exposed a property-name token `exports` being treated as a captured wrapper reference in the new opaque-call effect scan; property names excluded. Final147contract+boundary and final812combined are green. Actual logs preserved; no failures suppressed.

## Preservation and evidence

30dirtysource/test/package paths now visible in `git diff`, including four new files marked intent-to-add only. No staged content. Of22pre-phase dirty paths,17remain byte-identical and5were intentionally extended: export evidence collector, import resolver, name matcher, evidence unit tests, evidence integration tests. Four previously clean production paths changed coherently (const-alias synthesizer, module-importers, engine export, index sync caller); four new paths are the typed value graph, its unit tests, production source contract tests and shared fixtures. Prior changes are backed up intact.

Private evidence root:
`/home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-value-model-integration-2026-11-09`

Contains before/22files and hashes, milestone1/2 snapshots, final-source/30files, verified source-sha256.json, cumulative-from-875.patch, integration-from-round11.patch, all actual red/green/failure logs, package screen, results.json/progress.json. Local ledger `.review/commonjs-eval-callee-context.md` updated. Plans stay in ~/.codex/plans.

## Next step and authorization

F14/F15are implemented and focused-tested, awaiting independent verification.11native dual-review rounds have completed historically; no reset and no12thround started. Ask before a fresh focused dual review. If approved, use fresh read-only broad/adversarial native agents with exact target `git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- .`, same ledger, full30path source hashes and round11delta. Review the source-ownership/value-capability contract, alias caller and failed-forwarding sync work as well as F10–F15preservation. No publication. Normal build/fullsuite once stable review is achieved.
