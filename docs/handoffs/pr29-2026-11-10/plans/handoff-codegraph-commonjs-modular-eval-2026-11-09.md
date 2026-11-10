# CommonJS modular fix: final correction verified locally, final review pending

Authoritative checkpoint, 2026-11-09. User requested status after authorizing related defect corrections using smaller modules. No outward action has happened. Preserve original stopped/uncommitted T0 pilot.

## Implementation checkout

- /tmp/codegraph-cjs-missing-fix-20261108, branch fix/commonjs-missing-member
- HEAD 559c76df6afd9e40f4d617ff77caa7db4ad03955; original base 5e0664891af0e87e6fd18bbfa16cab39237570f5 (em.40)
- Six uncommitted source paths: package.json, package-lock.json, src/resolution/commonjs-export-members.ts, src/resolution/name-matcher.ts, __tests__/commonjs-export-members.test.ts, __tests__/js-default-binding-members.test.ts. New files have intent-to-add so git diff includes them.
- Personal origin https://github.com/inth3shadows/codegraph.git. Identity previously verified Eric Minish / eric.minish@gmail.com; recheck before committing.
- No source push, fix PR, merge, deployment, npm/tag or official upstream report. Live em.40 unchanged.

## Review and fix status

Fourth dual native review cleared F3 stale sync, F4 genuine aliases and F5 inaccessible class scope; found F6 raw source collecting fake exports from comments/strings/regex/unrelated objects.

F6 modular correction uses isolated readCommonJsExportMembers with exact production js-tokens9.0.1 (CommonJS with types), a small matcher adapter and independent unit tests. No changes to previous sync/scope fixes. Fifth fresh read-only native reviewers review_broad_commonjs_modular5 and review_adversarial_commonjs_modular5 both completed and cleared F6 plus previous invariants and packaging. They found F7: eval with template literal or parenthesized bare callee drops real exported aliases. Evidence /tmp/codegraph-cjs-adversarial5-eval.{cjs,log}. Single-quoted bare eval control works.

F7 correction stays only inside the reader: unwrap grouped bare callee/arguments and accept StringLiteral, NoSubstitutionTemplate and TemplateHead. No execution of eval. Added4 unit cases and2 graph positives; class method named eval remains ignored. Fail-before6FAIL85PASS; final2files91PASS. Explicit npm run build EXIT0, viewer/29grammar/runtime/engine checks pass. git diff --check passed. F7 correction has NOT had independent review or final full-suite run. Do not claim final review clearance or ready to merge.

## Verification

Before final F7 correction: expanded18files260PASS1SKIP; full873filesPASS19SKIP,10650testsPASS2expectedFAIL448SKIP0unexpectedFAIL,780.27sec. This full pass predates F7 correction. Final F7 focused91PASS and normal build PASS. No test/build processes remain from this checkpoint.

Logs /tmp/codegraph-cjs-modular-{expanded-final,full,sixcases}.log and /tmp/codegraph-cjs-modular-eval-{before,after,build}.log. Node22.22.2, CODEGRAPH_KERNEL=0/WASM; no native validation claim. Vitest4.1.11: use --maxWorkers=4, not --minWorkers.

## Durable recovery and next step

Primary ledger /tmp/codegraph-cjs-missing-fix-20261108/.review/commonjs-missing-member.md. Durable source/patch/hash/log backup in original QA workspace .review/commonjs-fix-2026-11-08/modular-eval-2026-11-09/. Previous corrections-2026-11-09/commonjs-fix.bundle recovers both local parent commits against original5e base. Cumulative.patch in new backup includes all current code relative5e. Do not commit private .review.

Remaining: final F7 verification and full suite on unchanged final tree, then local commit after repo/remote/identity/staged diff checks. User has asked for confirmation before subsequent steps; do not turn status into publishing authorization. Review rounds are already fifth: use existing ledger honestly, no gate resets or control-file changes. If another round is approved, two fresh read-only native lanes, minimal fork_turns=none, exact Git target and ledger, bounded F7 verification plus invariants, no redundant full runs by reviewers. Respect any gate denial; stop and ask as applicable. Do not claim Claude-only /code-review ran.

Tuesday Nov10 upstream report remains conditional on actual verification and duplicate check. Personal codegraph issue27 is CommonJS. Issue26 is separate external import bug, outside this fix. QA repo PR27 is first-bug evidence, not source fix. Preserve original T0 and all deploy/control worktrees.
