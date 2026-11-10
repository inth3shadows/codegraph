# Sol independent plan: separate exported identity from callable identity

Read-only design against HEAD `87576a8d` plus the preserved 22 dirty paths. Evidence: round11 broad/adversarial reports and current collector/consumers; no new probes or source changes.

## Diagnosis and choice

F14 and F15 expose one contract error: declaration ownership is being used as value identity, export shape, and callability simultaneously. The collector returns a variable declaration when value analysis stops; consumers accept it as a call target. Conversely, the compiler's inferred type is treated as the complete exported shape, losing explicit local property writes. Improving syntax recognition alone cannot repair this boundary.

Three viable boundaries:

1. Extend current `targets`/`membersOf`: smallest delta, but preserves conflated contracts and makes every new write form another special case. Reject.
2. Replace the record's semantics with a small binding-owned value/relationship graph, keeping TypeScript binding and the existing eval adapter. Choose this: explicit properties and callable aliases become the same relationship mechanism.
3. Restore pre-integration consumers selectively from preserved snapshots, keeping other dirty work. Removes compiler deployment cost but reopens F12/F13 unless replaced with another ownership authority. Reserve for failed feasibility, never silently restore global guesses.

## Contract before implementation

Each export lookup returns independently: value/reference selector, callable selector, property completeness, and evidence dependencies. Use a discriminated result: positive, proven absent/non-callable, or unknown. Unknown never enables name fallback. A positive reference to `value=42` remains valid for data access; invoking it produces no call target. `new Store()` has instance identity, not Store's callable identity; exported classes distinguish constructor invocation from ordinary calls.

Represent local bindings by compiler symbol identity and allocations by declaration/source identity. Record literal-key writes against those identities, including object/class/function expandos and `prototype` method selections. Binding aliases point to values; property aliases point to selected member values. Thus `api.load=Store.prototype.load; module.exports=api` preserves ownership without copying names globally. Direct function/arrow/method declarations supply callable identity; variable/constant node kinds never establish it.

Use a bounded def-use solver, not JavaScript execution: declaration initializers and unambiguous straight-line assignments transfer identities; overwrites supersede prior facts; aliases preserve shared property ownership. Conflicting reaching definitions, escapes, getters, dynamic keys and unsupported control flow mark the affected slot unknown. Do not union overwritten callables into a purported unique target. Do not attempt getters, proxies, arbitrary function returns or heap simulation.

Default imports and references consume value identity; call references consume callable identity. Both import resolver and name-matcher guard consume the same result. Relative forwarders retain dependency paths and cycle/depth limits; unsupported forwarding remains unknown. Source/version caches stay resolution-local, and sync invalidates using all contributing files.

Keep direct literal-eval parsing in its original lexical context, with current source mapping and binding checks. Mandatory F10/F11 compatibility includes genuine generator/computed-key eval and optional/non-direct/local eval rejection. These are static potential relationships, not proof that a generator executed. Runtime-precise reachability and this existing compatibility promise cannot both be claimed.

## Feasibility gate and implementation scope

Before production changes, specify a table of expected reference/call/unknown results and build an isolated throwaway contract spike using current TypeScript binding plus relationship facts. Require F14's object/class/function writes; F15's numeric/string data and assigned callable; overwrite, shadowed binding, alias mutation, ambiguous branch, direct/forwarded and fresh/sync controls; all original F10–F13 fixtures. Reuse recorded evidence; do not rerun old exploratory probes.

Proceed only if one identity model handles every mandatory row without fixture-specific syntax exceptions. Likely production files: `commonjs-export-evidence.ts`, `import-resolver.ts`, `name-matcher.ts`; corresponding collector and graph regression tests. Preserve extraction/eval storage, package dependency and unrelated dirty paths.

Acceptance: exact intended declaration, zero data-call edges/global guesses, consistent shared guards, dependency-complete sync/fresh equality, lazy compiler loading. Retain runtime TypeScript for trustworthy scoping; measure real representative resolution throughput and memory against the frozen integration before claiming acceptable cost. Focused tests precede the repository's normal build/full suite and fresh authorized dual review.

Stop/pivot if mandatory coverage requires general execution or divergent authorities, or measured compiler/solver cost is unacceptable. Present a scoped rollback and explicitly reduced coverage for approval; do not keep accumulating patches.
