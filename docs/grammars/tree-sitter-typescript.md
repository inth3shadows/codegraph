# tree-sitter-typescript — provenance & patch

`src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` and the kernel's
vendored C (`codegraph-kernel/grammars/typescript/`) are built from
**inth3shadows/tree-sitter-typescript** commit `ed828ca`, our own fork of the
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

| file | base (marionebl 53071c9) sha256 | ours (fork ed828ca) sha256 |
|---|---|---|
| `common/define-grammar.js` | `1791f937a3d122b49b6d9cc539f6ce8462bf3ea30c2b170904221c11702b4899` | `73b4e3dad330d0683871c4ffb27987e19ddf3488ba14664d3e15e7a4cae137dd` |
| `common/scanner.h` | `2bf0b2ca94babda0682baee5031b152a69ff058a752407775c0419094ebfd1a7` | `23fd656d7e82f80bf66e0b9b8ef96aa6102ef5bfd9f32c561a4caabe08b9fd34` |
| `typescript/src/parser.c` | (regenerated) | `db8c411258ff82520df32ad7213be1c9a60c0cec77fdb6d28858014ae92ea0aa` |
| `tsx/src/parser.c` | (regenerated) | `34f37cd33244724c9d5dc4863123f3a5f6a919f4f472c31981610f6442077394` |
| `tree-sitter-typescript.wasm` | — | `abeb7a0a4eea3007ac0e83a383c0068e336b25880de9e374a57267c15ed5fe9d` |
| `tree-sitter-tsx.wasm` | — | `a64f018a0a2843df0d46ece1fbf87d89a0d3e5001fd94c75f9fb2e4c0fea0a77` |

## What the base fixes (marionebl, over v0.23.2)

- TypeScript 4.7 variance annotations (`<in T>`, `<out T>`, `<in out T>`), in a `variance` node.
- A generic call signature on its own line after a member with no `;` (upstream #335).
- Escape sequences in template literal types, `export type *`, ASI before `in` used as a name.

## What our fork adds

- Members named `abstract` in classes, interfaces and object types (upstream #377),
  and class fields and methods named `accessor` (upstream #369). A bare name before
  a line break and an ordinary next member remains its own field; a signature on the
  next line still belongs to that method. `accessor` keyword names are confined to
  class members so type arguments, parenthesized/qualified types and object shorthand
  retain their previous trees.
- Auto-accessor fields after `static`, `override` or `abstract`, including static
  private names and accessibility modifiers (upstream #369).
- Type queries of a value named `abstract`, including qualified, parenthesized and
  instantiated names, retain generic calls and typed tags such as `f<typeof abstract>(0)`.
  Runtime `typeof` calls, optional chains and indexed members remain expressions when
  they are not valid query names; they do not become phantom generic calls. Query and
  expression branches survive until the following syntax decides between them.
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
  `[readonly: T]`, `[unique: T]` (upstream #378). The keyword labels are a chosen list (any number
  boolean string symbol object never unknown readonly new keyof), each a word that already
  lexes as a keyword where a type starts; a type named `type`, `get` or `declare` still
  works: `[type]`.
- `unique symbol` is one token, so `unique` alone is a name: `i < unique.length`,
  `implements unique`, `[unique: T]`. Between the words it takes any whitespace the grammar
  skips elsewhere (`unique\u00A0symbol`) and comments; a line comment must reach its
  newline, so `a < unique // the symbol` stays a comparison.
  (Making `unique` a reserved identifier instead broke `f<typeof unique>(x)`.)
- A bare `\x` or `\u` (no hex digits after it) in a template string or template literal
  type, which tagged templates allow: ``String.raw`\usepackage` `` (upstream #353), and
  ``f<`\u`>(1)`` stays a call. Strings still reject it; untagged templates and type
  templates with substitutions accept it though tsc does not (one token cannot see the tag).
- ASI before a line starting with `in2` or `in$x` (upstream #373), and before a member named
  `in` on the next line of a class or object type: `in?:` always; `in(`, `in<T>(` and `in!:`
  after a member that cannot continue (a typed member, a method); and `in(…)` followed by `:`
  or `{` even after an initializer (`a = () => {}\n in(): void {}`; strings and comments inside
  the parameters are skipped, so `a = x\n in(")")` stays the operator). A never-produced
  `_member_end_marker` external, valid only where a member ends, tells the scanner it is
  between members, so `for (var k\n in!o)` stays a for-in and `a\n in(b)` / `a = x\n in(b)`
  stay `in` operators.
  The marker costs parse-table size, not speed: STATE_COUNT 6124 -> 7239 (typescript) and
  6242 -> 7391 (tsx), wasm +15%; parsing 3,000 vscode files ran at the same 2.8-3.0 MB/s with the
  same load time and RSS. Most of it is the class-body placement (after a field initializer).

Every fix was gated by the differential (no new or worse file) and by a tsc fixture for its
construct. The fork's `CHANGELOG.md` lists node-type changes. `__tests__/typescript-grammar-fork-shapes.test.ts` pins the
node shapes and the call edges codegraph derives from them.

### Known limits

- `in` and `out` lex as keywords where a type parameter can start, so a type or JSX tag
  literally named `out` / `in` right after an expression `<` does not parse (`<out>x`,
  tsx `<out>…</out>`, `<out.Provider>`).
- Other words that lex as keywords where a type starts still fail as tuple labels:
  `[void: T]`, `[null: T]`, `[undefined: T]`, `[this: T]`, `[typeof: T]`, `[infer: T]`,
  `[true: T]`, `[false: T]`, `[import: T]`, `[abstract: T]` (`[unique: T]` works).
- An operator in front of a typed tag takes the tag's call: ``a + b<T>`c` `` and
  ``!f<T>`c` `` parse as a call whose function is `a + b` / `!f`, with no error. Generic
  calls have always done the same (`a + b<T>(c)`); behind `await` codegraph still records
  the call. This includes the generic/unary binding in `typeof obj?.method<T>(x)`.
  A typed tag with two or more type arguments inside an argument list or array
  (``f(sql<Row, Err>`x`)``) still parses as two comparisons.
- Effect's two remaining failures: `let as = …` (`as` reads as the keyword) and one
  unexplained whole-file error in `Schema.tst.ts`.
- Not in the corpora but known: `abstract` and `readonly` as type names; ASI after a
  bare modifier/member name before a generator, `in` or `instanceof`, or across a
  multi-line comment (fork #26). `(import("m").A)[]` and `f<import("m").Y>()` also fail.
- The parser accepts some forms tsc rejects, such as `<out extends X>` and `<out in>`, and a bare
  `\x`/`\u` in an untagged template (``const a = `\u` ``) or in a type template with a
  substitution (``type T = `\u${string}` ``).
- A member named `in` written `in = 1`, `in;`, a bare `in`, or `in[k]: T` right after a
  member with no `;` still fails, as do `in!:` and `in<T>` after any field initializer
  (arrows included). `in?:` parses after any member (after an initializer tsc rejects it).
  After a block-bodied arrow field, a bare `in(...)` with no `:` or `{` after it, such as a method
  overload signature `in(x: string)`, reads as the `in` operator (no error). Only spaces and tabs
  may sit between `in` and the `(`, `?`, `<` or `!` that follows; `in : T` (a space before the
  colon), a comment, or a line break there fails. A regex literal containing a quote, `)` or `//`
  inside `in(...)` after an initializer can make the parameter scan misjudge it (ERROR).
- `unique` followed by a word starting with `symbol` (`unique\nsymbolic()`, `unique symbolic`)
  fails: the `unique symbol` token matches the prefix.
- A comment between `unique` and `symbol` is part of the token (no `comment` node).

## Measured

Divergent files are those tsc parses clean and tree-sitter does not, from
`node scripts/ts-differential.mjs` (tsc 5.9.3, web-tree-sitter 0.25.10).

| corpus | files | v0.23.2 + old patch | marionebl 53071c9 | previous (fork PR #15) | now |
|---|---|---|---|---|---|
| Effect-TS/effect 7a87ff9 | 2,056 | 185 | 29 | 29 | 2 |
| colinhacks/zod 2554b70 | 515 | 0 | 0 | 0 | 0 |
| excalidraw/excalidraw dd2f8fc (.ts + .tsx) | 695 | 5 | 5 | 0 | 0 |
| microsoft/vscode ca43fc94 `src/` | 11,267 | 11 | 11 | 3 | 0 |
| **total** | | **201** | **45** | **32** | **2** |

Four unrelated `gap-*` fixtures remain; the static-accessor gap is now a normal
regression fixture. The fork's corpus passes 146/146 tests.

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
