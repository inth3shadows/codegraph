# PR29 rethink — analysis only

Recommendation: investigate first. Three readers approximate exports independently; a file-level flag permits global name guesses. Existing scope helpers use ranges/regex, not a complete binder.

Fixed: preserve checkout/repros; deterministic local analysis; no production-code execution. Prototype preference: no grammar/dependency/schema changes. Four-file scope is negotiable.

Subjective feasibility/novelty/product (1–5):
| Approach | F | N | Product |
|---|---:|---:|---:|
| Token exceptions | 5 | 1 | 5 |
| Scope-aware AST facts | 4 | 3 | 12 |
| Candidate proof paths | 4 | 3 | 12 |
| Compiler/scope backend | 3 | 2 | 6 |
| Abstract interpreter | 2 | 4 | 8 |
| Defer dynamic coverage | 5 | 1 | 5 |

Prefer AST facts plus candidate proof paths: import → exported value/member → declaration/type → target. Resolve wrapper binding identity and normalize syntax structurally. Keep evidence, completeness and eval uncertainty separate. Unknown supplies no target identity.

Prototype first; pivot to established scope machinery if this requires another ad hoc binder. Abstract interpretation adds order/alias complexity; reduced coverage remains a fallback. Decide literal-eval support explicitly: existing true-eval guesses do not establish export relationships.

Beyond example tests: generated equivalent syntax, shadow/decoy insertion, controlled runtime witnesses, minimized counterexamples, sync=fresh. Persist facts with source hash and analyzer version.

Effort L: extraction, fact transport/storage, imports and matcher. Existing transport helps. Blockers: binding completeness, eval compatibility, mutation/conditional policy, performance. No implementation approved. All 15 source hashes unchanged.

References: [Node](https://nodejs.org/docs/latest-v22.x/api/modules.html#the-module-wrapper), [ESLint scopes](https://eslint.org/docs/latest/extend/scope-manager-interface), [tracking](https://eslint-community.github.io/eslint-utils/api/scope-utils.html), [compiler](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API), [generated tests](https://fast-check.dev/docs/advanced/model-based-testing/).
