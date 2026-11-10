# PR29 F12 correction complete; focused verification done, review pending


## F12 correction approved and focused verification complete — 2026-11-09

User explicitly approved the focused F12 correction after reading the session-end handoff. Existing checkout/HEAD 87576a8d and all 15 dirty source paths preserved; only two source files and their two tests changed from review 9. No commits, pushes, new review, merge, deploy, grammar/schema/dependency or extraction/storage changes.

Added both runtime-backed F12 regressions FIRST: root object callable alias and new Store() under optional yield wrapper return 42 at runtime but graph calls are empty. Actual 2 FAIL / 61 SKIP, /tmp/codegraph-pr29-f12-red.log, exit 1. Expanded pre-fix reader/graph contract: 33 FAIL / 136 PASS, /tmp/codegraph-pr29-f12-matrix-red.log, exit 1.

Reader now records exportForm (namespace/value/opaque) independently from evalState (present/absent/unknown); replaces the prior evalUnknown flag. Explicit members remain property writes, never a whole-value inventory. Any syntactically stated whole module.exports assignment retains existing value resolution; escapes/mixed writes do not erase that evidence or claim a final member inventory. Namespace absence still requires !uncertain. Inconclusive eval only gates unproven method guesses when no stated whole value is present; explicit property aliases and confirmed eval behavior stay intact. Forwarders propagate the summary through existing spread, and existing typeFrom dependencies remain intact.

Tests cover namespace/direct alias/root object/instance x eval absent/present/unknown, direct and forwarded imports; runtime values and typeFrom metadata asserted. Added fresh-v-sync transitions across both axes, bracket/mixed assignments, opaque reader controls; all prior F10/F11 tests retained unchanged.

Actual verification:
- First two-file green: 169 PASS, /tmp/codegraph-pr29-f12-matrix-green.log, exit 0. Test setup successfully ran tsc + copied assets for current source.
- Expanded ten-file run after final four bracket/mixed graph tests: 235 PASS / 1 SKIP / 6 FAIL, /tmp/codegraph-pr29-f12-focused.log, exit 1. All six failures were lazy-engine child stdout empty. Independent minimal spawnSync probe reproduced EPERM for piped Node child output even when the child simply prints 42; file output works. No source/test workaround added.
- Approved sandbox escalation reran ONLY lazy-engine.test.ts outside sandbox: 6 PASS, /tmp/codegraph-pr29-f12-lazy-unsandboxed.log, exit 0.
- Combined distinct final checks: 241 PASS / 1 SKIP over 10 files. Skip is native-kernel parity (binary not staged); no native execution claim. git diff --check PASS. No final normal npm run build/fullsuite on dirty AST revision; these remain deferred until stable independent review per user handoff. No tests/build/reviewer processes running.

F12 status: CORRECTED + focused verified, NOT independently cleared. Overall review count remains 9; no gate resets or new agents. STOP and ask before fresh focused dual review, as requested. Proposed two-commit structure stays pending; nothing staged/committed/published. PR28/29 draft state not changed. T0/live/deploy/control files untouched.

Durable backup: original QA .review/commonjs-fix-2026-11-08/pr29-f12-2026-11-09/ contains before/after copies of all 15 dirty source files, hashes, cumulative-from-875.patch, f12-correction.patch, actual red/green/failure/rerun logs and verification.json. Plan: /home/ericm/.codex/plans/plan-codegraph-pr29-f12-2026-11-09.md. Next factual checkpoint: /home/ericm/.codex/plans/handoff-codegraph-pr29-f12-focused-2026-11-09.md.

Read session-end handoff for publication/identity boundaries. User approval covered this correction and focused tests, not a new review or publication. Next: ask for fresh native broad/adversarial focused verification of 87576a8d..workingtree, exact target and same ledger, plus saved F12 delta. Do not duplicate parent probes or run full suite before stable review clearance. Current HEAD remains 87576a8d9ff0d8aba235db5535f5f4429f14b037, branch fix/commonjs-eval-callee-context. Do not reset/clean or replace the checkout.
