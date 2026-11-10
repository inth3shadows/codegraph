# PR29 isolated evidence prototype COMPLETE — production unchanged

Latest authoritative checkpoint. User approved an isolated prototype and acceptance tests after round10, then explicitly said save progress as you go. This authorized experimental files only, not production integration, another review, builds/fullsuite, commits/pushes/merge/deploy. No scheduled continuation. Preserve checkout and all dirty work.

## Workspace and state

Production /tmp/codegraph-cjs-missing-fix-20261108, branch fix/commonjs-eval-callee-context, HEAD87576a8d9ff0d8aba235db5535f5f4429f14b037. All15 dirty source/test hashes match the round10 manifest throughout and at completion; no production changes this phase. F12 equivalent-assignment variants and F13 shadowed-module regression remain OPEN in production. Original F12/F10/F11 controls remained cleared at prior snapshot; this experiment is not a new production review. Review count10, no resets.

Prototype is durable at:
/home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-evidence-prototype-2026-11-09

Files: README.md (contract/limits), bindings.cjs, evidence.cjs, runtime.cjs, bindings.test.cjs, acceptance.test.cjs, measure.cjs, progress.json, results.json, measurements.json, artifact-sha256.json; milestone source snapshots and all actual TAP logs. Original QA T0 files untouched; only its allowed private .review directory used. Nothing committed/published. Personal identity/publication boundaries from session-end handoff still apply.

## Actual results

- Milestone1:13 binding/parser tests passed.
- Acceptance baseline stub:49FAIL/5PASS.
- Initial reducer:21PASS/33FAIL exposed a compiler API mismatch. getSymbolAtLocation sometimes returns inferred CJS export symbols for assignment uses, not lexical wrapper parameter identity. Added2failing regressions, verified checker.resolveName(name,node,Value,false) gives lexical identity, then15binder+54acceptancePASS.
- One bounded semantic-boundary pass:8FAIL/55PASS, then63acceptancePASS after modeling shared binding cells, var redeclaration, actual prototype links, indirect/optional eval distinction and explicit unsupported class-prototype replacement. No test expectations weakened.
- Final combined run:78PASS,0FAIL,0SKIP, final-tests.tap. All6current.cjs files passed node --check. No repository build/fullsuite or new independent reviewers.
- Small147-byte fixture measurements: model/compiler cold import249.23ms, heap delta17.07MiB; warm median direct1.25ms/forwarded1.70ms,50samples each. These are not CodeGraph indexing/large-repo/cache/worker/native measurements.

Test command from prototype directory:
node -e 'require("./bindings.test.cjs"); require("./acceptance.test.cjs")'
Measurement: node --expose-gc measure.cjs
Requires existing TypeScript5.9.3 dev installation in checkout; CODEGRAPH_PROTOTYPE_REPO can point at another checkout with it installed. No dependency install occurred.

## What is established

TypeScript compiler lexical identities distinguish wrapper module/exports bindings from local function/arrow/block/var/TDZ/destructured/catch/loop bindings. Structural parsing handles reviewed parenthesized/bracket/logical assignments. Bounded reducer follows object identity/order and real declarations; no global method-name search. Results have resolved/absent/unknown statuses, proof steps/ranges, dependency source hashes and analyzer version. Controlled runtime fixtures provide separate CommonJS semantics witnesses. Equivalent-syntax/shadow/decoy properties, direct+forwarded imports, and in-memory update=fresh analysis are pinned.

## Limits / stop condition

This became a small symbolic evaluator; do NOT port it wholesale as a narrow matcher correction. Generator execution, including genuine F11 generator eval, is explicitly unknown. Only controlled JavaScript fixtures exercised. Other unsupported operations return unknown; this is not complete/sound arbitrary ECMAScript analysis. No CodeGraph node-ID mapping, graph edges, real sync/persistence/cache/worker/native validation. TypeScript remains a development dependency; runtime use needs packaging/performance approval. Production compatibility is NOT cleared.

## Recommended next decision (not approved implementation)

Keep prototype as offline reference corpus. Define one binding-aware production export-fact contract before integration:
1. Per export/member, preserve positive relationship to declaration/type selectors and source ranges; retain wrapper binding identity and forwarding path. File-level flags never authorize global guesses.
2. Separate positive evidence from completeness/unknown reasons. Missing/stale/version-mismatched facts supply no absence proof or target identity. Source hash plus producer version identify facts.
3. Model graph relationships as static potential relationships with provenance; do not accidentally promise this prototype's exact module-initialization execution semantics. Assignment order, conditional mutations and eval support need explicit rules.
4. Decide how literal eval in generator scope produces supported positive evidence while retaining F10/F11. The current closed evaluator does not meet this requirement. Arbitrary eval support must not be inferred from a boolean.
5. Choose a single fact producer and migrate competing export readers (token reader, extraction helper, import-resolver regex) into consumers or retire them. Runtime compiler dependency vs existing parser needs a measured decision; do not invent another regex binder.
6. Production acceptance includes current full regression corpus plus binding/operator/scope transformations, real index/sync/worker/store paths, and documented native check limitation until binary available. Final normal build/fullsuite once after stable independently reviewed integration, within actual user approval.

No additional implementation is approved. Report prototype result and limitations; ask before production integration or further review. Read README/results rather than rerunning completed checks without a new reason.
