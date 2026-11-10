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


## AST redesign approved and started — 2026-11-09

User explicitly approved AST redesign in PR29, said near usage max and asked for a resumable start, then said proceed. This revokes prior review-only stop for in-scope remediation; do not ask same approval on resume. Preserve per-step/user and actual gate boundaries for later merges/deployments. No grammar/runtime/dependency/database-schema changes, commits or pushes in this partial phase; PRs remain draft at prior heads.

Newgraph regressions FIRST:3control-body direct-eval variants(if string/template, for nestedgroups) +await/yield CommonJS wrappers,5FAIL51SKIP on current87576a8d. /tmp/codegraph-cjs-ast-red.log, EXIT1. This intentionally RED gate remains unchanged because integration pending.

New isolated src/extraction/commonjs-eval.ts reads existing SyntaxNode tree and checks actual call.function after unwrapping parenthesized_expression. Returns true for syntacticdirectevalcall(anyargument), false for provenabsence, null for parseerrors with no foundcall. New __tests__/commonjs-eval.test.ts loads existingJS/TS/TSXgrammars:33PASS, /tmp/codegraph-cjs-ast-helper.log EXIT0. Controls cover reports, grouped/interpolated eval, return, generatorfunctions/methods, nestednongenerator scope, eval inside yieldwrapper argument, inert data/methods/membercalls, JSX and malformedsource. Helper not wired to classifier/extraction yet. Existing lexical reader/EXPRESSION_PREFIX_WORDS unchanged for now. Do not claim F8/F9 closed, new full/buildpass or finalreview.

IMPORTANT new evidence: existingJSgrammar correctly models control-body eval and awaitwrapper but parses legal CommonJS yield(eval)(code) as yield_expression whose operand is a call on(eval), no parseerrors. ASTscope must distinguish nongeneratorwrapper from generator yield. Helper handles direct yieldoperand only via nearestfunction/generator/methodscope; nested true eval in yield(eval(code)) remains detected. Shapeprobe /tmp/codegraph-cjs-ast-shape-probe.{cjs,log}. Extractionreferenceprobe /tmp/codegraph-cjs-eval-reference-probe.{cjs,log} shows currentextractor emits callref eval for genuinecall AND synthetic yieldwrappercase. Consequently raw existing unresolved eval refs alone are insufficient. User was explicitly told this grammar limitation, not falsely assured all cases are parser-perfect. No grammarfiles changed.

Next integrate factualcallresult through existingextraction to resolver. Node has NO metadata field (onlyedges do); do not invent Node.metadata, abuse signature/selfedges/candidates, or introduce schema migration casually. ExtractionResult can carry optionalfact through workerclone; need native/deferred bypass parity. Main bulk parse pools only load grammars in workers; resolver cannot assume synchronous getParser is ready in main. Suggested project_metadata perfile/sourcehash transport or another small explicit extractioncontext capability; persist/refresh under same successfulstore lifecycle, cover storeworker and sync. Decide carefully before editing infrastructure. Resume must preserve all existing tests and5newred cases; unknown/missing/error facts must not masquerade as provenabsence. Keep existing export-member tokenizer and previous sync/scope/alias fixes intact; remove prefixheuristics only onceASTfacts actuallysupplied.

Saved current3sourcefiles, patchrelative87576a8d, hashes, red/green/probe logs under original QA .review/commonjs-fix-2026-11-08/ast-redesign-started-2026-11-09/. No tests/build/reviewers running at checkpoint. Newfiles intent-to-add only so diffincludes them, not readyforcommit. No fresh dualreviewagents this phase. Overall reviewcount7; do not reset gate/controlstate. Resume directly integration and targeted tests; fullsuite/build only after stablefix, fresh focuseddual review as authorized/actualgatepermits, no repetitivewholeprojectwork. OriginalT0stillstopped/uncommitted; liveem40 unchanged; no merges/deploy/upstream writes.


## AST integration execution-tested — verify round8 pending

User approved AST redesign with focused review before final fullsuite, then resumed. Current dirty correction target87576a8d..workingtree,15paths captured /tmp/codegraph-cjs-ast-frozen.json (allnewfilesintent-to-add). No sourcecommit/pushyet; publishedPR29still87576a8d. No grammar/runtime/dependency/schema changes.

Implemented AST fact in ExtractionResult and ephemeralFileRecord property; WASM computes from existingtree, native/deferred routes compute with existinggrammar; kernelmaterializer preservesfact. Allstorepaths carryFileRecord fact through existingwriter, upsertFile writes project_metadata commonjs_eval:<file> containingcontentHash/value. Nosecondwriter orNode.metadata. deleteFile removesfact. Coordinatorcontext acceptsboolean onlyonexact SHA256sourcehash. Missing/malformed/stale/nullfacts returnunknown, neverabsenceproof. Tokenreader removed literalEvalCall/EXPRESSION_PREFIX_WORDS, consults lazyASTfact atmostonceonlywhenbareevaltokenpresent; unknown staysconservative. Existingmembertokenizer/sync/typeFrom/scope unchanged. CHANGELOG alreadyrequiresre-indexafterupgrading(line56), which suppliesnewfacts; no legacyfactmigrationclaimed.

Original5newgraphregressionsRED5FAIL51SKIP beforeintegration. Initialintegratedrun blocked by compiler: hashContentisexportedfromextraction/index, notutils; corrected byusingexistingcreateHashcrypto inresolver (sameSHA256algorithm), no circularextractionimport. Then3files140PASS. AddedrealSQLite factlifecycle4cases(missing/malformed/null, hashstale/replace,rollbackwithfiletransaction, deletion) andfreshindex-vs-sync wrapper->if-eval->yield-wrapper->for-eval->wrapper sequence. Final8files166PASS1SKIP, /tmp/codegraph-cjs-ast-expanded.log, CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2; alsoincludesmemo/synccaches/lazy-engine. Nativebinarynotstaged(codegraph-kernel/prebuilds/linux-x64/codegraph-kernel.node absent); kerneltransporttestskipped. Do not claimnativeexecution. Enginecompiledbytestsetup,currentdistmatchesfrozen sources. No explicitfinalnormalbuild/fullsuiteorindependentreviewyet. Priorfull10666PASSbelongs87576a8donly.

Next eighthfreshnativeREADONLYlanes verify this correction, sameledger andexactGitdiff87576a8d..workingtree. Boundedruntimeprobes only, no fullsuite/build orsourcechanges. CheckF8/F9closure,generator-awareyieldworkaround, actualevalvswrappercallee, sourcehashfactlifecycle/workertransport/sync, previouscontrols. Do not re-audit unrelatedparentlimitations. Stop/reportifreviewfindsissues; do notresetgate/count orclaimClaude-onlyskill.
