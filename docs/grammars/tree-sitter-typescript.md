# tree-sitter-typescript — provenance & patch

`src/extraction/wasm/tree-sitter-{typescript,tsx}.wasm` and the kernel's
vendored C (`codegraph-kernel/grammars/typescript/`) are both built from
[tree-sitter/tree-sitter-typescript](https://github.com/tree-sitter/tree-sitter-typescript)
(MIT) tag `v0.23.2` (commit `f975a621f4e7f532fe322e13c4f79495e0a7b2e7`) with
the patch in `tree-sitter-typescript.patch` applied to the grammar source.

Unlike the other patched grammars, this patch changes a grammar **rule**, so
the parser is **regenerated** with tree-sitter-cli 0.25.10 (ABI 15). The
tag's checked-in `parser.c` is not used. The kernel compiles the same
generated C (build.rs) in place of the `tree-sitter-typescript` crate, so the
two paths stay table-identical (`kernel-grammar-parity.test.ts`).

| file | upstream sha256 | patched sha256 |
|---|---|---|
| `common/define-grammar.js` | `c2ac6894e0db6164f56dc339788d9da2da60ce1f81d888e6b74a74fc81db818f` | `733885a86fc1c4aed35faab7b1df2967db8941a4f2bdc216753dc0950e36ce66` |
| `common/scanner.h` | `da66ef2bd14a3f7ea743e25ba068c6c9aae2c3509db200ff80c4a0e6116e564c` | `7c86573b376ddb434b618ddb5ec13ee62ff542d2c647392194398248f55c056e` |
| `typescript/src/parser.c` | (regenerated) | `9e2b347c5ac6c5d34663de78c25a1f0739e8523736617e0a1f2d7e54662dbe87` |
| `tsx/src/parser.c` | (regenerated) | `7d55868a27f71c5e1a58c09e182e874bfcd1d1fca46da59edede2f449106b6af` |
| `tree-sitter-typescript.wasm` | `3a44d634c9840dccec36f33b99592bd086a2f940e9cd80c64347c45b7dce662f` | `ff0905cf6086f8f769b112fcb77661747a8d41e5224797bcc61a782b2fcaf4d0` |
| `tree-sitter-tsx.wasm` | `8f647a1b2cafe9ab00fb2056d79021d2a144ba17a72f45511072311c1b05d08e` | `4341fbd1f2a6c93ea42cae7e7243b4d2a4cf8701b36ebc1085cc82a9f4135778` |

## What the patch fixes

Two upstream bugs. In large files their errors pile up until tree-sitter
gives up and parses the whole file as a single `ERROR`, so files that index
as almost nothing are the visible symptom.

1. **Variance annotations** (TypeScript 4.7): `interface Stream<out A, in E>`
   and `<in out T>` were parse errors. `type_parameter` now takes an optional
   `in`, `out` or `in out` before the name. `out` stays usable as a parameter
   name (`type F<out> = out[]`, `<in out>` meaning modifier `in` on a parameter
   named `out`), as tsc accepts both. This is the change from upstream PR #364
   plus the name alias from brajevicm/tree-sitter-typescript@9fcaa13. Both
   upstream PRs (#361, #364) break `<out>` as a name without that alias.
   Upstream issue: #370.
2. **Generic call signature on its own line** (upstream #335): in an object
   type or interface, a member that starts with `<`, such as an overload
   `<A>(self: A): A` written after another member with no `;`, was read as
   type arguments to the previous member's type. The external scanner already
   inserts an automatic semicolon before `(` and `[` on a new line when it is
   inside a type (a binary operator is not valid there). `<` now gets the same
   rule. That matches tsc, which reads type arguments only when no line break
   precedes the `<`. In expressions `a\n< b` is still a comparison.

The rule `<out extends X>` is still rejected; tsc rejects it too (TS1359).

## Measured

These numbers compare files parsed with the previous wasm and with the
patched one (web-tree-sitter 0.25.10). An identical tree means the same node
types, fields and byte ranges.

| corpus | files | files with an error | lines inside ERROR | trees changed |
|---|---|---|---|---|
| Effect-TS/effect 7a87ff9 | 2,054 | 239 → 32 | 165,462 → 21,520 | 210 (207 now error-free, none newly broken) |
| colinhacks/zod 2554b70 | 481 | 4 → 0 | 21 → 0 | 4 |
| microsoft/vscode ca43fc94 `src/` | 11,265 | 11 → 11 | 11 → 11 | 0 |

Regenerating the unpatched grammar with 0.25.10 gives a tree identical to
the previous wasm on every file of all three corpora, so the regeneration
itself changes nothing. The upstream corpus (112 tests) passes before and
after the patch.

## Rebuild

```bash
git clone https://github.com/tree-sitter/tree-sitter-typescript
cd tree-sitter-typescript
git checkout f975a621f4e7f532fe322e13c4f79495e0a7b2e7
npm ci --ignore-scripts          # tree-sitter-javascript 0.23.1, the grammar it extends
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

`build --wasm` uses the `emscripten/emsdk:4.0.4` Docker image when no local
emcc is present. The wasm bytes depend on the emsdk build, so a rebuild may
not match the hashes above byte for byte. `parser.c` is the reproducible
artifact. After updating either side, rebuild the kernel
(`npm run build:kernel`) and run `kernel-grammar-parity.test.ts`.

## Dropping the patch

When upstream merges a variance fix (and #335), bump to that release, check
that `<out>` still parses as a name, and go back to the crate and the
checked-in `parser.c`. Tracking: inth3shadows/codegraph#11.
