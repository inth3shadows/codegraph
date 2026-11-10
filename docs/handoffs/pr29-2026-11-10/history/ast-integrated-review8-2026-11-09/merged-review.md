

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
