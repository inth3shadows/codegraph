# tree-sitter-typescript — provenance & patch

`src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` and the kernel's
vendored C (`codegraph-kernel/grammars/typescript/`) are built from
**inth3shadows/tree-sitter-typescript** release `v0.25.2` (commit `1e68d2a`, 2026-11-18; published as `tree-sitter-typescript-next` 0.25.2 on crates.io and npm), our own fork of the
grammar. This is the one place that names the commit; the code comments point here. The fork is public (MIT).
Its reproducible form from the original base is
[marionebl/tree-sitter-typescript](https://github.com/marionebl/tree-sitter-typescript)
(MIT) commit `53071c97beb59f6ddc197a3473d22882ad756918` with
`tree-sitter-typescript.patch` applied to `common/define-grammar.js`,
`common/scanner.h`, `tsx/src/scanner.c` and `tree-sitter.json` (whose version the generated
parser records). The two give byte-identical sources, and `tree-sitter generate` gives
byte-identical `parser.c` files.

The lineage is tree-sitter/tree-sitter-typescript v0.23.2, which has had no
commit since 2025-01-30 (tree-sitter/tree-sitter#6091); then marionebl's fork;
then ours, which adds dokimasia's two import-type commits, our own fixes, and
the tsc differential as its CI. The parsers are generated with tree-sitter-cli
0.25.10 (ABI 15); marionebl's checked-in ABI 14 `parser.c` is not used. The
kernel compiles the same generated C (build.rs) in place of the
`tree-sitter-typescript` crate, so the two paths stay table-identical
(`kernel-grammar-parity.test.ts`) and share one external scanner.

| file | base (marionebl 53071c9) sha256 | ours (fork v0.25.2) sha256 |
|---|---|---|
| `common/define-grammar.js` | `1791f937a3d122b49b6d9cc539f6ce8462bf3ea30c2b170904221c11702b4899` | `a6896ee4914d464899fcfb0658dd0048b0c464161599e48a9712420be5da4a5c` |
| `common/scanner.h` | `2bf0b2ca94babda0682baee5031b152a69ff058a752407775c0419094ebfd1a7` | `ce8180d07ed12e5235c8875842a751da7d13cdcd8cdd0bfe398ec044a8e6aa9f` |
| `tsx/src/scanner.c` | `d563cd30b2f39718c9ae4292795c5ce03a2ad01954ba3a86ef84c2781a736673` | `d66248c9a043c34b74342c8aa6ca69904faafdd39e28bdac6c6d58217e17d4ec` |
| `tree-sitter.json` | `4f39daa6a0bde84506cdeaf0b4460ed262df880030b3e6073868d0c746932291` | `5519029bd93240aa13b83db962aab985eaf1f359b69a7a96c61f6d917b4452dc` |
| `typescript/src/parser.c` | (regenerated) | `83c7c1dc70b5062809c35d1aafc737218ab501fa5cc08f32a275a660721c3721` |
| `tsx/src/parser.c` | (regenerated) | `1094e54097329927ec9b24827fa40d863fd352c1be2b96c48aa2ae6885cff97f` |
| `tree-sitter-typescript.wasm` | — | `f956278af2135853d4e13bc897b640589145847c2dc56719110f114cd9f80247` |
| `tree-sitter-tsx.wasm` | — | `b631c451f8c589972ed63e0a4fa8b7f9b93b9fbae61adf8878e07f6567f90397` |

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

Since `ed828ca` (the previous vendored commit), the fork moved to 0.24.0 and fixed how
expressions and types nest, as tsc nests them. The fork's `CHANGELOG.md` has each case:

- An operator before a generic call or a typed tag applies to the whole call: `await f<T>(x)`
  is an `await_expression` around the call, and `a + b<T>(c)`, ``!f<T>`c` `` and
  ``f(sql<Row, Err>`x`)`` nest as in tsc.
- `await x as T` casts the awaited value; `as` and `satisfies` take tsc's relational
  precedence (`a ?? b as T` is `a ?? (b as T)`).
- A non-null assertion binds to the operand before it (`a + b!` is `a + (b!)`), and after
  `new` to the constructor (`new a.b!.C()`).
- `readonly` and a constructor type's return type nest like `keyof` and a function type's;
  a constructor type may return a type predicate or an assertion; `asserts` names a type
  unless an identifier follows on the same line.
- A cast to a three-segment qualified name, and an optional tuple element inside a
  parenthesized type, keep their whole span.
- New nodes: `import_type` for an import used as a type (`(import("m").A)[]` and
  `f<import("m").Y>()` now parse; codegraph follows `import("m").A.B` through module m's
  exports, as `import * as ns from "m"`, and links nothing for a module outside the project), and `using_declaration` for `using` / `await using`,
  also in `for` heads. A re-export takes import attributes (`export * from "x" with {…}`).
- A same-line comment after the closing brace of a method, a function or arrow expression, or a
  static block belongs to what holds that body, not to the body (fork #115, in 0.25.1).
- `let as = 1` and `let satisfies = …` declare variables; a mapped type's key may be named
  `type`; `global { … }` without `declare`; a default-exported function signature may omit
  its name (codegraph then records no function for it).

Before this update, a `for (using r of rs)` head made the whole enclosing function an ERROR
and codegraph recorded no function and no calls for it; now both are recorded.

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
- Not in the corpora but known: `abstract` and `readonly` as type names; ASI after a
  bare modifier/member name before a generator, `in` or `instanceof`, or across a
  multi-line comment (fork #26).
- A type predicate on a parameter named `asserts` (`(asserts) => asserts is T`) is an ERROR.
- codegraph reads an import type's module from the source text, so some layouts are not
  recognized and their name is matched by name alone: an `import(` that starts more than 12 lines
  before the name, a line break or comment right after the `.` (`import("m").⏎ T`), a `//`
  comment whose text holds `*/`, or a `//` inside a multi-line block comment between `)` and `.`.
  A one-line generated `.d.ts` with many import types also costs time quadratic in its length.
  (Tracked: read the module from the `import_type` node at extraction instead.)
- In a parenthesized, multi-line arrow that returns an arrow (`((\n (): D => (a, b) => …))`),
  the arrow nests one level off from tsc's tree (no ERROR; found in 2 files of nestjs/nest).
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

| corpus | files | v0.23.2 + old patch | marionebl 53071c9 | fork PR #15 | fork ed828ca | now (v0.25.2) |
|---|---|---|---|---|---|---|
| Effect-TS/effect 7a87ff9 | 2,056 | 185 | 29 | 29 | 2 | 0 |
| colinhacks/zod 2554b70 | 515 | 0 | 0 | 0 | 0 | 0 |
| excalidraw/excalidraw dd2f8fc (.ts + .tsx) | 695 | 5 | 5 | 0 | 0 | 0 |
| microsoft/vscode ca43fc94 `src/` | 11,267 | 11 | 11 | 3 | 0 | 0 |
| **total** | | **201** | **45** | **32** | **2** | **0** |

No `gap-*` fixture remains: `using` and `await using` in `for` heads and import attributes on
`export … from` parse now, and those four are ordinary regression fixtures. The fork's
corpus passes 244/244 tests.

The differential sees parse errors only. Tree accuracy (`scripts/tree-accuracy.mjs` in the
fork: each node of the tree against the node tsc 5.9.3 builds for the same span) was also
measured on five repositories the fork was never tuned on, 13,134 files tsc parses cleanly:
angular/angular `packages` 9f4c159, nestjs/nest 085f83a, vitejs/vite `packages` 60c260d,
trpc/trpc 4817d77 and shadcn-ui/ui 968d8cb.

| build | wrong nodes | missed nodes | files with an ERROR |
|---|---|---|---|
| v0.23.2 | 2,430 | 886 | 43 |
| fork ed828ca | 2,374 | 848 | 6 |
| fork v0.25.2 | 63 | 14 | 4 |

53 of the 63 wrong nodes are one counting convention, not a parse error: the grammar
nests a `type_predicate` inside `asserts` (as v0.23.2 does), where tsc has one node.

## Rebuild

From the fork, or from marionebl plus the patch:

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
marionebl's checked-in ABI 14 parser without complaint. (The patch carries the
grammar sources and `tree-sitter.json`; the fork's own corpus tests are not in it.) `build --wasm` uses the
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
   common/define-grammar.js common/scanner.h tsx/src/scanner.c tree-sitter.json`.
3. Update the commit and the hashes here and in `codegraph-kernel/build.rs`'s comment
   (`common/scanner.h`, `tsx/src/scanner.c` and both `parser.c`).
4. `npm run build:kernel`, then `kernel-grammar-parity.test.ts`,
   `typescript-member-asi-parse.test.ts`, `typescript-variance-parse.test.ts` and
   `typescript-grammar-fork-shapes.test.ts`, and re-baseline this repo's differential.
   Check that `<out>` still parses as a parameter name, `[out: T]` as a tuple label, and
   `<in const T>` with `const` after the variance.

The member marker is also valid in some states where `||` is (such as `{ a` at the start
of a statement). The scanner's `(`/`[`/`<` case already returns no `;` there, so it
changes nothing, but reusing the marker for another character would need that same
guard. Tracking: inth3shadows/codegraph#11.
