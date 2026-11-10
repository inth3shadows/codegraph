# PR29 F12 correction — approved 2026-11-09

User approved the focused F12 correction after reading the session-end handoff. Preserve this checkout, 15 dirty source paths and private .review. HEAD 87576a8d; no commits, pushes, new reviews, merges or deployments in this phase.

1. Add runtime-backed failures for root object alias and root instance under optional yield wrapper / unknown eval fact.
2. Record export form independently from eval certainty. A syntactically stated whole module.exports value preserves existing value resolution; the property-write member set is not its inventory. Unknown eval must still suppress unsupported guesses without such a stated value, and must never imply absent eval.
3. Pin reader matrix namespace writes / direct alias / root object / instance / opaque x eval absent/present/unknown. Cover mixed and bracket assignments. Pin real graph matrix for the first four forms, direct and forwarded, plus fresh-vs-sync transitions and prior F10/F11.
4. Change only commonjs-export-members.ts and name-matcher.ts plus their two tests. Keep extraction/storage/grammar untouched.
5. Run focused suite (existing eight files and expanded cases), save source hashes/delta/logs/checkpoint, report and ask before fresh dual review. Final normal build/full suite are deferred until stable review clearance per user handoff.

Review count remains 9. Keep PR29 and proposed two-commit organization; committing remains a later step. Baseline backup: original QA .review/commonjs-fix-2026-11-08/pr29-f12-2026-11-09/before.
