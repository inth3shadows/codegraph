# Vendored tree-sitter runtime (web-tree-sitter 0.25.10 + #5997)

`src/extraction/runtime/tree-sitter.wasm` replaces the `tree-sitter.wasm` that ships in the
web-tree-sitter npm package. `initGrammars()` loads it through `Parser.init({ locateFile })`
and throws if it is missing. `copy-assets` copies it into `dist/extraction/runtime/`, and
`scripts/check-ui-build.mjs` fails a build without it.

## Why

tree-sitter's error recovery before 0.27.1 can loop forever: after removing a stack version
it skips the version that shifted into its slot, so recovery keeps restarting without
consuming input (tree-sitter/tree-sitter#5997). In codegraph a `.tsx` file containing
`<a {{b:>c:d(e f)` timed out its parse worker three times (3 x 30s) and was then dropped
from the index. Upstream report: tree-sitter/tree-sitter-typescript#323.

0.27.1 has the fix, but it only loads grammars with a `dylink.0` section. Every
tree-sitter-wasms 0.1.x grammar and the vendored Dart wasm use the legacy `dylink`
section, so 0.27.1 drops about 20 languages (193 failing tests). This build is
0.25.10 plus the 3-line fix, and it still loads every grammar.

## Provenance

| | |
|---|---|
| source | tree-sitter/tree-sitter `v0.25.10` (da6fe9beb4f7f67beb75914ca8e0d48ae48d6406) |
| patch | `docs/grammars/web-tree-sitter-runtime.patch` (`lib/src/parser.c`, from #5997) |
| build | `cargo xtask build-wasm` (emscripten 4.0.4 via docker, `cli/loader/emscripten-version`) |
| output | `lib/binding_web/lib/tree-sitter.wasm` |
| sha256 | `d48b82be2c17998ef4b2b9ab0cadbbd5ae838ef6ff0eca37b9c12ab887988d78` |

Reproducibility check: the same build without the patch produced
`f38dcc4b43b818f9a0785bc1c6d5611a75ac4cdd428ff3f02757c34ca4e46d7f`, which is byte-identical to
`node_modules/web-tree-sitter/tree-sitter.wasm` from npm 0.25.10. The vendored file therefore
differs from npm's only by the patch, and it pairs with npm's 0.25.10 JS glue.

## Rebuild

```sh
git clone --depth 1 --branch v0.25.10 https://github.com/tree-sitter/tree-sitter.git ts
cd ts && git apply <codegraph>/docs/grammars/web-tree-sitter-runtime.patch
cargo xtask build-wasm
cp lib/binding_web/lib/tree-sitter.wasm <codegraph>/src/extraction/runtime/tree-sitter.wasm
```

## Rules

- web-tree-sitter is pinned exactly (`0.25.10`). `__tests__/tsx-error-recovery-hang.test.ts`
  fails if the installed version moves, because new glue with this wasm is untested.
- The same test fails under the unpatched npm runtime (`did not finish within 2000ms`).
- Exit: once the legacy-`dylink` grammars are rebuilt (or tree-sitter-wasms is replaced), move to
  web-tree-sitter 0.27.1+ and delete this runtime, the patch and this file.
- The native kernel (`codegraph-kernel`, Rust `tree-sitter` 0.25) carries the same bug and is
  not patched here.
