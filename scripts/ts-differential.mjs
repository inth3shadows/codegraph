#!/usr/bin/env node
/**
 * TypeScript grammar differential: tsc is the ground truth for "is this file
 * syntactically valid TypeScript"; the vendored tree-sitter-typescript/tsx
 * wasm grammars are checked against it over pinned real-world corpora.
 *
 * Per file:
 *   oracle  ts.createSourceFile(...).parseDiagnostics  (syntax only, no type check)
 *   grammar tree.rootNode.hasError                     (.tsx -> tsx wasm, else typescript wasm)
 *   class   agree-ok | agree-err | DIVERGENT (tsc ok, tree-sitter err) | tsc-only-err
 *
 * Gate: exit 1 when a DIVERGENT file is not in scripts/ts-differential.baseline.json.
 * Baseline files that now agree are reported (re-baseline), never a failure.
 * The "local" corpus (__tests__/fixtures/ts-syntax) is baselined like the rest:
 * a gap-*.ts / variance.ts fixture records a known grammar gap, so a grammar that
 * fixes it reports "now agree".
 *
 * Usage:
 *   node scripts/ts-differential.mjs [--update] [--only <corpus>] [--json <path>]
 *
 *   --update       rewrite the baseline from this run (all corpora; not with --only)
 *   --only <name>  run one corpus (compared against its baseline entry only)
 *   --json <path>  write full per-file results
 *
 * Env: TS_DIFF_CACHE  corpus clone cache (default ~/.cache/codegraph-ts-differential)
 *      GITHUB_STEP_SUMMARY  when set, a markdown summary is appended to it
 *
 * Exit: 0 = no new divergences, 1 = new divergences,
 *       2 = tsc / web-tree-sitter version differs from the baseline, or setup failure.
 * Needs no build: wasm is loaded straight from src/extraction/wasm/.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const CORPORA_PATH = path.join(ROOT, 'scripts', 'ts-differential.corpora.json');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'ts-differential.baseline.json');
const WASM = {
  typescript: path.join(ROOT, 'src', 'extraction', 'wasm', 'tree-sitter-typescript.wasm'),
  tsx: path.join(ROOT, 'src', 'extraction', 'wasm', 'tree-sitter-tsx.wasm'),
};
const EXTS = new Set(['.ts', '.tsx', '.mts', '.cts']);

class SetupError extends Error {}

function parseArgs(argv) {
  const o = { update: false, only: null, json: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--update') o.update = true;
    else if (a === '--only') o.only = argv[++i];
    else if (a === '--json') o.json = argv[++i];
    else throw new SetupError(`unknown argument: ${a}`);
  }
  if ((argv.includes('--only') && !o.only) || (argv.includes('--json') && !o.json)) {
    throw new SetupError('--only / --json need a value');
  }
  if (o.update && o.only) throw new SetupError('--update rewrites the whole baseline; do not combine with --only');
  return o;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
}

/** Fetch repo@sha into the cache (re-using an existing complete clone). Returns the checkout dir. */
function ensureCorpus(c, cacheRoot) {
  const dir = path.join(cacheRoot, `${c.name}-${c.sha.slice(0, 12)}`);
  const marker = path.join(dir, '.ts-differential-complete');
  if (fs.existsSync(marker)) return dir;
  fs.mkdirSync(cacheRoot, { recursive: true });
  const tmp = `${dir}.partial-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  const url = `https://github.com/${c.repo}.git`;
  process.stderr.write(`[fetch] ${c.name}: ${c.repo}@${c.sha.slice(0, 12)}${c.subdir ? ` (sparse ${c.subdir}/)` : ''}\n`);
  try {
    git(tmp, ['init', '-q']);
    git(tmp, ['remote', 'add', 'origin', url]);
    if (c.subdir) {
      // blobless + sparse: pull only the subtree's blobs at checkout time
      git(tmp, ['sparse-checkout', 'set', '--cone', c.subdir]);
      git(tmp, ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', c.sha]);
    } else {
      git(tmp, ['fetch', '-q', '--depth', '1', 'origin', c.sha]);
    }
    git(tmp, ['-c', 'advice.detachedHead=false', 'checkout', '-q', 'FETCH_HEAD']);
    const head = git(tmp, ['rev-parse', 'HEAD']).trim();
    if (head !== c.sha) throw new Error(`fetched ${head}, expected ${c.sha}`);
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true });
    const msg = e.stderr ? e.stderr.toString().trim() : e.message;
    throw new SetupError(`fetch of ${c.name} failed: ${msg}`);
  }
  fs.writeFileSync(path.join(tmp, '.ts-differential-complete'), `${c.sha}\n`);
  fs.renameSync(tmp, dir);
  return dir;
}

/** All .ts/.tsx/.mts/.cts files (incl. .d.ts) under dir/rel, skipping node_modules, .git and symlinks. */
function listFiles(base, rel) {
  const out = [];
  const stack = [rel];
  while (stack.length) {
    const r = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(base, r), { withFileTypes: true });
    } catch (e) {
      throw new SetupError(`cannot read ${path.join(base, r)}: ${e.message}`);
    }
    for (const d of entries) {
      if (d.isSymbolicLink()) continue;
      const p = r ? `${r}/${d.name}` : d.name;
      if (d.isDirectory()) {
        if (d.name === 'node_modules' || d.name === '.git') continue;
        stack.push(p);
      } else if (d.isFile() && EXTS.has(path.extname(d.name))) {
        out.push(p);
      }
    }
  }
  return out.sort();
}

/** First ERROR or MISSING node in document order -> 0-based row, or null. */
function firstErrorRow(node) {
  if (node.type === 'ERROR' || node.isMissing) return node.startPosition.row;
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i);
    if (ch && ch.hasError) {
      const r = firstErrorRow(ch);
      if (r !== null) return r;
    }
  }
  return null;
}

async function main() {
  const t0 = Date.now();
  const opts = parseArgs(process.argv.slice(2));

  let ts, tsVersion, wtsVersion, Parser, Language;
  try {
    ts = require('typescript');
    tsVersion = ts.version;
    wtsVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'web-tree-sitter', 'package.json'), 'utf8')).version;
    ({ Parser, Language } = await import('web-tree-sitter'));
  } catch (e) {
    throw new SetupError(`cannot load typescript / web-tree-sitter (run npm ci): ${e.message}`);
  }
  for (const w of Object.values(WASM)) {
    if (!fs.existsSync(w)) throw new SetupError(`missing grammar wasm: ${w}`);
  }
  const wasmSha256 = { typescript: sha256(WASM.typescript), tsx: sha256(WASM.tsx) };

  const corpora = JSON.parse(fs.readFileSync(CORPORA_PATH, 'utf8'));
  const selected = opts.only ? corpora.filter((c) => c.name === opts.only) : corpora;
  if (!selected.length) throw new SetupError(`no corpus named "${opts.only}" (have: ${corpora.map((c) => c.name).join(', ')})`);

  let baseline = null;
  if (fs.existsSync(BASELINE_PATH)) baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  if (!opts.update) {
    if (!baseline) throw new SetupError('no baseline; run with --update to create one');
    const bad = [];
    if (baseline.tsc !== tsVersion) bad.push(`tsc ${tsVersion} vs baseline ${baseline.tsc}`);
    if (baseline.webTreeSitter !== wtsVersion) bad.push(`web-tree-sitter ${wtsVersion} vs baseline ${baseline.webTreeSitter}`);
    if (bad.length) {
      process.stderr.write(`Version mismatch (${bad.join('; ')}).\nThe oracle or loader changed: re-baseline with "node scripts/ts-differential.mjs --update" and commit the result.\n`);
      return { exit: 2 };
    }
  }

  const cacheRoot = process.env.TS_DIFF_CACHE || path.join(os.homedir(), '.cache', 'codegraph-ts-differential');
  const dirs = new Map();
  for (const c of selected) {
    dirs.set(c.name, c.local ? ROOT : ensureCorpus(c, cacheRoot));
  }

  await Parser.init();
  const langs = {
    typescript: await Language.load(WASM.typescript),
    tsx: await Language.load(WASM.tsx),
  };
  const parsers = { typescript: new Parser(), tsx: new Parser() };
  parsers.typescript.setLanguage(langs.typescript);
  parsers.tsx.setLanguage(langs.tsx);

  const results = {}; // corpus -> [{path, cls, tscErr, tsErr, row}]
  for (const c of selected) {
    const base = dirs.get(c.name);
    const rel = c.local ?? c.subdir ?? '';
    const files = listFiles(base, rel);
    process.stderr.write(`[scan] ${c.name}: ${files.length} files\n`);
    const rows = [];
    for (const f of files) {
      const ext = path.extname(f);
      let text;
      try {
        text = fs.readFileSync(path.join(base, f), 'utf8');
      } catch (e) {
        throw new SetupError(`cannot read ${f}: ${e.message}`);
      }
      const isTsx = ext === '.tsx';
      const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, false, isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const tscErr = sf.parseDiagnostics.length > 0;
      const tree = parsers[isTsx ? 'tsx' : 'typescript'].parse(text);
      if (!tree) throw new SetupError(`tree-sitter returned no tree for ${f}`);
      const tsErr = tree.rootNode.hasError;
      const row = tsErr ? firstErrorRow(tree.rootNode) : null;
      tree.delete();
      const cls = tscErr ? (tsErr ? 'agree-err' : 'tsc-only-err') : tsErr ? 'DIVERGENT' : 'agree-ok';
      rows.push({ path: f, cls, tscErr, tsErr, row: row === null ? null : row + 1 });
    }
    results[c.name] = rows;
  }

  // Compare against the baseline.
  const report = [];
  const allNew = [];
  for (const c of selected) {
    const rows = results[c.name];
    const count = (k) => rows.filter((r) => r.cls === k).length;
    const divergent = rows.filter((r) => r.cls === 'DIVERGENT');
    const known = new Set(baseline?.divergent?.[c.name] ?? []);
    const fresh = divergent.filter((r) => !known.has(r.path));
    const divSet = new Set(divergent.map((r) => r.path));
    const nowAgree = [...known].filter((p) => !divSet.has(p));
    for (const r of fresh) allNew.push({ corpus: c.name, ...r });
    report.push({
      corpus: c.name,
      files: rows.length,
      tsErr: count('agree-err') + count('DIVERGENT'),
      agreeOk: count('agree-ok'),
      agreeErr: count('agree-err'),
      divergent: divergent.length,
      newDiv: fresh.length,
      nowAgree: nowAgree.length,
      tscOnlyErr: count('tsc-only-err'),
    });
  }

  // Table
  const cols = [
    ['corpus', 'corpus'], ['files', 'files'], ['agree-ok', 'agreeOk'], ['agree-err', 'agreeErr'],
    ['DIVERGENT', 'divergent'], ['new', 'newDiv'], ['now-agree', 'nowAgree'],
    ['tsc-only-err', 'tscOnlyErr'], ['ts-err (tot)', 'tsErr'],
  ];
  const widths = cols.map(([h, k]) => Math.max(h.length, ...report.map((r) => String(r[k]).length)));
  const line = (cells) => cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');
  console.log(line(cols.map(([h]) => h)));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of report) console.log(line(cols.map(([, k]) => r[k])));
  console.log(`\ntsc ${tsVersion}  web-tree-sitter ${wtsVersion}`);
  if (baseline?.wasmSha256 && !opts.update) {
    for (const k of ['typescript', 'tsx']) {
      if (baseline.wasmSha256[k] !== wasmSha256[k]) {
        console.log(`note: ${k} wasm differs from the baseline's (${wasmSha256[k].slice(0, 12)} vs ${String(baseline.wasmSha256[k]).slice(0, 12)})`);
      }
    }
  }
  const totalNow = report.reduce((n, r) => n + r.nowAgree, 0);
  if (totalNow) console.log(`${totalNow} baseline file(s) now agree with tsc: update the baseline (--update).`);
  if (allNew.length && !opts.update) {
    console.log(`\n${allNew.length} NEW divergence(s) (tsc ok, tree-sitter error):`);
    for (const r of allNew.slice(0, 50)) console.log(`  ${r.corpus}:${r.path}:${r.row ?? '?'}`);
    if (allNew.length > 50) console.log(`  ... ${allNew.length - 50} more (use --json)`);
  }

  if (opts.json) {
    fs.mkdirSync(path.dirname(path.resolve(opts.json)), { recursive: true });
    fs.writeFileSync(opts.json, JSON.stringify({ tsc: tsVersion, webTreeSitter: wtsVersion, wasmSha256, report, results }, null, 1) + '\n');
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [];
    md.push('## TS grammar differential', '');
    md.push(`tsc ${tsVersion}, web-tree-sitter ${wtsVersion}`, '');
    md.push('| corpus | files | divergent | new | now agree | ts err | tsc-only err |', '|---|---:|---:|---:|---:|---:|---:|');
    for (const r of report) md.push(`| ${r.corpus} | ${r.files} | ${r.divergent} | ${r.newDiv} | ${r.nowAgree} | ${r.tsErr} | ${r.tscOnlyErr} |`);
    md.push('');
    if (totalNow) md.push(`${totalNow} baseline file(s) now agree with tsc. Update the baseline: \`node scripts/ts-differential.mjs --update\`.`, '');
    if (allNew.length) {
      md.push(`### ${allNew.length} new divergence(s)`, '', 'tsc accepts these files; tree-sitter reports an error (first 20):', '');
      for (const r of allNew.slice(0, 20)) md.push(`- \`${r.corpus}:${r.path}:${r.row ?? '?'}\``);
      md.push('');
    } else {
      md.push('No new divergences.', '');
    }
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
    } catch (e) {
      process.stderr.write(`warning: could not write step summary: ${e.message}\n`);
    }
  }

  if (opts.update) {
    const divergent = {};
    for (const c of selected) {
      divergent[c.name] = results[c.name].filter((r) => r.cls === 'DIVERGENT').map((r) => r.path).sort();
    }
    const out = { tsc: tsVersion, webTreeSitter: wtsVersion, generatedAt: new Date().toISOString(), wasmSha256, divergent };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 1) + '\n');
    console.log(`\nbaseline written: ${path.relative(ROOT, BASELINE_PATH)}`);
    console.log(`wall time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return { exit: 0 };
  }

  console.log(`\nwall time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return { exit: allNew.length ? 1 : 0 };
}

main().then(
  ({ exit }) => process.exit(exit),
  (e) => {
    if (e instanceof SetupError) {
      process.stderr.write(`setup error: ${e.message}\n`);
    } else {
      process.stderr.write(`${e.stack ?? e}\n`);
    }
    process.exit(2);
  },
);
