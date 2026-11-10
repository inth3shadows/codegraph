# Astra vs Sol — independent PR29 design comparison

User asked "astra vs sol come up with diff plan?" Two fresh independent read-only planning lanes ran: gpt-6-astra and gpt-6.1-sol. Both completed and saved plans. No source edits, probes, build, new review, commit or publication. All22source hashes match round11 frozen snapshot. This comparison is about these concrete plans, not general model capability.

## Shared conclusion

Both choose a bounded binding-owned value/relationship graph, keeping the established TypeScript binder and working lexical eval adapter. Both reject two local patches to the current declaration-array contract. Root error: declaration identity, exported value identity and callable implementation identity are conflated. Compiler type shape is not a ledger of explicit property writes.

F14 needs object/class/function identity plus property slots: api.load=Store.prototype.load;module.exports=api must preserve that slot and target. F15 needs callability as independent evidence: const value=42;exports.load=value is a valid data export but no call target. let value;value=real;exports.load=value must resolve the reachable callable or remain unknown, never call the storage variable itself.

## Differences of emphasis

| Plan | Most useful detail |
|---|---|
| Astra | Explicit value categories and closed-object completeness; branch alternatives must agree before claiming one callable; strong stop/pivot boundary and safe reduced-scope fallback. |
| Sol | Clear consumer result separating value/reference selector, callable selector, completeness, and dependencies; bounded def-use transfers, overwrites and aliases. |

This is convergence on one architecture, not competing fundamentally different plans.

## Recommended combined plan

Use Sol's consumer contract with Astra's uncertainty/stop rules. First test only the missing value/property/callability contract in isolation, reusing the existing binder and recorded fixtures rather than restarting the full prototype. Mandatory rows: F10–F15, local object/class/function writes, primitive data/reference-vs-call pairs, callable reassignment, alias identity/overwrites/post-export mutation, ambiguous branches/escapes, forwarder dependencies, and fresh-v-sync. No production integration until one representation satisfies those rows without fixture-specific exceptions.

Keep TypeScript lazy and preserve lexical literal-eval/generator relationships as static potential relationships. Unknown supplies no global guesses and no stale callable. Constructors and ordinary callable functions are separate. Avoid general JS execution. If the bounded model needs arbitrary calls/heap simulation or fails representative performance checks, stop and propose a narrowly scoped rollback/reduced coverage while preserving all existing files.

Likely production scope after validation: commonjs-export-evidence.ts, import-resolver.ts, name-matcher.ts and focused tests; no extraction/schema rewrite. Real representative performance remains unmeasured (toy timing is not sufficient). Neither plan is an implementation approval.

## Current state and next boundary

Round11 completed with new P2 F14/F15 open. Original F10–F13 independently clear. Prior631focusedPASS1nativeSKIP does not clear new findings. Source remains22dirtypaths at87576a8d. No further code/review/fullsuite/publication authorized by this planning request. User decides whether to pursue the combined contract experiment.

Plans:
- /home/ericm/.codex/plans/plan-astra-pr29-export-contract-2026-11-09.md
- /home/ericm/.codex/plans/plan-sol-pr29-export-contract-2026-11-09.md
Review checkpoint: /home/ericm/.codex/plans/handoff-codegraph-pr29-review11-two-findings-2026-11-09.md
