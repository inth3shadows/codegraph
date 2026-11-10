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
