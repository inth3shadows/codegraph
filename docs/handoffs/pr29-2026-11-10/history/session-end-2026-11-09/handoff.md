# Session end: CodeGraph PR29, F12 pending; exploration complete

Authoritative final handoff,2026-11-09. User explicitly ended this session and requested a command starting a NEW Codex session with proper setup. No scheduled/automatic resume. New session should read this and the two linked plans, summarize the next step and ASK before implementation: latest /explore recommendation has NOT been approved. Don't mistake end-session request for authorization to fix/commit/push/merge/deploy. Preserve all current work.

## Exact workspace and publication state

Use EXISTING /tmp/codegraph-cjs-missing-fix-20261108, branch fix/commonjs-eval-callee-context, HEAD87576a8d9ff0d8aba235db5535f5f4429f14b037. Do not create/reset/clean a worktree or discard unstaged changes. Fifteen dirty source paths, newfiles intent-to-add, private.review untracked; all hashes checked at session end against durable source backup. Source should be unchanged from completed ninth review. Personal origin https://github.com/inth3shadows/codegraph.git, Eric Minish / eric.minish@gmail.com (verify again before future commits/pushes); never use work/Transactly identity.

PR28 DRAFT https://github.com/inth3shadows/codegraph/pull/28 at5d384989957c91b482068b306535437915a0595b, base main5e066489(em.40). PR29 DRAFT https://github.com/inth3shadows/codegraph/pull/29 at87576a8d9ff0d8aba235db5535f5f4429f14b037, base PR28 branch fix/commonjs-missing-member. AST redesign/current15files have NOT been committed/pushed; publishedPR29 still oldprefixguard. Neither PR merged/deployed; live em.40 unchanged. Original QA workspace /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780 is stopped/uncommitted T0pilot(HEAD729da1b); do not resume/edit it. Only its private.review holds backups.

## Read next (exact files)

1. /home/ericm/.codex/plans/handoff-codegraph-pr29-review9-root-export-regression-2026-11-09.md — latest factual review/state/repros/recovery.
2. /home/ericm/.codex/plans/explore-pr29-export-evidence-boundary-2026-11-09.md — latest recommendation, awaiting user approval.
3. Repo .review/commonjs-eval-callee-context.md — actual review ledger; history .review/commonjs-missing-member.md. Do not reread all old handoffs/full conversation.

## Current implementation and actual verification

ASTfact pipeline implemented in15dirtypaths. ExistingAST identifies direct eval; generator-scope workaround for JSgrammar's contextualyield ambiguity. OptionalExtractionResult.commonJsEvalCall->ephemeralFileRecord throughbothstorepaths->existingproject_metadata JSON{sourcehash,value}; resolveronlyacceptsfactifcurrentSHA256matches. Missing/stale/errorfactsunknown; oldmanualcallee prefixwhitelistremoved. No grammar/runtime/dependency/schema modifications. NewevalUnknownguard suppresses unprovennameguesses; computedmethodkeys nowcorrectlyuseenclosingscope. Explicit directmemberaliasesstillresolve.

Focused8files172PASS1SKIP, /tmp/codegraph-cjs-ast-f10-f11-after.log; sixFAIL90PASS before lastfix. One skipnativekerneltransport: native.node NOTSTAGED, don'tclaimnativeparity. No explicit finalnormalbuild/fullsuiteoncurrentdirtyASTrevision; old10666fullPASSbelongscommitted875onlyandisNOTcurrentclearance. No test/build/reviewerprocessesrunning.

Ninthnative dualreviewCOMPLETED, sourceunchanged. BothreviewersindependentlyCLEARED priorF10optionalwrappercapture andF11computedkeyscope(bothdirections). Broad11runtimeprobespass. AdversarialfoundF12 P2 atsrc/resolution/name-matcher.ts:25403: withclass Store{load(){return 42;}}, module.exports={load:Store.prototype.load}; function yield(v){return function ignored(){};} yield?.(eval)("ignored"); runtime.load()returns42, graphcalls[]. module.exports=new Store()alsoreproduces. Reader'smemberSetlistspropertywritesonly, notwholeexportedvalueinventory; newevalUnknowngatemistakesemptysetforreason todroprootvaluecalls. RemovingONLYnewevalUnknowngateinmemoryrestoresStore::load; directexports.loadaliaspasses. Repros /tmp/cg-a9-root-export-regression.cjs, /tmp/cg-a9-root-export-current.log, /tmp/cg-a9-root-export-oldgate.log. No parentduplicateprobes/codechangesduringreview. Overallreviewcount9honest; no resets/gatebypass.

## Exploration recommendation — NOT approved yet

KeepPR29; split intoTWOreviewablecommits (ASTfactproduction/transport/storage/tests, thenexportclassification/resolutionpolicy/tests). A thirdstackedPRaddsdependencywithoutseparatingthissamecontract. RemainingF12scope2sourcefiles(commonjs-export-members.ts,name-matcher.ts)+2testfiles(commonjs-export-members.test.ts,js-default-binding-members.test.ts); existingextraction/storage/grammarpipeline needn'tchangeforF12.

Represent exportform(namespacewrites/statedvalue/opaque) independentlyfromevalcertainty(present/absent/unknown). Preserveexistingresolutionofstatedwholemodulevaluesanddirectaliases; suppressunrelatednamespace guesses whenunsupported. Unknown eval alone mustnotoverrideastatedexportedvalueorclaimabsence. Keep confirmedactualevalbehavior. Pin matrix BEFOREcoding: namespacewrites/directaliases/rootobjects/instances x evalabsent/present/unknown, forwarding+fresh/sync. IncludeF12object/instancecasesandretainF10/F11. Checkmixed/bracketassignments andforwarderpropagation; no needanothergrammar/punctuationexception. Explorationhasread-onlycodeinspection; no implementationchangesmadeafterreview9. Usermustapproveproposedstructure/nextcodingstep.

## Resume workflow and boundaries

Newsession command uses -C existingtmpcheckout, workspace-write, --approve-for-me (installedcodex0.167.0helpverified), add-dir ~/.codex/plans and originalQA/.review ONLY forcheckpoints/backups. Omit --worktree andapproval/sandboxbypassflags. Use configuredmodel/profiledefaults; no modelchangeauthorized. ReadpersonalAGENTS/repoAGENTS, preserve work. If sourcecheckoutgone, recover safely fromGitHub875/base5e anddurablepatch WITHOUToverwritingrealexistingfiles.

Afteruserapprovesimplementation: addmeaningfulfailingF12tests, refactorclassificationcontractnarrowly, runfocusedmatrixandpreservationchecks, savecheckpoint. Askbeforeseparatenextreview asuserrequested; freshnative broad/adversariallanes onlywhenapproved, exactGit target+ledger,no wholeparentreaudits/repeatedfullbuilds, no gate resets. Runfinalnormalbuild/fullsuite ONCEafterstableclearance(CODEGRAPH_KERNEL=0 npm test -- --maxWorkers=4,~13min; no --minWorkersVitest4). Beforecommit/pushverifyrepo/remote/personalidentity/stagedexactdiff/sourcehashes/tests. Keepdraftuntiluserdecidesready/merge. Do not auto-merge/deploy/upstream report. No unaskedissue26fix/features/T0work. Userwantsregularconciseupdatesandminimalquota; compact fork_turns=none reviewerbriefs, don'trepeatcompletedchecks.

## Durable recovery locations

OriginalQA .review/commonjs-fix-2026-11-08/ast-f10-f11-corrected-2026-11-09/ hasall15currentsourcefiles, source-sha256.json, cumulative-from-875.patch, correction-from-round8.patch, actualred/greenlogs,ledgers/verification. pr29-review9-2026-11-09/ haslatestactualreviewreports/scripts/logs/results/hashes. OlderbackupsretainverifiedtwobranchGitbundleagainstbase5e; bothpublishedbranchesonGitHub. No lossif/tmpdisappears. Finalcopyofthishandoffandexplorationalsoin session-end-2026-11-09/. Don'tcommitprivate.revieworAIattribution. Don'trewriteagentcontrol/deployworktrees.

Personalcodegraphissue27CommonJS; issue26separateexternalimportbugoutofscope; QA PR27unrelatedevidence. TuesdayNov10 officialupstreamreportstillconditionalonactualverification/duplicatecheckandusergoahead. No officialwriteyet.
