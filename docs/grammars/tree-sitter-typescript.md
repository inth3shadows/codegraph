# tree-sitter-typescript — provenance & patch

`src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` and the kernel's
vendored C (`codegraph-kernel/grammars/typescript/`) are both built from
[marionebl/tree-sitter-typescript](https://github.com/marionebl/tree-sitter-typescript)
(MIT) commit `53071c97beb59f6ddc197a3473d22882ad756918`, with the patch in
`tree-sitter-typescript.patch` applied to `common/define-grammar.js` and
`common/scanner.h`.

marionebl's repo is a maintained fork of
[tree-sitter/tree-sitter-typescript](https://github.com/tree-sitter/tree-sitter-typescript)
v0.23.2, which has had no commit since 2025-01-30 (see
tree-sitter/tree-sitter#6091). We switched to it because it parses far more
real TypeScript than v0.23.2 with our own earlier patch did. The
differential job (`docs/grammars/ts-differential.md`) measured that on
2026-11-05 across four forks.

The patch changes grammar **rules**, so the parser is **regenerated** with
tree-sitter-cli 0.25.10 (ABI 15). The fork's checked-in `parser.c` (ABI 14)
is not used. The kernel compiles the same generated C (build.rs) in place of
the `tree-sitter-typescript` crate, so the two paths stay table-identical
(`kernel-grammar-parity.test.ts`) and share one external scanner
(`common/scanner.h`, marionebl's plus one patch hunk).

| file | base (marionebl 53071c9) sha256 | ours sha256 |
|---|---|---|
| `common/define-grammar.js` | `1791f937a3d122b49b6d9cc539f6ce8462bf3ea30c2b170904221c11702b4899` | `fa1dd3e0881e7b087d6b0c650bdfb04f200a667db915249a9b60e74627deeeee` |
| `common/scanner.h` | `2bf0b2ca94babda0682baee5031b152a69ff058a752407775c0419094ebfd1a7` | `834a0b60fba90355410cf7456069d9e1dd1aac309fdc8485f80d64724fc1e98b` |
| `typescript/src/parser.c` | (regenerated) | `2617ac3e51b9938277d904d58b02e454183b0c86e04bb5fdd9792adb60506a26` |
| `tsx/src/parser.c` | (regenerated) | `f6aadca29573f480ea13f5b3f9db803fceba34c4da50f1008f3594e2ffe60961` |
| `tree-sitter-typescript.wasm` | — | `1c9f9d3047815b15ccafbd33ba85eeaa045feca4d0438421a77a781ba51d8c6a` |
| `tree-sitter-tsx.wasm` | — | `34da1f49d4c84acfc6a4f795ecd932f9e1de82b7fee2b563ce114eaefd1557a3` |

## What the base fixes (marionebl, over v0.23.2)

- TypeScript 4.7 variance annotations: `interface Stream<out A, in E>`,
  `<in out T>`, `<const in T>`. `in` / `out` sit inside a `variance` node.
- A generic call signature on its own line after a member with no `;`, such
  as an overload `<A>(self: A): A` (upstream #335). In large files this was
  the error that turned most of Effect into a single whole-file `ERROR`.
- Escape sequences in template literal types (`` `${string}\n` ``).
- `export type * from "m"` and `export type * as N from "m"`.
- ASI before `in` used as a property or method name.

## What our patch adds

- From [dokimasia/tree-sitter-typescript](https://github.com/dokimasia/tree-sitter-typescript)
  `55b0687`: an import type is a primary type, so `import("m").X[]`,
  `import("m").X["k"]`, `keyof import("m").X` and `import("m").X<T>` parse.
- From dokimasia `96ce7e6`: `f<typeof import("m")>()` parses as a call with a
  type argument instead of two comparisons (a static precedence becomes a
  conflict).
- Our own: `out` stays usable as a type-parameter name. tsc accepts
  `type F<out> = out[]`, `<out = X>`, `<out, T>`, and `<in out>` (modifier
  `in` on a parameter named `out`). With marionebl's rule alone, the
  `variance-out-name` fixtures fail.
  The name alias follows brajevicm/tree-sitter-typescript@9fcaa13. `<in out>`
  vs `<in out T>` needs a `[variance]` conflict, because only the token after
  `out` decides.
- Our own: `const` is also accepted after the variance (`<in const T>`), as
  tsc accepts it.
- Our own, in the scanner: marionebl's #335 fix inserts an implicit `;`
  before any `<` that starts a line in a type or class body. Right after a
  bare member name that is wrong: tsc reads `find\n  <T>(id): T` as one
  method, and splitting it made the member a property (with no parse error
  in an interface) and dropped a class method's call edges. `find\n  (id): T`
  had the same split even before the base switch. The grammar now has a
  marker token (`_member_signature_marker`) that the scanner never produces,
  placed between the name and the signature of `method_signature`,
  `method_definition` and `abstract_method_signature`. So it is valid
  exactly where a `<` or `(` continues the member, and there the scanner
  inserts no `;`. A first version checked whether `(` was valid, which the
  JavaScript grammar does for `'||'`. That also fired after `typeof x` and
  `import("m").X` types and after `return`, and undid #335 there. Compared
  node by node against the build without this hunk, it changes no tree on
  the four corpora, `src/`, `ui/src/` or TypeScript's own `lib/`.
  `__tests__/typescript-member-asi-parse.test.ts` pins both sides.

### Known limits

- `in` and `out` are keywords where a type parameter can start, so they lex
  as keywords wherever an expression `<` could also open type parameters. A
  **type** or **JSX tag** literally named `out` or `in` in that position does
  not parse: `<out>x` (a type assertion), and in tsx `<out>…</out>`, `<out/>`,
  `<in>…</in>`, or `<out.Provider>`. No HTML element and no conventional type
  has either name. Making `out` a type name everywhere broke `[out: T]` tuple
  labels instead, and real code uses those (Effect's `JsonSchema.ts`).
- Most of the remaining Effect failures are a tagged template with type
  arguments, such as ``sql<{ id: number }>`SELECT …` ``.
- In VS Code, `start < unique.length` fails, because `unique` reads as the
  `unique symbol` keyword. So does a labeled tuple type used as an array
  element type (`[spoken: string, symbol: string][]`).
- A parenthesized import type, `(import("m").A)[]`, still fails, as does
  `f<import("m").Y>()`.
- marionebl's ASI-before-`in` fix only covers `in` followed by a non-letter
  other than `_`. A line starting `in1`, `in2` or `in$x` after a statement
  with no `;` still fails (it did before too), and so do `in?: T` and
  `in<T>()` members after a member with no `;`.
- The same scanner change reads `a\n in(b)` (a line break, then `in(` with
  no space) as a call to a function named `in`, where tsc reads `a in (b)`.
  There is no parse error to flag it.
- The parser also accepts some forms tsc rejects, such as `<out extends X>`
  and `<out in>`.

## Measured

Divergent files are those tsc parses clean and tree-sitter does not. The
numbers come from `node scripts/ts-differential.mjs` (tsc 5.9.3, web-tree-sitter
0.25.10).

| corpus | files | v0.23.2 + old patch | marionebl 53071c9 | + this patch |
|---|---|---|---|---|
| Effect-TS/effect 7a87ff9 | 2,056 | 185 | 29 | 29 |
| colinhacks/zod 2554b70 | 515 | 0 | 0 | 0 |
| excalidraw/excalidraw dd2f8fc (.ts + .tsx) | 695 | 5 | 5 | 0 |
| microsoft/vscode ca43fc94 `src/` | 11,267 | 11 | 11 | 3 |
| **total** | | **201** | **45** | **32** |

On its own, marionebl fails only `variance-out-name.{ts,tsx}` (`<out>` as a
name). No file got worse at either step, and the five `gap-*` fixtures are
unchanged. The scanner hunk changes no tree on any corpus file. The patched
grammar passes marionebl's 117 corpus tests, and the 2 that dokimasia's commits
add when their `test/corpus` hunks are applied too (the patch carries only
`common/`).

## Rebuild

```bash
git clone https://github.com/marionebl/tree-sitter-typescript
cd tree-sitter-typescript
git checkout 53071c97beb59f6ddc197a3473d22882ad756918
npm ci --ignore-scripts          # tree-sitter-javascript 0.23.1 (lockfile), the grammar it extends
git apply /path/to/codegraph/docs/grammars/tree-sitter-typescript.patch
(cd typescript && npx -y tree-sitter-cli@0.25.10 generate)
(cd tsx && npx -y tree-sitter-cli@0.25.10 generate)
npx -y tree-sitter-cli@0.25.10 test
npx -y tree-sitter-cli@0.25.10 build --wasm -o tree-sitter-typescript.wasm typescript
npx -y tree-sitter-cli@0.25.10 build --wasm -o tree-sitter-tsx.wasm tsx
# kernel: copy common/scanner.h, {typescript,tsx}/src/{parser.c,scanner.c,tree_sitter/}
# and LICENSE into codegraph-kernel/grammars/typescript/ keeping that layout
# (scanner.c includes ../../common/scanner.h)
```

Check each `generate` exit code, and check that both `parser.c` files say
`LANGUAGE_VERSION 15`. Piping `generate` hides a failure, and `build` then
compiles the fork's checked-in ABI 14 parser without complaint. `build --wasm`
uses the `emscripten/emsdk:4.0.4` Docker image when no local emcc is present.
The wasm bytes depend on the emsdk build, so a rebuild may not match the
hashes above byte for byte. `parser.c` is the reproducible artifact. After
updating either side, rebuild the kernel (`npm run build:kernel`), run
`kernel-grammar-parity.test.ts`, and run `node scripts/ts-differential.mjs`.

## Moving the base

When marionebl (or tree-sitter upstream, if it revives) gains a fix, move the
base commit, re-apply the patch, and drop any hunk the base now covers. Run
the differential before and after the move. Then check that `<out>` still
parses as a parameter name, `[out: T]` as a tuple label, and `<in const T>`
with `const` after the variance. `__tests__/typescript-variance-parse.test.ts`
and the `ts-syntax` fixtures cover all three. The patch also carries a
`common/scanner.h` hunk (the member marker): re-run
`__tests__/typescript-member-asi-parse.test.ts`, which checks node kinds the
differential cannot see, and drop the hunk if the base reads
`name\n<T>(...)` members as tsc does. Tracking: inth3shadows/codegraph#11.
