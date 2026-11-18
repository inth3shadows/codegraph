# tree-sitter-typescript — provenance

The TypeScript and TSX grammars come from
[inth3shadows/tree-sitter-typescript](https://github.com/inth3shadows/tree-sitter-typescript),
a maintained fork of tree-sitter/tree-sitter-typescript, which has had no commit since v0.23.2
(January 2025; tree-sitter/tree-sitter discussion #6091). The fork checks every grammar change
against `tsc` in its CI. It is published as `tree-sitter-typescript-next`, and codegraph takes
both parsers from release 0.25.2 (commit `1e68d2a`):

- **Native kernel:** the crate, under upstream's name, in `codegraph-kernel/Cargo.toml`:
  `tree-sitter-typescript = { package = "tree-sitter-typescript-next", version = "=0.25.2" }`.
  Its library keeps upstream's name, so `codegraph-kernel/src/langs.rs` is unchanged.
- **Wasm:** `src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` are the files in the npm
  package `tree-sitter-typescript-next@0.25.2`, unchanged:

| file | sha256 |
|---|---|
| `tree-sitter-typescript.wasm` | `f956278af2135853d4e13bc897b640589145847c2dc56719110f114cd9f80247` |
| `tree-sitter-tsx.wasm` | `b631c451f8c589972ed63e0a4fa8b7f9b93b9fbae61adf8878e07f6567f90397` |

The crate and the npm package are built from the same generated `parser.c`, so
`kernel-grammar-parity.test.ts` holds.

## What changes against v0.23.2

Over 0.23.2, the fork nests expressions and types the way tsc does, and adds parses tsc accepts.
The fork's `CHANGELOG.md` lists each change, and every node-type change. The ones codegraph
notices most:

- Variance annotations (`interface Stream<out A, in E>`), `using` / `await using` (also in `for`
  heads), import types (`import("m").T[]`, `f<import("m").Y>()`), and tagged templates with
  type arguments now parse. Before, each was a parse error, and a `for (using r of rs)` head
  turned its whole function into an ERROR, so it was indexed as nothing.
- An operator before a generic call applies to the whole call (`await f<T>(x)` is an
  `await_expression` around the `call_expression`). `as` and `satisfies` take tsc's relational
  precedence, and `!` binds to the operand before it (`a + b!` is `a + (b!)`).
- Import types are an `import_type` node. `src/resolution/import-resolver.ts` resolves
  `import("m").A.B` through module m's exports, the way `import * as ns from "m"` does. A
  module outside the project links nothing; name matching alone reached any type of the same
  name.

## Measured

Tree accuracy is the fork's `scripts/tree-accuracy.mjs`: each expression and type node is
compared with the node tsc 5.9.3 builds for the same span. It was measured on files the fork
was never tuned on (angular `packages`, nestjs/nest, vite `packages`, trpc, shadcn-ui at pinned
commits; 13,134 files tsc parses cleanly):

| grammar | wrong nodes | missed nodes | files with an ERROR |
|---|---|---|---|
| tree-sitter-typescript 0.23.2 | 2,430 | 886 | 43 |
| tree-sitter-typescript-next 0.25.2 | 63 | 14 | 4 |

53 of the 63 wrong nodes are a counting convention, not a parse error: `asserts x is T` nests a
`type_predicate` inside `asserts`, where tsc has one node. On the fork's own corpora (Effect,
Zod, Excalidraw, VS Code `src/`), no file tsc accepts has a parse error.

## Known limits

- An import type's module is read from the source text. Some layouts are not recognized, and
  their name is matched by name alone:
  - an `import(` more than 12 lines before the name;
  - a line break or comment right after the `.`;
  - a `//` comment holding `*/`, or a `//` inside a multi-line block comment, between `)` and `.`.
- A one-line generated `.d.ts` with many import types costs quadratic time in its length.
