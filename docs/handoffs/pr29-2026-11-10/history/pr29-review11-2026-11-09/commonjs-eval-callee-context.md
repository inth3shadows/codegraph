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


## Eighth native review COMPLETED — AST correction NOT CLEARED

Both fresh read-only reviewers completed normally on frozen15-file87576a8d..workingtree correction. Both confirm no source edits/build/full reruns/control changes; source hashes unchanged. No final normalbuild/fullsuite run or commit/push. PublishedPR28/29 remain drafts at5d384989/87576a8d. Prior166focusedPASS1SKIP is true and covers original5reportedgraphcases, but does not clear new findings. Nativebinary absent, no nativeexecutionclaim. Parent uses actual reports, no independent duplicate repro/diffread.

### F10 — P2 — Optional contextual-keyword wrappers regress (adversarial)

Exact reviewer location src/extraction/commonjs-eval.ts:37. Valid CommonJS:

```js
exports.known = function known() {};
function yield(value) {
  return function ignore(code) {};
}
yield?.(eval)("ignored");
```

Runtime exports only known; eval is never invoked. Existing grammar reports parse error, helper returns null, reader marks exports uncertain, and named.missing() falsely calls unrelated decoy.js:Decoy::missing. Actual current correction calls:[decoy.js:Decoy::missing]; base87576a8dreader restored in memory calls:[], uncertain:false. Evidence /tmp/cg-a8-yield-optional.{cjs,log}, /tmp/cg-a8-yield-optional-base.{cjs,log}, /tmp/cg-a8-probe.cjs. New F8-adjacent regression introduced by AST correction. Unknown fact correctly avoids false absence proof but must not license false call targets; current fallback still does.

### F11 — P2 — Computed method names use enclosing scope (broad)

Exact reviewer location src/extraction/commonjs-eval.ts:51. Treats a computed method name as belonging to that method's function scope. Computed names execute in enclosing scope. Confirmed both directions:

1. `class Store { load(){return 42;} } function* setup(){ const obj = { [yield (eval)('exports.load = Store.prototype.load;')]() {} }; } setup().next();` Runtime exports load()->42, currentfactfalse/uncertainfalse, named.load() graphcalls[]. Ordinary computedmethodkey inside outergenerator suppressesgenuineeval.
2. `exports.known=function known(){}; function yield(value){return function ignore(code){return 'x';}} const obj={ *[yield(eval)("ignored")](){} };` Runtime keysonlyknown, currentfacttrue/uncertaintrue, named.missing() falselycallsDecoy::missing. Generator methodkeyevaluatesoutsidegeneratorbody, so yieldiswrapperhere.

One rootcause/twoexecutiontraces, evidence /tmp/cg-broad-pr29-ast8-computed-scope.{cjs,log}, executed againstcurrentdist with CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2. All15frozenhashesmatch.

### Stop boundary and saved state

Approved redesign progressed to166focusedPASS + real-worker/store/sync/factlifecycle integration, then focusedverifyfoundthese2P2. STOP before anothercorrectioncycle per dual-reviewworkflow/userper-stepconfirmation. Don't spendfullsuiteonknowndefectivecode orpushasready. Usermustdecidenextstep; noautomaticnewreview/fix/merge/deploy. Overallcount8, noreset. Nextremediationifapproved: computedmethodscope must excludecomputedkeys fromnewmethodscope; parseerrorunknown mustnotenableinventedfallbackcalls (requires explicitresolutionpolicy, not anotherkeyword/punctuationguess). Preserve all originalregressions and33ASTcontrols, truealiases/sync/scope/Pythonbehavior. No grammarfiles/schema/deps changed; source remains15dirtypaths, notcommitted. Durablebackup includes allsources/patch/logs andnewreviewevidence, verificationresult/checksums.


## F10/F11 corrections approved and execution-verified — independent verification pending

User explicitly answered yes to correcting the two eighth-review findings. Current HEAD87576a8d and15dirtysourcepaths retained; no newcommit/push/merge/deploy/grammar/schema/dependencychanges.

Fail-beforetests:2ASTcomputed-key cases,3graphfindingcases,positivealiascontrol andunknownparse syncstep. Actual2files6FAIL90PASS beforefix, /tmp/codegraph-cjs-ast-f10-f11-before.log EXIT1. Positive explicitcallablealias underunknownparsealreadyPASS beforefix, mustkeep.

F11fix: method_definition suppliesfunctionscope onlywhen calllieswithin ASTbodyorparametersregions. Computednames/decorators useenclosingscope; no newkeyword/punctuation guesses. Bothcomputedkey directionsfixed. F10fix: tokenizer resultrecords evalUnknown separatelyfromuncertain/namespace. Moduleinfo propagatesunknownflag, includingexistingforwarderspread. Themethod-nameguessgate stopsunprovenmatchesforunknown-evalexportswithoutclaimingnamespace/memberabsence; explicitwrittenmemberaliasesremainallowed, andearlierprovenreceiver/typepathsremainunchanged. UnknownASTfactstillnull, no falseparse-success/intrinsicproof. Existingmembertokenizer andfacts/hash/storelifecycleremainunchanged.

Expanded8files172PASS1SKIP EXIT0, /tmp/codegraph-cjs-ast-f10-f11-after.log, CODEGRAPH_KERNEL=0 CODEGRAPH_PARSE_WORKERS=2. Coversallprevious166checks plusnewcomputed-keyAST/graphcases,optionalcontextualwrapper,realexplicitcallablealiasunderunknownparse,andfreshindex-v-syncincludingknownactualeval->unknownwrapper->actualeval transitions. One skip is nativekerneltransport; nativebinarynotstaged,no nativeexecutionclaim. A matchercommentclarifyingunproven-callpolicyupdatedaftertest; no behaviorchangedafterthispassingrun. gitdiff--checkPASS. No explicitnormalbuild/fullsuite oncurrentcorrection; old10666fullPASSbelongs875only.

Currentcorrectionvsround8snapshot changes5files: ASThelper,exportreader,matcher,ASTtest,graphintegrationtest. Durablebackup originalQA .review/commonjs-fix-2026-11-08/ast-f10-f11-corrected-2026-11-09/ includesall15sourcefiles,currentSHA256,cumulativepatchrelative875,small5filedeltafromround8,fail-before/passafterlogs,verificationmetadata. F10/F11 statusCORRECTED+focusedPASS, NOTindependentlycleared. Overallreviewcount8unchanged,noround9agentslaunched. Userper-stepconfirmationrequiresdecisionbeforefreshfocusedverify; don'tspendnewfull/reviewcycleunasked. No sourcecommit/pushyet; PR28/29remainDRAFT/unmerged. Ifuserapprovesnextreview: exactGitdiff875..workingtree +round8delta/sameledger, freshread-onlynativebroad/adversarial, boundedprobesonly,norepeatfull/build. Respectactualgate/noreset. Runfinalnormalbuild/fullonceonlyafterreviewstable. PreserveT0stopped/uncommitted; liveem40unchanged; noofficialupstreamwrite.


## Ninth native focused verification explicitly authorized and running

User answered yes to next focused dualreview. Fresh READONLY review_broad_pr29_f10_f11_9 and review_adversarial_pr29_f10_f11_9 launched together with exact87576a8d..workingtree15path target, thisledger andsmall5filedelta fromround8. Source matches172focusedPASS snapshot except documentedcommentonlychange, hashmatchesdurablecorrectedbackup. BothreviewclaimsremainPENDING; do notclaimclearance. No sourcechanges/build/fullsuite orpublishingauthorized bythisreviewonlyturn. Source staysfrozen; no gate resets/controlchanges. Parentwillgatherbothactualreports,mergefindings/saveandstop.


## Ninth native focused verification completed — F10/F11 cleared, F12 remains

User explicitly authorized thisverificationround. Both fresh read-only lanes review_broad_pr29_f10_f11_9 and review_adversarial_pr29_f10_f11_9 COMPLETED normally on same87576a8d..workingtree15path target and sameledger. Source hashes stillmatch approvedcorrectedsnapshot; no sourceedits/rebuild/fullsuite/controlchanges/networkwritesbyreviewers. No sourcecommit/push/merge/deploy. BothpublishedPRsremaindraftunchanged.

F10/F11 originals independently CLEARED by BOTH: optionalcontextualwrapper nofalsecall; computedkeygenuineevalinsideoutergenerator keepsStore::load; generatormethodkeynongeneratorwrapper nofalsecall. Broad11runtime-backedprobesPASS includingclass/nestedcomputedkeys,generator/nongeneratorbodies,explicitcallablealiasunderunknownfactandgenuineevalcontrols. Evidence /tmp/cg-broad-pr29-ast9-verify.{cjs,log}. Adversarial also confirmsnestednongenerator/gettercomputedkeycontrols. ThesecontrolsdoNOTclearrootwhole-valueexportsbelow.

### F12 — P2 — Unknown eval facts suppress genuine root exports (adversarial)

Exact reviewer location src/resolution/name-matcher.ts:25403. Valid m.js:

```js
class Store { load() { return 42; } }
module.exports = { load: Store.prototype.load };
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");
```

Caller const named=require('./m'); function run(){named.load();}. Runtime named.load() returns42; currentindexcalls:[]. Readerrecordsnomembersfortherootobjectassignment; newevalUnknowngatedropsthegenuinecallablealias. module.exports=new Store() reproduces too. RemovingONLYnewevalUnknownconditioninmemoryrestoresm.js:Store::loadforbothidenticalinputs. Directexports.load=Store.prototype.loadcontrolstillpasses. ThisisNEWregressionintroducedbyF10correction. Evidence /tmp/cg-a9-root-export-regression.cjs, /tmp/cg-a9-root-export-current.log, /tmp/cg-a9-root-export-oldgate.log. Broadclearedlimitedcontrolsbutdidnotprobeequivalentrootexports; no contradictoryexecutionresult.

STOP/reportmergedfindingonly; useryesauthorizedfocuseddualverify, notanotherunaskedcorrectioncycle. OriginalF10/F11closedatthissnapshot; F12OPEN. No finalreviewclearanceorreadyformergeclaim. No explicitnormalbuild/fullsuiteoncurrentdirtyASTcorrection;172focusedPASS1SKIPremainsactualbutmissesF12. Old10666fullPASSbelongs875only. No test/build/reviewerprocessesrunning. Needuserdecisionbeforefix; preserveactualmodule-valueexportswhileblockingunprovedunknown-evalguesses, notanotherpunctuation/keywordheuristic. Overallcount9honest,noreset/gatebypass. Durableevidence/ledger/resultsavedunderoriginalQA .review/commonjs-fix-2026-11-08/pr29-review9-2026-11-09/; current15sourcefilespatchesremainin adjacentast-f10-f11-correctedbackup. T0/liveem40unchanged, noofficialupstreamwrite.


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


## Tenth native focused verification explicitly authorized and running

User answered yes to next focused dual review. Fresh read-only review_broad_pr29_f12_10 and review_adversarial_pr29_f12_10 launched on exact 87576a8d..workingtree target, same ledger and saved four-file F12 delta. All 15 source hashes match focused-tested F12 checkpoint. Both results PENDING. No source changes, rebuild, full suite or publication in this review-only phase. Completed review count remains 9 until results arrive; no resets or gate bypass. Parent will merge actual reports, save checkpoint and stop.


## Tenth native focused verification completed — original F12 clears; F12 variants and new F13 remain

User explicitly authorized this focused review. Both fresh read-only lanes review_broad_pr29_f12_10 and review_adversarial_pr29_f12_10 completed normally against exact git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- . and the same ledger / saved F12 delta. All 15 source hashes match the focused-tested F12 snapshot. No source edits, rebuild, fullsuite, commits, pushes, merge, deploy or gate reset. Parent merged actual reports without duplicate probes/source re-audit.

Both independently CLEARED original F12 unparenthesized root object/instance, original F10 optional wrapper, and both F11 computed-key directions. Original passing examples do not clear adjacent syntax/scope findings.

### F13 — P2 — Shadowed module writes disable the unknown-eval guard (adversarial)

Exact location src/resolution/commonjs-export-members.ts:75, gate name-matcher.ts:25403. Concrete input:

```js
exports.known = function known() {};
function pretend(module) { module.exports = {}; }
pretend({});
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");
```

Caller const named=require('./m'); function run(){named.missing();}, unrelated export class Decoy { missing() {} }. Actual CommonJS exports only known; missing undefined. Current graph incorrectly calls decoy.js:Decoy::missing. Reader records exportForm:value/evalState:unknown from local parameter's module.exports assignment, bypassing unknown-eval guard. Block-local and arrow parameter variants reproduce. Loading both saved pre-F12 source files in memory yields calls[] on identical inputs, proving NEW regression in latest correction. Evidence /tmp/cg-a10-boundary.{cjs,log}, /tmp/cg-a10-before-loader.cjs, /tmp/cg-a10-boundary-before-source.log, /tmp/cg-a10-shadow-runtime.log.

### F12 — P2 — F12 remains for equivalent whole-value assignment syntax (broad)

Exact location src/resolution/commonjs-export-members.ts:75, gate name-matcher.ts:25403. class Store { load() { return 42; } }; (module.exports) = new Store(); function yield(v){return function ignored(){}} yield?.(eval)("ignored"); with named.load() returns42 at runtime but graph calls[]. Reader expects = immediately after module.exports, records opaque and suppresses call. Parenthesized root object and module.exports &&= new Store() reproduce. Removing only optional wrapper restores Store::load. Direct/forwarded imports both fail; fresh/sync agree, removing wrapper during sync restores edge and typeFrom. This is incompletely corrected F12, not a demonstrated NEW regression in latest correction. Broad evidence /tmp/cg-broad-pr29-f12-10.{cjs,log} (28 runtime/graph probes), /tmp/cg-broad-pr29-f12-10-sync.{cjs,log} (12 asserted sync/fresh comparisons).

STOP/report both P2 findings. No fix or new review authorized by this yes-to-review turn. Review count10 completed honestly, no resets. Prior 241 focused PASS /1native SKIP remains actual but misses these cases. No final normal build/fullsuite on dirty AST revision; no native-kernel execution claim. PR28/29 stay draft/unpublished current correction; T0/live/control/deploy files untouched. Sources remain 15 dirty paths on HEAD87576a8d. Preserve checkout and all work.

Durable review evidence: original QA .review/commonjs-fix-2026-11-08/pr29-review10-2026-11-09/ includes broad/adversarial reports, merged-review.md, completed review-status.json, source hashes, scripts/logs, and ledger. F12 before/after source backups/cumulative+delta patches remain adjacent pr29-f12-2026-11-09/. New handoff /home/ericm/.codex/plans/handoff-codegraph-pr29-review10-two-findings-2026-11-09.md.


## Shared production export evidence integrated — focused verification complete

User said "ok run it" after clarification that integration remained unfinished. Authorized production implementation in preserved checkout; no new review or publication in this turn. New binding-aware source record is now used by import resolution and the name-matching guard. F12 equivalent assignments and F13 export/caller shadowing corrected + focused tested, NOT independently cleared. Overall review count remains10.

Implementation: src/resolution/commonjs-export-evidence.ts uses established TypeScript checker.resolveName binding identities and type/member declaration selectors. It handles structural parenthesized/bracket/logical assignments, direct callable aliases, exported class/object/instance members, relative forwarding, and direct literal eval analyzed in its lexical context by a synthetic arrow body. This records static potential relationships without generator execution; genuine F11 generator eval passes beside unrelated methods. Local module/exports/eval bindings and caller parameters/classes are distinguished. Unknown behavior supplies no target. Selector ranges map only to indexed declarations, no global name guess.

The source-hash/versioned record is computed lazily during resolution, memoized by context/file/source, and cleared with resolver caches. No new metadata writer/schema/grammar. Import resolver's CommonJS default regex is replaced by record consumption. All CJS positive member targets resolve through the record before fallback; a CJS binding cannot authorize a global method-name guess. Early import edges preserve typeFrom source/forwarder dependencies. Existing AST eval fact pipeline and tokenizer unit helper were preserved; tokenizer is no longer the production fallback authority. Extraction's existing export-name helper remains node naming, not authorization of these call targets.

TypeScript5.9.3 is promoted from development to runtime dependency (^5.9.3); package lock refreshed offline, npm ls --omit=dev confirms presence. Compiler is required only when analyzing source, not by loading the helper/library/read CLI. Final7lazy tests outside sandbox PASS (same known Node child-pipe EPERM reason as earlier runs).

Actual verification history:14newgraph regressions FAIL before;14PASS after first integration. Expanded10files initially236PASS30FAIL1SKIP from missing dependency metadata (stale sync), object-method node-kind mapping and parenthesized eval arguments; corrected to266PASS1SKIP. Neighbors initially356PASS2FAIL (caller parameter/class shadowing); added compiler-bound call-site receiver facts. Final combined19files624PASS1SKIP, /tmp/codegraph-pr29-evidence-integrated-focused.log. Final7lazyPASS, /tmp/codegraph-pr29-evidence-lazy-final.log. Distinct final631PASS1SKIP over20files. Test setup ran tsc/assets, viewer build/check succeeded earlier. git diff --check PASS. No standalone final npm run build/fullsuite on this revision; deferred to stable review per existing boundary. Native parity skipped because binary absent, no native execution claim.

Small production-collector measurement: module load8.23ms with compilerLoadedBeforeAnalysis:false; cold first analysis277.01ms, heap delta17.70MiB;25warm samples median1.65ms (147byte value fixture),2.37ms (152byte generator eval). These are toy collector measurements, not actual large-project indexing, query latency, cache or worker benchmarks.

CurrentHEAD87576a8d, branchfix/commonjs-eval-callee-context.22dirtypaths total, new3files intent-to-add for review only; no sourcecommit/push/merge/deploy. Integration phase changed9paths: shared source module, import resolver, name matcher, two new test files, default-binding graph tests, lazy test, package.json/lock.13of15prior dirty source paths remain byte-identical; two intentionally extended. All22final hashes saved/verified. T0/live/deploy/control files untouched.

Durable backup: originalQA .review/commonjs-fix-2026-11-08/pr29-export-evidence-integration-2026-11-09/ contains baseline before/, milestone1/2 source snapshots/hashes, final-source/ all22files, source-sha256.json, cumulative-from-875.patch, integration-from-round10.patch, actual red/green/failure/lazy logs, production measurement script/output, results.json/progress.json. STOP and ask before fresh focused dual review; do not auto-review/fix/publish. Final normal build/fullsuite once after stable clearance. Latest handoff /home/ericm/.codex/plans/handoff-codegraph-pr29-export-evidence-integrated-2026-11-09.md.


## Eleventh native focused verification explicitly authorized and running

User answered yes to the next focused dual review. Fresh read-only review_broad_pr29_evidence_11 and review_adversarial_pr29_evidence_11 launched on exact 87576a8d..workingtree22-file target, same ledger and integration-from-round10.patch. All22source hashes match the631focusedPASS/1nativeSKIP snapshot. Both results PENDING;10rounds completed until reports arrive. No source changes, rebuild, fullsuite, publication or gate resets. Parent will merge actual results, preserve artifacts and stop for user decision.


## Eleventh native focused verification complete — F10–F13 clear, new F14/F15 open

Both user-authorized read-only lanes review_broad_pr29_evidence_11 and review_adversarial_pr29_evidence_11 completed normally against exact git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 87576a8d9ff0d8aba235db5535f5f4429f14b037 -- . and the same ledger/integration delta. All22source hashes match focused-tested snapshot. No source/build/fullsuite/commit/publication/gate changes. Parent merged actual reports without duplicate source reading/probes.

Both independently CLEARED original F10/F11/F12/F13, including true generator eval, optional wrapper, parenthesized/logical whole exports, local wrapper shadowing. Broad11asserted AST and12asserted sync/fresh controls pass. Prior631focusedPASS1nativeSKIP is actual but misses new findings.

### F14 — P2 — Preserve explicit property aliases on a whole exported local value (broad)

Exact location src/resolution/commonjs-export-evidence.ts:226. Valid m.js: class Store { load() { return 42; } }; const api = {}; api.load = Store.prototype.load; module.exports = api; Caller named.load() runtime42, current graph[], record.members{}. Before integration, identical source resolves Store::load/typeFrom[m.js]. Class Factory.load and function Factory.load alias variants independently fail-after/pass-before. Collector discards writes on local receivers, and the wrapped compiler type does not supply those assigned properties. This is an introduced loss of correct relationship, not permission to restore global guesses. Report/replay: /tmp/cg-broad-pr29-evidence11-report.md and /tmp/cg-broad-pr29-evidence11-artifacts/ (durably copied below).

### F15 — P2 — Do not emit calls to exported non-callable values (adversarial)

Exact location src/resolution/import-resolver.ts:3430, classification commonjs-export-evidence.ts:148-156/309-313. m.js const value=42; exports.load=value; caller named.load(). Runtime TypeError (not a function), current graph run→m.js:value constant; before calls[]. String-valued object-export variant reproduces. Valid supporting variant function real(){return 42;}let value;value=real;exports.load=value; runtime42/current targets variable value instead of real; before has no target. Same kind:value declaration fallback, one finding. Preserve data imports/references while withholding unsupported call identity. Report/replay /tmp/cg-a11-final-report.md and cg-a11-* scripts/log/JSON.

Review count11 completed honestly, no resets. STOP before fixes/review/publication unless user authorizes. Final normal build/fullsuite not run; native binary absent, no parity claim. HEAD87576a8d,22dirtypaths preserved; PR28/29 publication unchanged. Durable originalQA .review/commonjs-fix-2026-11-08/pr29-review11-2026-11-09/ contains exact reports, merged-review.md, completed review-status.json,22source hashes, broad-artifacts/ including both baseline source files, adversarial-artifacts/ including scripts/logs/baseline import resolver and copied before name matcher. Some adversarial replay scripts hardcode original /tmp baseline paths; restore those saved files to their original paths or adjust only copied replay scripts if /tmp disappears. Actual source snapshots remain adjacent pr29-export-evidence-integration-2026-11-09/final-source/ and before/.

Latest user steering after review: "astra vs sol come up with diff plan?" Parent will obtain independent read-only design plans from Astra and Sol against these same findings; this authorizes planning/comparison, not code or another review. Preserve source.
