# Isolated prototype — milestone 1 saved

User approved prototype only and explicitly requested save-as-you-go. Workspace: /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-fix-2026-11-08/pr29-evidence-prototype-2026-11-09. Production 15 source hashes unchanged; no integration/build/fullsuite/review/publication.

Milestone1: bindings.cjs uses installed TypeScript 5.9.3 Compiler API with synthetic CommonJS wrapper, getSymbolAtLocation identity and noLib/noResolve virtual source host. bindings.test.cjs has13passing tests, milestone1-bindings.tap. Eight shadow variants (fn/arrow/block/var/TDZ/destructured/catch/loop) differ from wrapper binding. Five F10/F11/F12 syntax fixtures parse cleanly. No new production dependency installed.

Next: bounded reducer + acceptance tests/proof paths, using compiler identities. Explicit supported subset and unknown policy required; do not turn this into a full interpreter. Controlled fixture runtime oracle allowed, repo source never executed. Final prototype must state compatibility limits (especially generator eval) and does not prove CodeGraph/native/sync integration. See approved plan-codegraph-pr29-evidence-prototype-2026-11-09.md and progress.json.

## Milestone2 saved
Initial acceptance stub49FAIL/5PASS; first reducer21PASS/33FAIL exposed getSymbolAtLocation inferred-CJS symbol mismatch. Minimal probe proved checker.resolveName(name,node,Value,false) resolves lexical wrapper identities. Added2regressionsfirst(2FAIL13PASS), updated the binding interface: now15binderPASS and54acceptancePASS. No acceptance weakened. Snapshot milestone2-passing-source/; actual logs/progress.json durable. Prototype bounded AST reducer with object identity/order, local calls, literal assignment-only eval and direct forwarding; unsupported constructs return unknown. Generator execution (F11 genuine eval) deliberately unknown; this is an integration blocker, not a clearance. No CodeGraph graph/native/sync integration claimed. Next bounded boundary-test pass + measurements/limitations, then stop/report. Production hashes unchanged.

## Milestone3 saved
One bounded semantic-boundary pass added9cases; actual8FAIL55PASS then63acceptancePASS. Shared binding cells correct closure/block writes; var redeclaration no longer resets wrapper. Indirect and optional eval return unknown (cannot use caller bindings); direct assignment-only literal eval still works. Instances reference actual prototype objects, so later prototype-method writes retarget. Class prototype replacement explicitly unsupported. No expectations weakened. Snapshot milestone3-passing-source/, before/after logs durable. Next final combined78tests, syntax checks, small-fixture benchmarks and limitations/report. Production hashes unchanged. This is already a bounded symbolic evaluator, so do not propose porting it wholesale as a small production fix.

## Complete
Superseded by /home/ericm/.codex/plans/handoff-codegraph-pr29-evidence-prototype-complete-2026-11-09.md. All78tests and6syntax checks passed. All sources/logs/measurements/results saved. Production source hashes unchanged. No integration/review/publication.
