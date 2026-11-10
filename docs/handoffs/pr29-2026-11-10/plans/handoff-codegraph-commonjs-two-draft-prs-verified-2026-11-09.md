# Two CommonJS draft PRs published and execution-tested; follow-up review pending

Authoritative2026-11-09. Supersedes two-draft-prs-testing/running/F8blocked checkpoints. User explicitly requested commit/push/currentPR and separating remaining correction. Completed exactly those two PRs; no merge/deploy/upstream report.

## Published branches and PRs

- https://github.com/inth3shadows/codegraph/pull/28 DRAFT, base main5e0664891af0e87e6fd18bbfa16cab39237570f5(em.40), head fix/commonjs-missing-member at5d384989957c91b482068b306535437915a0595b. Preserves exact pre-followup snapshot, including known F8. Three commits: d18e4097 namespaceguard,559c76df sync/alias/scope corrections,5d384989 modular tokenizer/exportreader and F7 evalforms. PR28 body explicitly links follow-up29 and says hold merge.
- https://github.com/inth3shadows/codegraph/pull/29 DRAFT, base fix/commonjs-missing-member5d384989, head fix/commonjs-eval-callee-context at87576a8d9ff0d8aba235db5535f5f4429f14b037. Only3files29addedlines. Corrects F8 wrapper/callee grouping distinction, with focused regression tests and no matcher/sync/scope changes. Both remoteheads rechecked exact. Both unmerged; do not markready or merge without next user decision.

Implementation checkout /tmp/codegraph-cjs-missing-fix-20261108 currently branch fix/commonjs-eval-callee-context at87576a8d. Trackedtreeclean, private .review untracked. Personal origin https://github.com/inth3shadows/codegraph.git; identity Eric Minish/eric.minish@gmail.com verified before commits/pushes. No AI attribution/private .review committed. Original QA T0pilot remains stopped/uncommitted/untouched, HEAD729da1b and existing dirtyfiles unchanged. Live em.40 unchanged.

## Actual verification on final87576a8d

Fail-before F8 regressions8FAIL92PASS; tagged-callee follow-up1FAIL49PASS. Final2files101PASS. Explicit npm run build EXIT0, viewer/29grammars/runtime checks PASS. Full normal CODEGRAPH_KERNEL=0 npm test -- --maxWorkers=4 session62594 completed EXIT0:873filesPASS19SKIP;10666testsPASS2expectedFAIL448SKIP0unexpectedFAIL;800.20seconds. Finalsource hashes match frozen/tested snapshot; trackedtreeclean. Logs /tmp/codegraph-cjs-eval-followup-{before,tag-before,focused,build,full}.log. Node22.22.2/kernel0WASM; no native validation claim. No test/build/reviewer processes remain from this phase. No reason to rerun full/build unless code changes or a new failure/concern warrants it.

## Review boundary

Sixth native dual review completed on prior5d384989 snapshot and found F8: wrap(eval)("ignored") and wrap((eval))(("ignored")) wrongly mark knownnamespace uncertain, allowing named.missing() to call decoy.js:Decoy::missing. Both lanes cleared genuine template/grouped eval controls; broad found F8. The87576a8d correction has NOT had independent dual review. Do not call tests a review clearance. No seventh agents were launched, so no extra review quota spent in this phase. User can point separate agent directly at PR29, exact target `gh pr diff 29 -R inth3shadows/codegraph` (base5d384989..87576a8d). Full primary diff is PR28, and primary must integrate follow-up before main.

If user authorizes next review, fresh read-only native review_broad_* and review_adversarial_* with exact Git/PR target and ledger. Minimal-context briefs, preserve round count6/sharedgate; no resets or protected control edits. No unapproved additional review/correction loops; stop/ask if actual gate denies. Small follow-up ledger /tmp/codegraph-cjs-missing-fix-20261108/.review/commonjs-eval-callee-context.md points to full history .review/commonjs-missing-member.md. Preserve true grouped direct eval, templates, return expressions, inert text/method definitions and no decoy calls for eval merely passed to wrappers; previous alias/sync/scope/Python invariants remain. No full/build reruns by reviewers on unchanged code. Do not claim Claude-only /code-review ran.

## Durable recovery

Original QA .review/commonjs-fix-2026-11-08/two-draft-prs-2026-11-09/ has current3sourcefiles, ledgers, followup.patch, both-branch VERIFIEDgitbundle(codegraph-cjs-two-prs-20261109.bundle; requires base5e), frozen hashes, red/green/build/full logs, verification.json and checksums.json. running.json explicitly updated completed. Parent source/patch/evidence adjacent backups. Both branches now recoverable from GitHub. PR29 body has exact final suite/build/counts and independent-review-pending notice. Both PR bodies link dependency. Nothing lost if /tmp disappears.

Next user decision is review/merge workflow, not more unasked feature work. Safest sequence: review small PR29, integrate into PR28 branch, then assess final parentPR for main. Do not merge/deploy automatically; per-step confirmation remains in force. TuesdayNov10 official upstream report still conditional on verification/duplicate check and user go-ahead; do not post now. Personalcodegraphissue27CommonJS; issue26 separate externalimportbug out of scope. QA PR27 is first-bug evidence and unrelated to sourcePR28/29. Preserve deploy and agent control worktrees.
