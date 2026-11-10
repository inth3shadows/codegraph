# CommonJS missing-member fix and dual review

User authorized implementing the remaining CommonJS method-fallback defect and dual review after no exact upstream report was found. Earlier merge/deploy request was conditional on a reviewed fix; complete and report the reviewed change before treating any deployment as ready. Official upstream reporting remains reserved for Tuesday after verification. Personal fork only; no public upstream writes.

Isolated repository: /tmp/codegraph-cjs-missing-fix-20261108, branch fix/commonjs-missing-member, base 5e0664891af0e87e6fd18bbfa16cab39237570f5. Fresh clone from inth3shadows/codegraph, fresh locked dependencies. Original QA T0 work stays stopped/uncommitted and untouched.

1. Add real SQLite regression cases for missing CommonJS/default members beside an unimported method, including receiver-name class collisions, forwarding, real exports, stated class/object/instance/callable defaults, lexical shadows and sync. Run before fix and retain actual outcomes.
2. Make the smallest resolver guard change after evidence-backed member resolution and before global method-name matching. Preserve import mapping semantics and actual default APIs. Add a user-facing changelog entry.
3. Run focused regression/invariant suites and normal build/full test suite with at most four workers. Installed Vitest4.1.11 does not accept the historical --minWorkers flag; use --maxWorkers=4. Use kernel0/WASM, matching deployed installation; document native-only skips.
4. Create private .review ledger with findings, invariants, commands and fix map. Launch fresh read-only review_broad_* and review_adversarial_* native agents on the exact same Git target and ledger; adversarial reviewer executes probes. Follow review gate. Do not claim Claude-only code-review skill ran. Resolve review findings within authorized fix scope, and launch fresh verification reviewers when remediation creates another target.
5. Save results and checkpoint in ~/.codex/plans. Before any commit/push, verify personal identity, remote, staged diff and tests. No unrelated resolver changes, no external-import issue26 fix, no T0 work. Stop on a missing authorization or mandatory review gate; ask before expanding scope.

Tracking issue: https://github.com/inth3shadows/codegraph/issues/27. Related upstream2952 closed and3162 merged addressed the earlier first-export variant. Evidence at original QA .review/commonjs-missing-export-2026-11-08/.
