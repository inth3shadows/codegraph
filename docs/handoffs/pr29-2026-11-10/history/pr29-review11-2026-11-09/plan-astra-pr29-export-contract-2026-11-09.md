# Astra: investigate a typed export-value graph before further integration

Recommendation: replace the collector’s declaration-list contract with a bounded, binding-owned value graph; retain its TypeScript binder and lexical eval adapter. Investigate first; estimated L. This is a contract redesign, not an expando patch plus a node-kind filter.

The root error is substituting declaration ownership/type shape for value flow. F14 loses `api.load = Store.prototype.load` because compiler type enumeration is not a mutation ledger. F15 turns the declaration owning a number into a callable target, and cannot follow `value = real`. Both are demonstrated by round11’s reports; no probes were repeated for this plan.

Three viable boundaries:

1. Patch the current collector: capture local writes and filter calls. Smallest diff, but declaration arrays still conflate exported storage, runtime values, and callable implementations; future assignments/aliases remain separate exceptions. Reject.
2. Use an explicit, narrow value-flow contract over compiler binding identities. More work, but one representation handles both defects and makes unsupported behavior visible. Recommend.
3. Shrink/revert the latest integration from saved before/after snapshots, retaining earlier AST/eval work and the safety guard; withhold unsupported targets. Lowest architectural commitment, but loses demonstrated relationships and must not restore the old global guesses. Keep as fallback, not a claimed complete fix. Never reset the checkout: preserve all 22 dirty paths and reverse only reviewed integration hunks in a separate worktree.

The contract:

- Values are callable implementation selectors, class constructors, object identities, primitive data, relative-module references, or unknown. Storage bindings/properties point to values; they are not automatically call targets. Compiler symbols identify bindings; source selectors identify indexed declarations.
- Each lookup returns positive evidence, proven absence/non-callability, or unknown with a reason. Absence requires a closed known object; unsupported mutation destroys that completeness. Unknown never permits a global name fallback or silently retains a stale callable.
- Reference/default queries may resolve data ownership. Call queries resolve only a uniquely established callable implementation. Constructor queries are separate: classes are constructible, not ordinary callable functions. Function-valued variables must resolve their function body selector, never pass merely because their graph kind is variable/constant.
- Record literal property writes against object identity, including object/class/function expandos. `alias = api` shares identity; rebinding alias does not replace api. Exporting api retains identity, so later supported property writes remain visible. Track straight-line binding assignment versions and definite overwrites; branch uncertainty joins alternatives and suppresses a unique answer unless all supported alternatives agree. No execution engine, loop simulation, or custom scope parser.
- Support explicit initializers, direct assignments, literal keys, prototype method selectors, existing object/instance exports, and relative forwarders. Preserve existing supported parenthesized/logical forms. Dynamic keys, getters/proxies, escaping mutation, reflective operations, and unresolved control flow return localized unknown. Document this coverage boundary rather than claiming complete JavaScript export evaluation.

Preserve F10/F11’s exact lexical eval adapter and existing extraction facts. Reuse binder identities across expanded source through original declaration locations; synthetic declarations without indexed bodies remain unresolved. Literal eval contributes potential static relationships, not proof of invocation. Generator/computed-key relationships and optional-call rejection are mandatory controls. Exact runtime exports and these potential relationships cannot be promised simultaneously without substantially broader execution analysis.

Before production edits, authorize an isolated contract spike and a fixed acceptance matrix using saved round11 fixtures plus overwrite, alias/rebinding, post-export mutation, unknown contamination, and reference-versus-call pairs. Gate: F10–F15 behavior correct; F12/F13 remain clear; forwarder dependencies complete; fresh index equals sync after target addition/removal/rebinding. No new global fallback. Baseline existing focused tests before assessing changes.

Likely scope: commonjs-export-evidence.ts, import-resolver.ts, name-matcher.ts, and focused evidence/default-binding tests; no extraction/schema rewrite. Keep source-hash/versioned resolution-local caching and forwarding dependency invalidation. Retain lazy TypeScript runtime dependency only if isolated measurements justify it: compare cold/warm indexing and heap on representative small/large CJS repositories, not toy collector timings; query-only loading must remain compiler-free.

Stop/pivot if passing the matrix requires interpreting arbitrary calls or expanding syntax exceptions. Use option 3 transparently instead. After a successful spike: bounded integration, focused checks, authorized fresh dual review, then normal build/full suite. Existing 631 passes are supporting history, not final clearance.
