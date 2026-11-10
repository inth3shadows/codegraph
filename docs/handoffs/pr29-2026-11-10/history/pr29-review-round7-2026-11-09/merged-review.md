

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
