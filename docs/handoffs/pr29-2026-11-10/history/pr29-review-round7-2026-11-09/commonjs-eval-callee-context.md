# Separate F8 follow-up (review round count remains six)

User explicitly authorized committing/pushing current work to a PR and separating remaining correction. Current snapshot committed5d384989957c91b482068b306535437915a0595b, pushed fix/commonjs-missing-member, DRAFT https://github.com/inth3shadows/codegraph/pull/28 against main. KnownF8 documented, not ready to merge alone. No deploy/merge/upstream report.

New branch fix/commonjs-eval-callee-context based on5d384989. Exact prospective Git target: git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 5d384989957c91b482068b306535437915a0595b -- src/resolution/commonjs-export-members.ts __tests__/commonjs-export-members.test.ts __tests__/js-default-binding-members.test.ts

F8 reviewer finding and prior invariants remain in .review/commonjs-missing-member.md; do not reset shared gate/round count. Two sixth reviewers completed; broad demonstrated F8 despite adversarial clearing intended F7 cases. This follow-up has NOT had independent dual review yet.

Correction: distinguish grouping around bare eval from another function's argument list using token before parentheses. Wrapper identifier/call/member/optional-call/tag/control-condition prefixes must not mark exports uncertain. Grouped direct eval, literal/template arguments and expression prefixes such as return must keep prior behavior. Change limited to9helper lines plus independent unit and real-index graph regressions; no matcher/sync/scope changes.

Before fix8FAIL92PASS; tag-result additional case1FAIL49PASS. Final focused2files101PASS, /tmp/codegraph-cjs-eval-followup-focused.log. Build/full pending. Hashes /tmp/codegraph-cjs-followup-frozen.json. Logs /tmp/codegraph-cjs-eval-followup-{before,tag-before,focused,build}.log. Need staged exact3-file diff, personal repo/identity and actual build result before commit/push. Full normal suite required before readiness claim. Keep follow-up draft and explicitly state review pending. No additional reviewer agents launched in this follow-up; user plans to point agents at PRs.

Keep both PRs draft. Follow-up base should be fix/commonjs-missing-member, producing only the small correction diff. Review/merge follow-up into parent branch before considering parent PR for main; no merge authorized by current request. Preserve original T0 pilot and all deploy/control worktrees.

Published DRAFT https://github.com/inth3shadows/codegraph/pull/29, commit87576a8d9ff0d8aba235db5535f5f4429f14b037, base fix/commonjs-missing-member/PR28 at5d384989. Explicit buildPASS; normal full suite RUNNING session62594, /tmp/codegraph-cjs-eval-followup-full.log. Both pushed/draft, neither merged/deployed; follow-up independent review stillpending. Original T0 untouched.


FINAL execution verification2026-11-09: normal full suite session62594 EXIT0,873filesPASS19SKIP,10666testsPASS2expectedFAIL448SKIP0unexpectedFAIL,800.20sec. /tmp/codegraph-cjs-eval-followup-full.log. 101focusedPASS and explicit buildPASS on same87576a8dsource. Final3changed-file SHA256 checks PASS, trackedtreeclean; actual remoteheads rechecked5d384989(PR28) and87576a8d(PR29). PR29 body updated with exact final validation. Both PRs still DRAFT/unmerged; no deployment/upstream write. FOLLOW-UP INDEPENDENT REVIEW STILL PENDING: do not conflate fullsuite with review clearance. No further tests/build/review processes running. Saved final checkpoint and full log under original QA two-draft-prs backup.


## Seventh native review explicitly requested — PR29 — 2026-11-09

User invoked /dual review29. Exact GitHub base5d384989957c91b482068b306535437915a0595b and head87576a8d9ff0d8aba235db5535f5f4429f14b037 verified. Fresh read-only native lanes review_broad_pr29_round7 and review_adversarial_pr29_round7 launched together with same exact Git target and this ledger. Both focus full3-file29-line correction, F8 closure and nearby invariants; bounded execution probes only, no repeat full/build or source edits. Parent does not reread reviewed diff or duplicate reviewer probes. No review results yet; no independent clearance claim. Do not reset round count/gate, change source, push, merge or deploy in this review-only turn. Stop and report merged findings when both complete.


## Seventh native dual review result — PR29 — 2026-11-09

Both fresh read-only lanes completed normally: review_broad_pr29_round7 and review_adversarial_pr29_round7. Exact target remains5d384989957c91b482068b306535437915a0595b..87576a8d9ff0d8aba235db5535f5f4429f14b037. Source hashes verified unchanged, trackedtreeclean except private untracked.review. No source edits/build/fullsuite reruns/commits/pushes/GitHubcomments/merge/deploy. Both PRs remain draft. Current review DOES NOT CLEAR PR29 despite prior101focusedPASS/full10666PASS/buildPASS. Parent merges findings from actual final reports without re-verifying/re-reading diff.

### F9 — P2 — Preserve grouped direct eval in control-statement bodies (BOTH)

Broad location src/resolution/commonjs-export-members.ts:31: rejects any preceding ), including a completed if or for condition. Exact input `class Store { load() { return 42; } }
if (true) (eval)('exports.load = Store.prototype.load;');`. Runtime exports load() returning42, but current discovery uncertain:false and indexing named.load() produces no call. Removing only new prefix guard in memory restores uncertain:true and m.js:Store::load. Nested grouped eval in unbraced single-iteration for body reproduces too. Broad evidence /tmp/cg-broad-pr29-control-context.{cjs,log}; exact command `node --experimental-wasm-exnref --experimental-wasm-stack-switching /tmp/cg-broad-pr29-control-context.cjs`.

Adversarial independently confirms same location/trace; grouped-template if-body and for-body also reproduce. Evidence /tmp/codegraph-cjs-adversarial7-conditional-eval.{cjs,log}. De-duplicated as one P2 F9. This is a NEW regression introduced in PR29, not a pre-existing parent limitation.

### F8 — P2 — PARTIALLY CORRECTED, remains for contextual-keyword wrapper names (adversarial)

Exact reviewer location src/resolution/commonjs-export-members.ts:29 (whitelist:7). Valid CommonJS `function await(value){return function ignore(code){};} await(eval)("ignored");` passes eval without invoking it, but whitelist exemption produces uncertain:true and falsely resolves named.missing() to decoy.js:Decoy::missing. With exports.known=function known(){}, runtime exports only known; pre-F7 behavior restored in memory produces no call. yield reproduces too. Evidence /tmp/codegraph-cjs-adversarial7-contextual-wrapper.{cjs,log}. This is a RESIDUAL F8 variant, not a new unrelated parent re-audit. Do not label all F8 closed.

### Confirmed preservation / rulings

Both independently clear original F8 forms wrap(eval)("ignored") and wrap((eval))(("ignored")): runtime onlyknown, reader uncertain:false, no decoy call. Broad /tmp/cg-broad-pr29-f8-closure.{cjs,log}. Adversarial13runtime-backed graph controls pass (original2forms +11nearby controls), /tmp/codegraph-cjs-adversarial7-controls.log. True standalone grouped/template eval, return expressions, inert data/method declarations, call/member/optional/tag/condition-prefix negatives retain tested behavior. These controls do not answer F9 control-body context or F8 await/yield wrappers.

### Next boundary

Review-only user request is complete. STOP: no fixes, additional review loop, external review comment, markready, merge or deploy without user instruction. The per-step confirmation request remains in force. This is round7 overall; no gate/state reset. Repeated grouping-prefix patches now demonstrate syntax-context ambiguity: if user asks for remediation, choose an evidence-based smaller boundary/design instead of another unbounded keyword/punctuation whitelist. Preserve both concrete repros and all prior controls. Do not repeat fullsuite/build on unchanged source. Actual durable result/evidence/checksums saved in original QA .review/commonjs-fix-2026-11-08/pr29-review-round7-2026-11-09/.
