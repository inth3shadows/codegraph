# TS grammar differential

The vendored `tree-sitter-typescript.wasm` / `tree-sitter-tsx.wasm` come from an
upstream grammar that is no longer maintained, and we carry patches on top of it.
This job makes `tsc` the ground truth on every grammar change.

## What it checks

`scripts/ts-differential.mjs` parses every `.ts`/`.tsx`/`.mts`/`.cts` file (`.d.ts`
included, `node_modules` excluded) in a set of pinned corpora with both parsers:

- **oracle**: `ts.createSourceFile(...).parseDiagnostics` (syntax only, no type check);
- **grammar**: `tree.rootNode.hasError` (`.tsx` uses the tsx wasm, everything else the typescript wasm).

Each file lands in one class: `agree-ok`, `agree-err` (both report an error),
`DIVERGENT` (tsc accepts it, tree-sitter reports an error) or `tsc-only-err` (counted only).

The gate: the run fails if a `DIVERGENT` file is not listed in
`scripts/ts-differential.baseline.json`. Baseline files that now agree are reported
(`now-agree`) but never fail the run. The in-repo fixtures
(`__tests__/fixtures/ts-syntax/`, one small file per modern construct) are baselined
the same way. `gap-*.ts` and `variance.ts` record constructs tsc accepts that the
grammar does not parse yet. A grammar that fixes one reports it as `now-agree`, which
is how a candidate grammar or fork is compared with ours.

Corpora (`scripts/ts-differential.corpora.json`, pinned by SHA): Effect, Zod,
Excalidraw, VS Code `src/`, plus the fixtures.

## Run it

```bash
npm ci --ignore-scripts                 # typescript + web-tree-sitter only; no build needed
node scripts/ts-differential.mjs                 # all corpora
node scripts/ts-differential.mjs --only local    # just the fixtures (fast)
node scripts/ts-differential.mjs --json out.json # full per-file results (first error row each)
```

Corpora are cloned (depth 1; VS Code blobless + sparse `src/`) into
`$TS_DIFF_CACHE`, default `~/.cache/codegraph-ts-differential/<name>-<sha12>`, and
re-used on later runs. The first run downloads a few hundred MB.

Exit codes: `0` no new divergences, `1` new divergences, `2` setup failure or the
installed `typescript` / `web-tree-sitter` version differs from the baseline's.

## Re-baseline

```bash
node scripts/ts-differential.mjs --update
```

Rewrites `scripts/ts-differential.baseline.json` (versions, wasm sha256, sorted
divergent paths per corpus). Review the diff and commit it with the change that caused it.
Re-baseline when:

- a grammar patch lands and the report says files `now-agree` (the baseline should shrink);
- `typescript` or `web-tree-sitter` is bumped (exit 2 asks for this): check that new
  divergences are real grammar gaps and not an oracle change;
- a corpus pin changes.

Never re-baseline to silence a new divergence on a file that tsc accepts: fix the
grammar, or record the gap deliberately in the commit message.

## CI

`.github/workflows/ts-differential.yml` runs on PRs and pushes to `main` that touch the
two wasm files, `codegraph-kernel/grammars/**`, `docs/grammars/tree-sitter-typescript.*`,
the script, corpora, baseline or fixtures, or `package-lock.json`. The job summary lists
per-corpus counts and the first 20 new divergences as `corpus:path:line`.

## Adding a fixture

Add one small file to `__tests__/fixtures/ts-syntax/` for a construct tsc accepts, and
run `node scripts/ts-differential.mjs --only local`. If the current grammar parses it,
you're done. If it doesn't, name the file `gap-<construct>.ts` and re-baseline
(`--update`), so the gap is recorded and its fix shows up as `now-agree`.
