# PR29 isolated value contract experiment complete —99pass, adapter coverage gate fails

Authoritative checkpoint. User said "proceed" after independent Astra/Sol plans converged. Parent announced a bounded isolated contract experiment and kept production unchanged. User's save-as-you-go instruction persisted. No production integration, new review, build/fullsuite, dependency/schema/grammar changes, commits/pushes/merge/deploy or upstream writes in this phase.

## Production state

Repo /tmp/codegraph-cjs-missing-fix-20261108, branch fix/commonjs-eval-callee-context, HEAD87576a8d9ff0d8aba235db5535f5f4429f14b037. All22dirtysource/package/test hashes still match round11. F14 (lost local object/class/function callable property writes before whole export) and F15 (data/variable declaration accepted as callable) remain OPEN in production. Original F10–F13 cleared at round11. Review count11; no reset. Prior631focusedPASS1nativeSKIP is historical and misses open findings. Source/patch recovery remains pr29-export-evidence-integration-2026-11-09/; review11 evidence adjacent. Preserve checkout and all work; T0/live/control/deploy files untouched. Publication/identity boundaries from session-end handoff still apply.

## Experiment, durable workspace

/home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-value-contract-spike-2026-11-09

README.md describes contract/limits; results.json/progress.json exact statuses. value-graph.cjs is independent typed value/property/binding representation (JS experiment); source-contract.cjs bounded syntax-to-fact adapter; bindings.cjs reused TypeScript5.9.3 resolveName binder with public syntactic diagnostics; runtime.cjs controlled CommonJS fixture oracle. final-source/, earlier snapshots, all red/green TAP, measurements and artifact-sha256.json saved. No packages installed. No actual project/dependency JavaScript executed; real package files were parsed only.

## Actual verification

Final99PASS0FAIL0SKIP:24core +75source tests, final-tests.tap. All7.cjs files passed node --check. Test command from experiment directory:
node -e 'require("./value-graph.test.cjs"); require("./source-contract.test.cjs")'

Core includes F14expando object/class/function identities; F15reference vs callable/construct capabilities; reassigned callables; shared aliases/rebinding/overwrites/post-export writes; prototype links; localized unknown/escape; branch joins and weak writes for uncertain receivers. Callable source identity is distinct from display labels, so same-named implementations cannot collapse. Unknown runtime value can retain a storage reference without acquiring callable identity. Missing property read becomes undefined when exported as a value; absence remains distinct.

Source gate covers F10–F15 direct+forwarded, genuine generator/computed-key literal eval without generator execution, local module/eval shadowing, branch agreement/conflict, dynamic keys/escapes, source updates=fresh, indirect/optional eval rejection, unsupported construction/inheritance/prototype-descriptor behavior, and synthetic eval declarations with no indexed selector. Source IDs are experimental source-location identities/labels, not real CodeGraph node IDs. This does not validate actual CodeGraph sync/cache/store/worker/native paths.

History is preserved:21core red baseline then21PASS;59source red baseline then55PASS4FAIL (property-name Identifier treated as wrapper reference in effect scan); generic reference-role correction. Added uncertain-receiver weak-write test (21PASS1FAIL) and identity-vs-label test (22PASS1FAIL), then green. Unsupported construction tests66PASS3FAIL before unknown guards. Reference/presence and synthetic eval selector tests red before corrections. No expectations weakened; expected positive capabilities were strengthened to require identity. See results.json for actual per-run counts rather than reconstructing from prose.

## Coverage/performance screen — reason to stop before promotion

Parsed installed Commander files812/10289/87209bytes, sequential separate processes baseline/current experiment, five warm samples each. No runtime execution or full repo index. Experiment medians~5.31/13.98/46.25ms, import~252ms, retained heap delta~22.11MiB. These are analyzer-only and output contracts differ; no production performance acceptance or semantic parity claim.

All THREE real files returned unknown reference/callable, incomplete, reason "destructured initialization". The adapter invalidates the whole default too broadly for unsupported declaration lowering. Thus selected semantic contract gate PASSES, standalone adapter broader coverage gate DOES NOT PASS. Do not promote it wholesale or describe production bugs as fixed. The experiment is valuable evidence for representation, not a complete JS analysis implementation.

## Recommended next decision

Retain tested value/capability graph and regression corpus. Adapt that representation into the existing production collector while preserving its broader binder/type/source handling and lexical eval adapter. Replace declaration-as-callable and inferred-type-shape-as-write-ledger assumptions. Keep one shared authority consumed by import resolver/guard; no global name fallback. Do not merely bolt an expando map and node-kind filter onto the old contract, and do not port this standalone statement adapter wholesale.

Before claiming production readiness: real indexed-node mapping, current631focused preservation suite + F14/F15 real-graph tests, actual sync/forwarder dependencies, compiler lazy-load checks and representative project coverage/performance. Final full normal build/suite only after stable independent review per prior boundary. User decision needed for production changes/new review; this isolated phase is complete. Avoid another general interpreter or unbounded language expansion. No automatic continuation.
