# PR29 review9 complete: F10/F11 clear, F12 root-value-export regression remains

Authoritative2026-11-09. User saidyes to focuseddualverification. BOTHfreshnativeREADONLYlanes review_broad_pr29_f10_f11_9 and review_adversarial_pr29_f10_f11_9 completednormally. Review-onlyrequestdone; STOP/reportF12, nofix/anotherreview/fullsuite/commit/push/markready/merge/deploywithoutuserdecision. Userper-stepconfirmationremains. This supersedes priorcorrected-review-pending/runningcheckpoints.

Checkout /tmp/codegraph-cjs-missing-fix-20261108 branchfix/commonjs-eval-callee-context HEAD87576a8d9ff0d8aba235db5535f5f4429f14b037,15dirtysourcepaths(newfilesintent-to-add),private.reviewuntracked. All15hashesmatchsavedast-f10-f11-correctedbackup, no source changesduringreview. PR29 DRAFT https://github.com/inth3shadows/codegraph/pull/29 still87576a8d/base5d384989(PR28); PR28 DRAFT https://github.com/inth3shadows/codegraph/pull/28 still5d384989/base5e066489(mainem40). Nothingnewcommitted/pushedormerged/deployed. OriginalQA T0pilotstaysstopped/uncommitted/untouched; liveem40unchanged. Personalorigininth3shadows/codegraph, EricMinish/eric.minish@gmail.comrecheckbeforefuturecommit.

CurrentuncommittedASTpipeline/metadatafactsunknownflag/computed-scopefix described in handoff-codegraph-pr29-f10-f11-corrected-review-pending-2026-11-09.md andlatestledger .review/commonjs-eval-callee-context.md(fullhistorypointer .review/commonjs-missing-member.md). No grammar/runtime/schema/dependencychanges. ExistingJSgrammarcontextualyieldlimitationisrealanddocumented; helperhandlesscope. FactsstoredthroughFileRecord->existingstoreprojectmetadatawithSHA256sourcevalidation, nosecondwriter. Unknownfactsdon'tproveabsence; currentevalUnknowngateblocksnameguessesunlessexplicitmemberwritten. ThisguardiswhatF12nowshowsistoo broadforstatedrootvalueexports.

## Actualreviewresults

BOTHindependentlyclearedoriginalF10/F11andnearbycontrols: optionalyieldwrappernocapture, ordinarycomputedkeyinsideoutergeneratorgenuineevalpreserved, generatormethodkeynongeneratorwrappernocapture. Broad11runtime-backedprobesPASS, includingclass/nestedcomputedkeys,generator/nongeneratorbodies,explicitexports.loadaliasunderunknownfact,genuineeval. Evidence /tmp/cg-broad-pr29-ast9-verify.{cjs,log}. Adversarialnestednongenerator/gettercomputedkeysalsopass. No contradictoryresult; broad didn'texerciseroot-valuevariantsbelow.

F12 P2, adversarial, EXACTlocation src/resolution/name-matcher.ts:25403:
class Store { load() { return 42; } }
module.exports = { load: Store.prototype.load };
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");

Withconstnamed=require('./m'); functionrun(){named.load();}, runtimeloadreturns42 butcurrentgraphcalls[]. Whole-objectmodule.exportswritehasnomembersrecordedbytokenreader;newevalUnknowngateconsequentlydropsthegenuinealias. module.exports=new Store()alsoreproduces. RemovingONLYnewevalUnknownconditioninmemoryrestoresm.js:Store::loadforbothidenticalsources. Directexports.load=Store.prototype.loadcontrolpasses. NewregressioninF10fix, notunrelatedparentreaudit. Evidence /tmp/cg-a9-root-export-regression.cjs, /tmp/cg-a9-root-export-current.log, /tmp/cg-a9-root-export-oldgate.log. Parentdidnotre-runreviewprobes/rereaddiffmerelytoduplicate. ReportthisoneP2andstopforuserchoice.

## Verification/nextboundary

Current172focusedPASS1SKIP(8files)remainsvalidandmissesF12; no explicitnormalbuild/fullsuiteforthisdirtyASTcode. Old10666fullPASSbelongs87576a8donly. Native.nodeNOTSTAGED, nokernelruntimeparityclaim. Distbehaviorcurrent; sourcecommentonlyposttestclarificationrecorded. No tests/build/reviewersrunning. No fullsuitespentonknowndefect. No additionalreview/iterationwithoutapproval; count9honest,nogate/state/controlresets. Do notclaimClaude-only/code-reviewran.

IfuserauthorizesF12remediation: firstaddbothrootobjectaliasandnewStore()real-graphregressionswithsameoptional-yieldparseerror; preserveoriginalF10nocapture,F11bothdirections,explicitmemberalias,andfresh/sync/forwarder/typecontrols. Narrowunknown-evalguesspolicytopreservestatedmodulevalueexportsratherthananotherblanketblockorlexicalcall-prefixguess. Existingreaderuncertaintyfordefaultexportvaluemustremainseparatefromevaluncertainty; inspectactualtypes/invariantsbeforeediting. Do not weakenexistingtestsorclaimunknown=absence. Focusedtestsbeforenextverification; newreviewroundonlyperuser/actualgate, noreset. Finalnormalbuild/fullonceafterstableclearance, thenverifiedcommit/pushtoexistingPR29withinactualauthorization, keepdraftuntilclear/userdecidesmerge. Noautomerge/deploy/upstreamreport.

## Durable recovery

OriginalQA .review/commonjs-fix-2026-11-08/pr29-review9-2026-11-09/ containsscripts/logs,bothledgers,merged-review.md,review-result.json,source-sha256.json/checksums. Adjacentast-f10-f11-corrected-2026-11-09/containsALL15currentdirtysourcefiles,cumulativepatchrelative875,5filedeltafromround8,failbefore6FAIL90PASS/passafter172PASS1SKIPlogs; review9-running.jsonupdatedCOMPLETED. OlderAST8backuphaspriorreports/sources; publishedbranchesandverifiedgitbundlerecover875/base5eparents. No lossif/tmpdisappears. Preserveexistingdirtyworkwhenrecovering; don'tcommittheprivate.revieworAIattribution.

OriginalT0andcontrol/deployworktreesuntouched. Personalissue27CommonJS,issue26externalimportbugseparateoutofscope,QA PR27unrelatedevidence. TuesdayNov10officialupstreamreportremainsconditionalonverification/duplicatecheckandusergoahead,notnow.
