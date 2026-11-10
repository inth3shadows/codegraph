# PR29 round11 complete; F14/F15 open, Astra/Sol planning requested


## Eleventh native focused verification complete — F10–F13 clear, new F14/F15 open

Both user-authorized read-only lanes review_broad_pr29_evidence_11 and review_adversarial_pr29_evidence_11 completed normally against exact git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- . and the same ledger/integration delta. All22source hashes match focused-tested snapshot. No source/build/fullsuite/commit/publication/gate changes. Parent merged actual reports without duplicate source reading/probes.

Both independently CLEARED original F10/F11/F12/F13, including true generator eval, optional wrapper, parenthesized/logical whole exports, local wrapper shadowing. Broad11asserted AST and12asserted sync/fresh controls pass. Prior631focusedPASS1nativeSKIP is actual but misses new findings.

### F14 — P2 — Preserve explicit property aliases on a whole exported local value (broad)

Exact location src/resolution/commonjs-export-evidence.ts:226. Valid m.js: class Store { load() { return 42; } }; const api = {}; api.load = Store.prototype.load; module.exports = api; Caller named.load() runtime42, current graph[], record.members{}. Before integration, identical source resolves Store::load/typeFrom[m.js]. Class Factory.load and function Factory.load alias variants independently fail-after/pass-before. Collector discards writes on local receivers, and the wrapped compiler type does not supply those assigned properties. This is an introduced loss of correct relationship, not permission to restore global guesses. Report/replay: /tmp/cg-broad-pr29-evidence11-report.md and /tmp/cg-broad-pr29-evidence11-artifacts/ (durably copied below).

### F15 — P2 — Do not emit calls to exported non-callable values (adversarial)

Exact location src/resolution/import-resolver.ts:3430, classification commonjs-export-evidence.ts:148-156/309-313. m.js const value=42; exports.load=value; caller named.load(). Runtime TypeError (not a function), current graph run→m.js:value constant; before calls[]. String-valued object-export variant reproduces. Valid supporting variant function real(){return 42;}let value;value=real;exports.load=value; runtime42/current targets variable value instead of real; before has no target. Same kind:value declaration fallback, one finding. Preserve data imports/references while withholding unsupported call identity. Report/replay /tmp/cg-a11-final-report.md and cg-a11-* scripts/log/JSON.

Review count11 completed honestly, no resets. STOP before fixes/review/publication unless user authorizes. Final normal build/fullsuite not run; native binary absent, no parity claim. HEAD87576a8d,22dirtypaths preserved; PR28/29 publication unchanged. Durable originalQA .review/commonjs-fix-2026-11-08/pr29-review11-2026-11-09/ contains exact reports, merged-review.md, completed review-status.json,22source hashes, broad-artifacts/ including both baseline source files, adversarial-artifacts/ including scripts/logs/baseline import resolver and copied before name matcher. Some adversarial replay scripts hardcode original /tmp baseline paths; restore those saved files to their original paths or adjust only copied replay scripts if /tmp disappears. Actual source snapshots remain adjacent pr29-export-evidence-integration-2026-11-09/final-source/ and before/.

Latest user steering after review: "astra vs sol come up with diff plan?" Parent will obtain independent read-only design plans from Astra and Sol against these same findings; this authorizes planning/comparison, not code or another review. Preserve source.

See handoff-codegraph-pr29-export-evidence-integrated-2026-11-09.md for implementation/dependency/test details and session-end handoff for identity/publication boundaries. Do not fix or run another review automatically.

## Astra/Sol comparison complete
Both user-requested independent plans completed read-only. Both converge on binding-owned values/property slots, independent callable identity and bounded def-use; TypeScript binder/eval adapter retained. Recommended Sol result contract plus Astra uncertainty/stop rules. Plans/comparison saved in ~/.codex/plans and durable review11backup. Latest comparison: /home/ericm/.codex/plans/compare-astra-sol-pr29-export-contract-2026-11-09.md. Source22hashes unchanged. User decision required before new contract spike or production edits; planning request was not implementation approval.
