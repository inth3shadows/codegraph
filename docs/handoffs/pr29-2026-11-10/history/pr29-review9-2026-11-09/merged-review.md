

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
