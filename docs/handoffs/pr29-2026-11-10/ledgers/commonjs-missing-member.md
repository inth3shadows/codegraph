# CommonJS missing-member review ledger

Target: /tmp/codegraph-cjs-missing-fix-20261108, branch fix/commonjs-missing-member. Base 5e0664891af0e87e6fd18bbfa16cab39237570f5 to current tracked working tree, unchanged while both reviewers run. Exact diff: `git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 5e0664891af0e87e6fd18bbfa16cab39237570f5 -- CHANGELOG.md src/resolution/name-matcher.ts __tests__/js-default-binding-members.test.ts`.

Round1 pending two fresh read-only native lanes. No Claude-only /code-review invocation. No resolver fix existed previously; user explicitly authorized implementation and dual review. Fork issue27 is the bug, QA PR27 is evidence only. No official upstream submission before Tuesday verification.

## Findings / fix map

- F1: confirmed upstream defect. `const named=require('./m'); named.missing()` with m.js exporting only known falsely calls unimported Decoy::missing; ref keeps receiver, resolvedBy instance-method/provenance null. Default imports and class-name-alias collision variants also reproduced. Sync adding decoy also fabricates call. Proposed tracked working-tree fix adds default bindings to imported-receiver guard and moves guard before unrelated class-name matching, after actual import/typed/object resolution. Requires reviewer execution and clearance.
- P0 test baseline: new20-case file on unmodified resolver:15 PASS /5 FAIL. The5 failures are3 parameterized default/require+decoy cases,1 forwarding-module missing member,1 sync-add-decoy. Log /tmp/codegraph-cjs-fix-baseline2.log. No production code edit before this run. Initial baseline command failed because Vitest4 removed --minWorkers; corrected to --maxWorkers=4. Initial two new-test authoring corrections: object variable API used instead of unsupported direct object-literal shorthand shape; expected local object's qualified name corrected to actual fully-qualified extraction name. Neither changes an existing baseline test.

## Rulings / limits

- Direct `module.exports = { read() {} }` without an assigned variable already lacks correct member recovery on base and can be captured by a method decoy. This change must stop wrong calls; new object API positive uses baseline-supported `const api={read(){}}; module.exports=api`. Do not broaden into object-export extraction or claim direct shorthand recovery is implemented.
- Bare external-package import exact-match issue26 remains separate and unfixed.
- No import mapping semantics changes, no blanket conversion of require to namespace imports, no source code changes outside one name-matcher guard and changelog/tests.
- This is a remaining variant of closed upstream2952/merged3162. No global novelty claim. Reproduced on em40/pristine main/pristine release. Native kernel unverified; local deployment is kernel0/WASM.

## Invariants / commands

- Actual exported member resolves beside an unrelated same-name method; missing member has no call. Forwarded CommonJS module preserves real export.
- Stated CommonJS class static method, assigned object member, instance method, callable direct/default + attached function all remain correct beside decoys.
- Existing ES default class, instance, typed variable, ambient export=, ordinary ESM namespace, named/anonymous/renamed functions retain calls.
- Typed local parameters and object literal bindings shadowing default imports retain their local member calls.
- Sync adds/removes a real export correctly; sync adding/removing a same-name unrelated method never fabricates missing-member calls.
- Check these with `cd /tmp/codegraph-cjs-missing-fix-20261108 && CODEGRAPH_KERNEL=0 npx vitest run __tests__/js-default-binding-members.test.ts --maxWorkers=1`.
- Expanded focused suite currently running: js-default-binding-members, commonjs-require-calls, commonjs-require-imports, commonjs-exports, require-default, import-default-as, namespace-object-resolution, import-object-member-namesake, sync-default-export-change, sync-import-member-retry, out-of-repo-import-shadow. Log /tmp/codegraph-cjs-fix-focused.log. Full normal suite/build pending.
- Additional adversarial probes: class name matching alias, nested receiver paths, defaults with inherited/static/object APIs, lexical shadows and live sync. Each defect needs concrete input/actual wrong output; no style requests or hypothetical findings.

## Round1 review outputs and remediation

Both native lanes finished read-only. Each independently reported the same two P2 regressions at name-matcher.ts:24944; no other demonstrated findings.

- R1 (broad+adversarial): `class Store { load() {} }; module.exports = new Store()` loses its legitimate instance call. Adversarial also demonstrated `export default new Store()` with Store not separately exported. Both base em40 produce Store::load; initial guard none. Remediation: resolve a whole explicit constructor expression to its actual module's local/imported class before the guard. Follow CommonJS forwarding; mask strings/comments/regexes, balance constructor arguments and type arguments, reject chained expressions, memoize with existing export index. Never re-enable generic method-name guessing for default bindings.
- R2 (broad+adversarial): visible local `class named { static missing(){} }` shadows a default/namespace import; moving guard ahead of class strategy drops correct own-file call. Broad also tested enclosing-function shadow. Remediation: guard exempts a class declaration in the reference's file only when existing isLexicallyReachable proves it visible. Other-file alias-name class decoy remains blocked.
- Review regression tests run BEFORE remediation: /tmp/codegraph-cjs-fix-review-baseline.log,24 cases19PASS5FAIL (original CommonJS positive +2 constructed-default variants +2 lexical class shadow variants). This pins both findings. Additional constructor argument/forwarder/text controls added; simple first remediation failed3nested/multiline/regex constructor positives in /tmp/codegraph-cjs-fix-constructors-baseline.log before argument-reader correction.
- After remediation: /tmp/codegraph-cjs-fix-focused4.log,11 files99PASS1SKIP. Final focused run adds no-parentheses and spaced CommonJS constructor controls; /tmp/codegraph-cjs-fix-focused-final.log pending. Earlier temporary TS compile error from passing Language to CommentLang was corrected to JS-family typescript comment handling; not a passing run.

The exact R1 reviewed name-matcher source is saved in .review/round1-name-matcher.ts and reconstructed hash verified against the recorded Git blob512a77a155299de8e6890447aa2d3aea7b81a1f9. Name-matcher remediation diff: `git diff --no-index /tmp/codegraph-cjs-missing-fix-20261108/.review/round1-name-matcher.ts /tmp/codegraph-cjs-missing-fix-20261108/src/resolution/name-matcher.ts`. Import-resolver and new tests are also remediation, diff from5e066489. No intermediate failing-source commit was made.

Verify2 target is current tracked working tree relative5e066489, including CHANGELOG.md, src/resolution/name-matcher.ts, src/resolution/import-resolver.ts, __tests__/js-default-binding-members.test.ts. Check R1/R2 on all paths, all invariants, and defects introduced by remediation. Do not re-raise the pre-existing direct module.exports object-literal recovery limit without new evidence. Full build/suite pending. No merge/deployment occurred.

## Verify2 result — NOT cleared; namespace-only redesign supersedes that target

Both fresh native lanes finished; all findings P2. Broad reported first textual constructor overriding inactive/overwritten exports, valid inline/parenthesized constructors losing calls (R1 still open), and constructor-derived calls remaining stale after sync. Adversarial independently reported constructor lookup overriding typed/object/class lexical shadows (R2 still open), earlier constructor overriding a later stated default, and stale constructor-derived calls after sync. Exact evidence scripts/results under /tmp/cg-broad-verify2-* and /tmp/codegraph-cjs-verify2-*; complete reviewer messages returned to root. Existing explicit-default resolution was safer than the attempted new inference.

Both lanes advised that a smaller boundary is coherent: extend module-namespace ownership only to a require/default whose resolved JS/TS target has no stated or uncertain value default; preserve all existing explicit/unknown default-value inference. Whole-file CommonJS forwarding can follow a namespace leaf; ambiguous assignments/default values must stay base behavior. No nonexistent redesigned code was reviewed or cleared by those design messages.

Implemented redesign: REMOVED all added import-resolver source code; that file is byte-identical to base again. Removed unsafe constructor parsing/inference entirely. Name-matcher now uses existing context.resolveModuleFile, a per-context namespace-classification memo (cleared with existing memos), conservative source checks, pure whole-file forwarders only, bounded/cycle-safe traversal, language-qualified memo keys and JS/TS extensions only (no implicit component defaults). Any raw default keyword/export= or uncertain module use excludes the new guard; comments/text may conservatively prevent a classification. Move-before-class guard keeps lexical own-file class exemption. Changelog narrowed to modules without a value default.

Scope/ruling: arbitrary stated/unknown exported default values and their guessed-member limitations remain pre-existing and explicitly OUTSIDE this fix. Do not claim every default-import missing-member case fixed. Removed new constructor-parser feature tests after deleting that feature, retaining baseline-supported CJS/ESM singleton, stated class/object/callable, lexical shadows and every original missing-module regression. Two dedicated singleton controls initially asserted disambiguation between two .load methods that base itself cannot provide; corrected their newly-authored fixture to a unique .load method, preserving the actual base invariant. Original broader CJS store-vs-decoy control remains unchanged. No baseline existing assertion was weakened.

Full suite on superseded constructor candidate was STOPPED intentionally via guarded SIGINT to only this checkout's Vitest PID702277; final exec83750exit130. It did not pass and must not be reported as a test failure count/green gate. /tmp/codegraph-cjs-fix-full.log belongs that obsolete target. Latest redesigned focused13-file run /tmp/codegraph-cjs-fix-redesign-focused2.log RUNNING; verify actual exit/summary. Explicit build and redesigned full suite remain required.

Third-review exception requested via async user question: skill says third round only if verify found something high severity; these were P2. Await user's explicit answer before launching further reviewers. Both agents' conceptual agreement is not final dual-review clearance. No source commit/push/fix PR/merge/deploy occurred. Original user's conditional merge/deploy request remains dependent on a reviewed green fix; original T0 stays stopped.

## Final testing and local commit — authoritative current state

Namespace redesign focused suite13files108PASS1SKIP, explicit npm run build exit0. Full normal suite exec60370EXIT0:872filesPASS19SKIP;10589testsPASS,2expectedFAIL,448SKIP,0unexpectedFAIL,799.56seconds. /tmp/codegraph-cjs-fix-redesign-full.log. Original portable6-case bug reproduction6/6PASS. Existing independent18-case records match em40baseline exactly. Namespace-to-value default change sync agrees with fresh index (initial no calls, synced/fresh Store::load); /tmp/codegraph-cjs-namespace-sync-probe.{cjs,jsonl}. Native kernel not validated.

Personal repository/remote/identity, source checksums against preserved tested snapshot, staged3-file set and staged diff/check verified before local commit. LOCAL COMMIT d18e40970fc5fbf32f635f6d8d536d1bdb24dacc, tree2363dd0f8923ca59c28a3e45a477573e7364e7c2, branch fix/commonjs-missing-member. Tracked working tree clean; only private .review untracked. No push/fix PR/merge/deployment. Review target now `git -C /tmp/codegraph-cjs-missing-fix-20261108 diff 5e0664891af0e87e6fd18bbfa16cab39237570f5..d18e40970fc5fbf32f635f6d8d536d1bdb24dacc -- CHANGELOG.md src/resolution/name-matcher.ts __tests__/js-default-binding-members.test.ts`.

Third review still requires the pending user answer. User's later status question did NOT approve it. If authorized use two fresh native lanes with fork_turns=none and self-contained briefs/ledger to avoid carrying unrelated history. Preserve final tests; no redundant full rerun unless code or unresolved concerns change the tested tree. Verification and logs/source/patch are backed up under original QA .review/commonjs-fix-2026-11-08/verification.json and adjacent artifacts. Current canonical handoff handoff-codegraph-commonjs-tested-review-pending-2026-11-08.md supersedes running/constructor handoffs.

## Third round authorized and running

User explicitly answered yes to the third-review request, then asked why another round was needed. Explained earlier reviews covered replaced code while the tested final commit had not been independently reviewed. This question did not revoke approval. Started fresh read-only review_broad_commonjs_final3 and review_adversarial_commonjs_final3 with fork_turns=none, the exact base..d18e4097 target and this ledger, compact self-contained briefs and no full-suite rerun. Their results remain pending. Source unchanged; no push/merge/deployment.

## Third round result — 2026-11-09 — NOT READY TO MERGE

Exact target remains local d18e40970fc5fbf32f635f6d8d536d1bdb24dacc. Tracked tree clean, .review untracked; no source changes after passing tests. User resumed; collected broad final answer and adversarial confirmed messages. Broad lane completed normally. Adversarial lane delivered independently confirmed findings/evidence, then failed finalization with a usage-limit error (retry notice Nov9 1:10AM). Do NOT claim that lane completed normally, final clearance, or a green dual review. No push/PR/merge/deployment.

### F3 — P2 — Namespace classification changes do not invalidate existing guessed calls (broad, independently confirmed adversarial)

Broad location src/resolution/name-matcher.ts:25398. Start with `class Store { load() {} }; module.exports = new Store()` and an unchanged caller requiring that module and calling `.load()`. Replace the export with `exports.known = function known() {};`, retaining the class. After cg.sync(), the graph still calls Store::load; a fresh index correctly produces no call. The new module-text dependency needs to reopen existing member guesses when export shape changes.

Broad reproduction /tmp/cg-broad-final3-sync-reverse.cjs; final evidence /tmp/cg-broad-final3-sync-reverse.log. Baseline comparison confirms its sync and fresh results both retained Store::load (/tmp/cg-broad-final3-sync-reverse-base.log). Adversarial independently reproduced direct and pure forwarder value->namespace->value->namespace retaining Store::load on every sync: /tmp/codegraph-cjs-final3-sync.cjs. Minimum correction recommendation: reopen default-import member guesses when imported module export text/shape changes, or record the imported source dependency on guesses allowed by a false namespace classification.

### F4 — P2 — Explicitly exported callable aliases lose their calls (adversarial confirmed before usage limit)

Location reported src/resolution/name-matcher.ts:25427. m.js `class Store { load() { return 42; } }\nexports.load = Store.prototype.load;`; use.js `const named=require('./m');\nexport function run(){named.load();}`. em40 calls m.js:Store::load; final emits no call. Same independently confirmed for `module.exports.load = Store.prototype.load`. Runtime named.load returns42 and Object.keys(module)=['load']. This is an explicitly exported callable, not the ruled-out direct object/default-value guessing limit. Prototype mutation variants group with the same uncertain-exports classification problem.

Evidence /tmp/codegraph-cjs-final3-export-alias.cjs and /tmp/codegraph-cjs-final3-adversarial{,-base.jsonl,-final.jsonl}. Recommendation: preserve uncertain named-export RHS APIs or resolve the actual callable alias before blocking a fallback. Do not reopen arbitrary guesses for absent exports.

### F5 — P2 — Out-of-scope local class bypasses namespace guard (adversarial confirmed before usage limit; original finding remains open on this path)

Reported location src/resolution/name-matcher.ts:25397 (guard local-class exemption, around25396). Valid CJS: m.js `exports.known=function known(){};`; use.js lines1..8:
`const named=require('./m');`
`function run(){`
`if(true){`
`class named {static missing(){}}`
`}`
`named.missing();`
`}`
`module.exports=run;`
Final returns use.js:run::named::missing atline6, though the class is block-local and imported module has no missing. Also reproduced for a class inside TS namespace Parent. These outputs pre-exist on base, but this is a still-open original false-positive path bypassing the new guard: existing isLexicallyReachable does not establish block visibility. Recommendation: require actual enclosing lexical block visibility before exempting a class. Preserve the genuine inner/enclosing-function shadow controls.

## Merge decision / next boundary

HOLD d18e4097. Passing build/full/focused tests remain factual, but F3/F4 are demonstrated regressions and F5 remains an intended missing-member path. No further agents, tests, source fixes or outward actions started after these reports. Do not rerun the full suite until a changed candidate requires it. User required confirmation before subsequent steps; present this concrete review result and seek the next bounded correction/verification decision. Fourth review is not preauthorized by approval of the third; native review gate may deny round4, so stop and ask rather than bypass. Agent quota exhaustion is additional reason not to relaunch a failed lane automatically.

## Corrections authorized — 2026-11-09

User: if findings are separate, report them; if related, fix them. All three are related: F3/F4 regressions introduced by this guard, F5 remaining original namespace missing-member path. No new issue filing or outside bug work needed. Authorized correcting all three in this branch; no extra reviewer lane or outward action started.

Fail-before tests:11 new regressions fail and24 existing pass on d18e4097, /tmp/codegraph-cjs-fix-r3-regressions-before.log. New tests cover direct and forwarded value->namespace->value->namespace sync vs fresh; explicit dotted/bracket export aliases beside a still-absent-member decoy; alias removal by sync; out-of-scope sibling-block classes vs genuine same-block inner callers; TSnamespaceclassscope.

Changes: F3 uses existing typeFrom dependency tracking on byName default-import member calls, includes each pure-forwarder file; activates the existing dependency-edge reopener for JS/TS paths while keeping failed-attribute retry Python-only. F4 namespace info tracks explicit assigned member names; new guard applies only to absent names. Escaping/computed/prototype-mutated exports remain uncertain and preserve existing behavior. F5 adds existing holderScopeAt block visibility to the class-shadow exemption, retaining function lexical visibility as well. Namespace memo stores traced files/member names; cache not poisoned by depth/cycle cutoffs.

First focused verification AFTER all three corrections:3files49PASS0FAIL, /tmp/codegraph-cjs-fix-r3-regressions-after.log. Includes full35-case default-member suite and memo clearing/lifetime. No existing expected assertion weakened. Pending expanded JS/Python sync controls, normal full suite/build and original6-case repro. No new commit yet; earlier full pass applies d18e4097 only. Current changed files test + name-matcher + src/index.ts + src/extraction/index.ts. No unsafe constructor inference, import-resolver unchanged. Fourth review not yet requested/launched; gate and quota limits remain applicable.

## Corrected commit verified by execution — independent review pending

F3 class-name path also pinned: two new uppercase Store import-alias sync cases failed when only byName answers carried dependency metadata; /tmp/codegraph-cjs-fix-r3-upper-before.log. Final correction records imported-module inputs on name-matcher default-member answers from both class-name and method-name strategies. No change to confidence/byName selection. All original regression assertions retained.

FINAL source tests:16files206PASS1SKIP, including37default-membercases, JS imports/sync andPythonattribute/memo controls. Log/tmp/codegraph-cjs-fix-r3-focused-final.log. Full normal suite exec42040EXIT0:872filesPASS19SKIP,10602testsPASS2expectedFAIL448SKIP0unexpectedFAIL,771.60seconds, /tmp/codegraph-cjs-fix-r3-full.log. Explicit npm run build exec37438EXIT0, /tmp/codegraph-cjs-fix-r3-build.log. Original portable6-case bug reproducer6/6PASS, /tmp/codegraph-cjs-corrected-final-sixcases.log. Node22.22.2/kernel0WASM; native not claimed. Source checksums prove no source changes between focused/full/build/testing and commit.

LOCAL CORRECTION COMMIT559c76df6afd9e40f4d617ff77caa7db4ad03955, tre eb81d2063f4e787da5cfc7d28c619078fdc86e6b6, parentd18e40970fc5fbf32f635f6d8d536d1bdb24dacc. Personalrepository/remote/identity/stagedexact4-filediff andchecks verified. Trackedtreeclean, onlyprivate.reviewuntracked. No push/fixPR/merge/deploy or issuefiling. F3/F4/F5 status CORRECTED+executionPASS, awaiting independent verification; do not claim native review clearance.

FOURTH ROUND ANSWER PENDING: async question asked permission and quoted ~/.codex/AGENTS.md: "where Claude's gate would ask the user at round 4, Codex denies, so stop and ask." User has not answered that new question; elapsed time is not approval. Do not launch fourth reviewers yet or modify gate state/control files. If approved use2freshread-onlynativefork_turns=none, same ledger, correction target `git -C /tmp/codegraph-cjs-missing-fix-20261108 diff d18e40970fc5fbf32f635f6d8d536d1bdb24dacc..559c76df6afd9e40f4d617ff77caa7db4ad03955 -- src/resolution/name-matcher.ts src/index.ts src/extraction/index.ts __tests__/js-default-binding-members.test.ts`. Brief F3-F5, currentcorrections+invariants; no fullsuite rerun unless changes/failures justify it. Stop/ask if gate denies; last third adversarial lane failed finalization due usage cap, don't fabricateclearance.

Durable original-workspace backup .review/commonjs-fix-2026-11-08/corrections-2026-11-09/:4sourcefiles, corrections.patch, checksums.json, before/after/focused/full/build/reprologs, verification.json identifyingfinalcommit/tree/outcomes, verified commonjs-fix.bundle containingbothlocalfixcommits with originalbase5e066489prerequisite. Commit recovery does not depend on /tmp survival. Current canonical handoff handoff-codegraph-commonjs-corrected-review-pending-2026-11-09.md supersedes corrections-running and review-blocked handoffs. OriginalT0unchanged/stopped; Tuesdayconditionalupstreamreport unchanged.

## Fourth verification and modular correction — 2026-11-09

User asked whether errors remain and approved proceeding, specifically requesting a smaller modular strategy for any remaining fix. Two fresh read-only minimal-context lanes review_broad_commonjs_verify4 and review_adversarial_commonjs_verify4 completed. BOTH independently CLEARED F3 direct/forwarded sync for ordinary and class-name aliases; F4 dotted/bracket callable/prototype aliases and removal sync; F5 block/namespace visibility and genuine inner shadows. Adversarial also verified Python failed-call retry/retyping and zero Python retry on JS-only edits. No full/build reruns or source edits by reviewers.

F6 — P2 — src/resolution/name-matcher.ts:25444 raw exported-member discovery accepts comments, strings, regex literals, and unrelated object properties. With m.js exporting only known, adding `// exports.missing = fake;` or `function setup(holder) { holder.exports.missing = 42; }` makes named.missing falsely call decoy.js:Decoy::missing. Clean source has no call. Quoted/template/regex variants reproduce. This is newly added member inclusion, not the previous conservative default-text exclusion ruling. Exact broad evidence /tmp/cg-broad-verify4-classifier.{cjs,log}, /tmp/cg-broad-verify4-probes.cjs; adversarial /tmp/codegraph-cjs-verify4-extra.cjs. Both recommended one isolated token-aware collector validating executable assignments and bare exports/module.exports roots.

Following user's authorized strategy: extracted readCommonJsExportMembers into new48-line(initial) src/resolution/commonjs-export-members.ts, with independent __tests__/commonjs-export-members.test.ts. Replaced matcher raw member/escape scanning with one helper call. Uses exact pinned production js-tokens9.0.1 (CommonJS, built-in types,16071unpackedbytes per officialnpmmetadata), no hand-written lexer or changedsharedstrip-comments scanner. Existingnamespace/default ownership tracing, sync/typeFrom and holderScopeAt behavior retained. Newpackage9chosen to keep CJS compatibility; upstream latestREADME refers to newerESMrequirebehavior. Source tokenizer was verified from officialrepo docs and installed package/types. No Node/packageversionbump.

Fail-before graph regressions:8FAIL/37SKIP on559c76df, /tmp/codegraph-cjs-modular-before.log. New helper independently tests executable dot/bracket writes, template expressions/nesting, TSgenerics, JSXtext-vs-expressions, line/block comments, strings/templates/regex/control-regex, unrelated/Unicode/dollar roots, equality/typequeries, uncertain/prototype/computed APIs. Initial4files89PASS. Additional2positive runtime-API controls (literal eval export and require.cache default) exposed2FAIL before uncertainty handling; /tmp/codegraph-cjs-modular-uncertain-before.log. Added explicit uncertainty for literal eval code and Node module/cache APIs, preserving genuine dynamic exports while ordinary data remains opaque. All existing expected assertions retained.

Latest modular focused gate18files260PASS1SKIP, /tmp/codegraph-cjs-modular-expanded-final.log; includes47default-member graph cases,38pure helper cases, priorJS/Python/sync/memo/lazy-engine controls. Source remains dirty relative559c76df in6files: newhelper/newunit test (intent-to-add makes visible in Gitdiff), existing integrationtest/matcher and package.json/package-lock. No new commit yet. No outwardactions. Full current modular suite/build still pending; parent10602PASS does not cover new modular code.

User's conditional approval includes correcting any residual error with this smaller strategy and verifying it. Next fresh verification target is559c76df..working tree, sameledger and6paths; keep native round count honest (fifthverification), no target/state reset. Stop/ask if host gate denies; do not bypass. Review ONLY F6 closure and regressions of helper/adapter/dependency, plus bounded preservation checks. Source stable after260focusedPASS; no repeatedfull/build by reviewers. Prefer existingdist+scratch probes; underlyingthree corrections already independently cleared.


## Fifth verification — modular source reader, 2026-11-09

Fresh read-only lanes review_broad_commonjs_modular5 and review_adversarial_commonjs_modular5 both completed. Both cleared F6 phantom comments/strings/templates/regex and unrelated roots, plus preservation of real aliases, sync, scope and Python behavior. Production js-tokens9.0.1 packaging compatibility cleared. No source edits or redundant full-suite runs by reviewers.

F7 — P2 — src/resolution/commonjs-export-members.ts:37 recognizes eval uncertainty only when a bare eval immediately receives a StringLiteral. Both reviewers reproduced template-literal eval dropping a real Store::load call. Adversarial additionally reproduced `(eval)('exports.load = Store.prototype.load;')`. Both runtime mutations return42; previous reader preserves Store::load, current reader emits no calls. Literal single-quoted bare eval control remains green. Evidence /tmp/codegraph-cjs-adversarial5-eval.{cjs,log}. Fix only the small helper: account for grouped bare eval callee and template literals, preserve class method named eval as non-call text. Add fail-before controls; do not alter name-matcher, sync or scope corrections for F7.

Pre-F7 modular full normal suite EXIT0, 873 files PASS19SKIP, 10650 tests PASS2expectedFAIL448SKIP0unexpectedFAIL,780.27sec. /tmp/codegraph-cjs-modular-full.log. This run does not cover the upcoming F7 correction. Current source remains local and dirty relative559c76df. No push, source PR, merge, deployment or upstream report. Original T0 pilot remains stopped/uncommitted.


F7 correction: literalEvalCall now unwraps paired bare-callee parentheses and grouped arguments, accepts StringLiteral/NoSubstitutionTemplate/TemplateHead. Does not execute eval or inspect data token contents; method declaration named eval remains ignored. Added4 pure-reader controls and2 graph positives. Before change:6FAIL85PASS (/tmp/codegraph-cjs-modular-eval-before.log); after:91PASS across2files (/tmp/codegraph-cjs-modular-eval-after.log). git diff --check PASS. No changes to the matcher adapter, sync or scope for F7. Full-suite PASS above predates this correction; normal final full suite and independent review of the F7 correction remain pending. Local changes uncommitted. Build result pending.

Explicit final F7 npm run build EXIT0, /tmp/codegraph-cjs-modular-eval-build.log; viewer,29grammars,runtime and dist engine checks PASS. Final full suite and independent F7 verification still pending; do not conflate pre-F7 full pass with final-tree clearance. Checkpoint backup .review/commonjs-fix-2026-11-08/modular-eval-2026-11-09/ in original QA workspace contains6current sourcefiles, cumulative and modular patches, hashes, logs and this ledger. Source unchanged since91focusedPASS/build.


## Sixth verification authorized and running — 2026-11-09

User explicitly answered yes to final verification. Fresh read-only native lanes review_broad_commonjs_eval6 and review_adversarial_commonjs_eval6 launched against559c76df..workingtree six modular paths and same ledger. No gate reset/bypass or Claude-only skill claim. Both focus F7 closure and neighboring invariants; no full/build reruns by reviewers. Parent full normal CODEGRAPH_KERNEL=0 npm test -- --maxWorkers=4 runs session5033, /tmp/codegraph-cjs-eval6-full.log. Snapshot hashes /tmp/codegraph-cjs-eval6-frozen.json. No final results yet. Final explicit build before this full run passed; test setup refreshed engine assets itself. No source changes during review/tests, no outward actions. Personal origin/identity rechecked: inth3shadows/codegraph, Eric Minish / eric.minish@gmail.com. Current six modular files remain uncommitted.


## Sixth verification result — 2026-11-09 — NOT READY TO MERGE

Both fresh read-only lanes completed normally. Adversarial CLEARED F7: original3 runtime/graph forms plus11 additional runtime-backed graph controls preserve real exports and reject inert eval-looking data/method declarations. Evidence /tmp/codegraph-cjs-adversarial6-eval.{cjs,log}. Broad independently passed13 intended F7/nearby controls, but found F8 in the correction. No source edits/build/full reruns by reviewers. No final dual clearance.

### F8 — P2 — literalEvalCall mistakes function-argument parentheses for grouped eval callees (broad)

Reviewer location src/resolution/commonjs-export-members.ts:20, loop lines20-24. Exact input:

```js
exports.known = function known() {};
function wrap(value) { return function ignore(code) {}; }
wrap(eval)("ignored");
```

Runtime exports only known. Current reader returns uncertain:true, making named.missing() falsely resolve to decoy.js:Decoy::missing. Restoring only the pre-F7 literal-eval check in memory returns uncertain:false and no call. wrap((eval))(("ignored")) also reproduces. Evidence /tmp/cg-broad-verify6-callee-compare.log, adjacent .cjs; initial probe /tmp/cg-broad-verify6-callee-context.{cjs,log}. Broad passed all13 intended controls including grouped direct eval, templates, method named eval, real template-expression exports and callable aliases. Adversarial's bounded probes did not include this counterexample; its clearance does not override the demonstrated defect.

Parent full suite intentionally stopped with SIGINT after confirmed F8; exact cwd/argv guarded signal to only isolated checkout main Vitest, tool session5033 EXIT130. /tmp/codegraph-cjs-eval6-full.log is PARTIAL, NOT a full pass/failure result. Avoid wasting a known-defective verification cycle. Prior91focusedPASS and explicit buildPASS remain true for this source, prior10650fullPASS predates F7 and cannot clear current tree. SHA256 snapshot recheck confirms all6 reviewed source paths unchanged during verification. No new source commit, push, fixPR, merge, deployment, version/tag/npm or upstream report.

Stop this correction cycle and report F8. User yes authorized final verification, not another correction/review cycle or publishing. Need user decision before next step, as previously requested. Durable evidence in original QA .review/commonjs-fix-2026-11-08/final-verification-2026-11-09/. Previous modular-eval source/patch backup still matches frozen source. Keep original T0 stopped/uncommitted. Do not reset review count/gate or rewrite control files.


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
