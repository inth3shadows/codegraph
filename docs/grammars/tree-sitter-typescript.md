# tree-sitter-typescript — provenance & patch

`src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` and the kernel's
vendored C (`codegraph-kernel/grammars/typescript/`) are built from
**inth3shadows/tree-sitter-typescript** commit `84ffdb8`, our own fork of the
grammar. It is private while it is being burned in, so the public,
reproducible form is
[marionebl/tree-sitter-typescript](https://github.com/marionebl/tree-sitter-typescript)
(MIT) commit `53071c97beb59f6ddc197a3473d22882ad756918` with
`tree-sitter-typescript.patch` applied to `common/define-grammar.js` and
`common/scanner.h`. The two give byte-identical `common/` sources.

The lineage is tree-sitter/tree-sitter-typescript v0.23.2, which has had no
commit since 2025-01-30 (tree-sitter/tree-sitter#6091); then marionebl's fork;
then ours, which adds dokimasia's two import-type commits, our own fixes, and
the tsc differential as its CI. The parsers are generated with tree-sitter-cli
0.25.10 (ABI 15); marionebl's checked-in ABI 14 `parser.c` is not used. The
kernel compiles the same generated C (build.rs) in place of the
`tree-sitter-typescript` crate, so the two paths stay table-identical
(`kernel-grammar-parity.test.ts`) and share one external scanner.

| file | base (marionebl 53071c9) sha256 | ours (fork 84ffdb8) sha256 |
|---|---|---|
| `common/define-grammar.js` | `1791f937a3d122b49b6d9cc539f6ce8462bf3ea30c2b170904221c11702b4899` | `cac41c8efa21bf6600bd8ef2694abf939910791a573a73004af7911d2a3c3cc3` |
| `common/scanner.h` | `2bf0b2ca94babda0682baee5031b152a69ff058a752407775c0419094ebfd1a7` | `6bf2fd5994bc8a4b6777c5b8ee63fa2fbe5c206ec59b06cf398a9d78ae4c3142` |
| `typescript/src/parser.c` | (regenerated) | `8226f09238872f3f4825892448ad71c70c30ad03b60b5e32385c32b1b59f1cb1` |
| `tsx/src/parser.c` | (regenerated) | `1de131b0b236d069d975e357dc73722585e12620e330c87d7b2125bfb2dc5bc1` |
| `tree-sitter-typescript.wasm` | — | `bfa93afb35585d68aaf753f0578716590b06fe5f5367af85ce8c80ff73078f56` |
| `tree-sitter-tsx.wasm` | — | `89212941fd61d3e15b0f5c5d3be4719ebe68decd77e319334980847bf594bfbd` |

## What the base fixes (marionebl, over v0.23.2)

- TypeScript 4.7 variance annotations (`<in T>`, `<out T>`, `<in out T>`), in a `variance` node.
- A generic call signature on its own line after a member with no `;` (upstream #335).
- Escape sequences in template literal types, `export type *`, ASI before `in` used as a name.

## What our fork adds

- From dokimasia/tree-sitter-typescript `55b0687` and `96ce7e6`: an import type is a primary
  type (`import("m").X[]`, `keyof import("m").X`), and `f<typeof import("m")>()` is a call.
- `out` as a type-parameter name (`type F<out> = out[]`, `<in out>`), and `<in const T>`.
- A member name with its signature on the next line (`find\n  <T>(id): T`,
  `find\n  (id): T`) stays one method. A never-produced `_member_signature_marker`
  external sits between the name and the signature of `method_signature`,
  `method_definition` and `abstract_method_signature`, and the scanner inserts no `;`
  where it is valid. (marionebl's #335 fix otherwise split such members.)
- Tagged templates with type arguments: ``sql<{ id: number }>`SELECT ...` ``. This is
  a branch of `call_expression` under the generic call's precedence, with required type
  arguments, so the existing `<`/`>` conflicts decide.
- `unique` as a name outside `unique symbol` (`i < unique.length`).
- Tuple labels named like type keywords: `[symbol: string]`, `[number?: string]` (upstream #378).

Every fix was gated by the differential (no new or worse file), and compared node by
node against the previous build: only files containing the targeted construct changed.
The fork's `CHANGELOG.md` lists node-type changes.

### Known limits

- `in` and `out` lex as keywords where a type parameter can start, so a type or JSX tag
  literally named `out` / `in` right after an expression `<` does not parse (`<out>x`,
  tsx `<out>…</out>`, `<out.Provider>`).
- Effect's three remaining failures: `let as = …` (`as` reads as the keyword),
  ``String.raw`'\1'`` (an invalid escape, which tagged templates allow), and one
  unexplained whole-file error in `Schema.tst.ts`.
- Not in the corpora but known: `in2` / `in$x` at the start of a line after a statement
  with no `;` (upstream #373), `accessor` / `abstract` / `declare` as member names
  followed by a line break (#369, #377), `a\n in(b)` read as a call to `in`,
  `(import("m").A)[]` and `f<import("m").Y>()`.
- The parser accepts some forms tsc rejects, such as `<out extends X>` and `<out in>`.

## Measured

Divergent files are those tsc parses clean and tree-sitter does not, from
`node scripts/ts-differential.mjs` (tsc 5.9.3, web-tree-sitter 0.25.10).

| corpus | files | v0.23.2 + old patch | marionebl 53071c9 | previous (fork PR #15) | now |
|---|---|---|---|---|---|
| Effect-TS/effect 7a87ff9 | 2,056 | 185 | 29 | 29 | 3 |
| colinhacks/zod 2554b70 | 515 | 0 | 0 | 0 | 0 |
| excalidraw/excalidraw dd2f8fc (.ts + .tsx) | 695 | 5 | 5 | 0 | 0 |
| microsoft/vscode ca43fc94 `src/` | 11,267 | 11 | 11 | 3 | 0 |
| **total** | | **201** | **45** | **32** | **3** |

The five `gap-*` fixtures are unchanged. The fork's corpus passes 127/127 tests.

## Rebuild

From the fork (once public) or from marionebl plus the patch:

```bash
git clone https://github.com/marionebl/tree-sitter-typescript
cd tree-sitter-typescript
git checkout 53071c97beb59f6ddc197a3473d22882ad756918
npm ci --ignore-scripts          # tree-sitter-javascript 0.23.1 (lockfile), the grammar it extends
git apply /path/to/codegraph/docs/grammars/tree-sitter-typescript.patch
(cd typescript && npx -y tree-sitter-cli@0.25.10 generate)
(cd tsx && npx -y tree-sitter-cli@0.25.10 generate)
npx -y tree-sitter-cli@0.25.10 build --wasm -o tree-sitter-typescript.wasm typescript
npx -y tree-sitter-cli@0.25.10 build --wasm -o tree-sitter-tsx.wasm tsx
# kernel: copy common/scanner.h, {typescript,tsx}/src/{parser.c,scanner.c,tree_sitter/}
# and LICENSE into codegraph-kernel/grammars/typescript/ keeping that layout
# (scanner.c includes ../../common/scanner.h)
```

Check each `generate` exit code, and check that both `parser.c` files say
`LANGUAGE_VERSION 15`: piping `generate` hides a failure, and `build` then compiles
marionebl's checked-in ABI 14 parser without complaint. (The patch carries only
`common/`; the fork's own corpus tests are not in it.) `build --wasm` uses the
`emscripten/emsdk` Docker image when no local emcc is present; the wasm bytes depend on
the emsdk build, so `parser.c` is the reproducible artifact. After updating either side,
rebuild the kernel (`npm run build:kernel`), run `kernel-grammar-parity.test.ts` and
`__tests__/typescript-member-asi-parse.test.ts` (node kinds the differential cannot see),
and run `node scripts/ts-differential.mjs`.

## Moving to a newer fork commit

Fixes land in the fork first, under its differential. To pick one up: copy the fork's
`common/scanner.h`, both `src/parser.c` and the built wasm here, regenerate
`tree-sitter-typescript.patch` as `git diff 53071c9 <commit> -- common/define-grammar.js
common/scanner.h`, update the table above, and re-baseline this repo's differential.
Tracking: inth3shadows/codegraph#11.
