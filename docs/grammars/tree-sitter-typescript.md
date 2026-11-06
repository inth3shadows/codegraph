# tree-sitter-typescript — provenance & patch

`src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` and the kernel's
vendored C (`codegraph-kernel/grammars/typescript/`) are built from
**inth3shadows/tree-sitter-typescript** commit `1439129`, our own fork of the
grammar. This is the one place that names the commit; the code comments point here. It is private while it is being burned in, so the public,
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

| file | base (marionebl 53071c9) sha256 | ours (fork 1439129) sha256 |
|---|---|---|
| `common/define-grammar.js` | `1791f937a3d122b49b6d9cc539f6ce8462bf3ea30c2b170904221c11702b4899` | `b06b7801f18ba7e69295b19f27368636b049476b73e094a4be5f7910b0224269` |
| `common/scanner.h` | `2bf0b2ca94babda0682baee5031b152a69ff058a752407775c0419094ebfd1a7` | `6bf2fd5994bc8a4b6777c5b8ee63fa2fbe5c206ec59b06cf398a9d78ae4c3142` |
| `typescript/src/parser.c` | (regenerated) | `d4033c44e73006419f890b41780324c9bc26a2679e9045956210331a9d6d3c4a` |
| `tsx/src/parser.c` | (regenerated) | `5372712651e0d900af85fb760f358a7b0b39a3ef624f575d4952c84e5e2ff2a7` |
| `tree-sitter-typescript.wasm` | — | `a4f6366673b68181d171d52f099ac2083f064a5b5c646f559a186b602e21fc86` |
| `tree-sitter-tsx.wasm` | — | `f6974cd56d78975a7a17888ae5be165becd368661982af89e8c63b35426a2f15` |

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
- Tuple labels named like type keywords: `[symbol: string]`, `[number?: string]`,
  `[readonly: T]` (upstream #378). The keyword labels are a chosen list (any number
  boolean string symbol object never unknown readonly new keyof), each a word that already
  lexes as a keyword where a type starts; a type named `type`, `get` or `declare` still
  works: `[type]`.

Every fix was gated by the differential (no new or worse file), and compared node by
node against the previous build: only files containing the targeted construct changed
(34 corpus files against the previous vendored grammar). The fork's `CHANGELOG.md`
lists node-type changes. `__tests__/typescript-grammar-fork-shapes.test.ts` pins the
node shapes and the call edges codegraph derives from them.

### Known limits

- `in` and `out` lex as keywords where a type parameter can start, so a type or JSX tag
  literally named `out` / `in` right after an expression `<` does not parse (`<out>x`,
  tsx `<out>…</out>`, `<out.Provider>`).
- `unique` lexes as the keyword of `unique symbol` wherever a type can start, so
  `i < unique.length` fails (VS Code's two remaining files), and so do `unique` used as a
  type (`let x: unique`, `unique[]`, `implements unique`) and as a tuple label
  (`[unique: T]`). Declaring `type unique = 1` works. Making `unique` a reserved
  identifier fixed the comparison but broke `f<typeof unique>(x)`, so it was backed out;
  lexing `unique symbol` as one token is the next thing to try.
- Other words that lex as keywords where a type starts still fail as tuple labels:
  `[void: T]`, `[null: T]`, `[undefined: T]`, `[this: T]`, `[typeof: T]`, `[infer: T]`,
  `[true: T]`, `[false: T]`, `[import: T]`, `[abstract: T]`.
- An operator in front of a typed tag takes the tag's call: ``a + b<T>`c` `` and
  ``!f<T>`c` `` parse as a call whose function is `a + b` / `!f`, with no error. Generic
  calls have always done the same (`a + b<T>(c)`); behind `await` codegraph still records
  the call. A typed tag with two or more type arguments inside an argument list or array
  (``f(sql<Row, Err>`x`)``) still parses as two comparisons.
- Effect's three remaining failures: `let as = …` (`as` reads as the keyword),
  ``String.raw`'\uZZZZ'`` (an invalid escape, which tagged templates allow), and one
  unexplained whole-file error in `Schema.tst.ts`.
- Not in the corpora but known: `in2` / `in$x` at the start of a line after a statement
  with no `;` (upstream #373), `in?: T` and `in<T>()` members after a property or a
  signature with no `;` (`a = 1\n in?: T`; after a method body they parse),
  `accessor` / `abstract` / `declare` as member names followed by a line break (#369,
  #377), `a\n in(b)` read as a call to `in`, `(import("m").A)[]` and `f<import("m").Y>()`.
- The parser accepts some forms tsc rejects, such as `<out extends X>` and `<out in>`.

## Measured

Divergent files are those tsc parses clean and tree-sitter does not, from
`node scripts/ts-differential.mjs` (tsc 5.9.3, web-tree-sitter 0.25.10).

| corpus | files | v0.23.2 + old patch | marionebl 53071c9 | previous (fork PR #15) | now |
|---|---|---|---|---|---|
| Effect-TS/effect 7a87ff9 | 2,056 | 185 | 29 | 29 | 3 |
| colinhacks/zod 2554b70 | 515 | 0 | 0 | 0 | 0 |
| excalidraw/excalidraw dd2f8fc (.ts + .tsx) | 695 | 5 | 5 | 0 | 0 |
| microsoft/vscode ca43fc94 `src/` | 11,267 | 11 | 11 | 3 | 2 |
| **total** | | **201** | **45** | **32** | **5** |

The five original `gap-*` fixtures are unchanged, and `gap-unique-in-comparison` records
the `unique` gap. The fork's corpus passes 127/127 tests.

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
npx -y tree-sitter-cli@0.25.10 test     # marionebl's corpus; the fork's own tests are not in the patch
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

Fixes land in the fork first, under its differential. To pick one up:

1. Copy from the fork: `common/scanner.h`, `{typescript,tsx}/src/{parser.c,scanner.c}`,
   `{typescript,tsx}/src/tree_sitter/*.h` and `LICENSE` into
   `codegraph-kernel/grammars/typescript/` (same layout), and the built
   `tree-sitter-{typescript,tsx}.wasm` into `src/extraction/wasm/`.
2. Regenerate `tree-sitter-typescript.patch` as `git diff 53071c9 <commit> --
   common/define-grammar.js common/scanner.h`.
3. Update the commit and the hashes here and in `codegraph-kernel/build.rs`'s comment.
4. `npm run build:kernel`, then `kernel-grammar-parity.test.ts`,
   `typescript-member-asi-parse.test.ts`, `typescript-variance-parse.test.ts` and
   `typescript-grammar-fork-shapes.test.ts`, and re-baseline this repo's differential.
   Check that `<out>` still parses as a parameter name, `[out: T]` as a tuple label, and
   `<in const T>` with `const` after the variance.

The member marker is also valid in some states where `||` is (such as `{ a` at the start
of a statement). The scanner's `(`/`[`/`<` case already returns no `;` there, so it
changes nothing, but reusing the marker for another character would need that same
guard. Tracking: inth3shadows/codegraph#11.
