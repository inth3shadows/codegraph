/**
 * Bash references resolve by what the shell itself would run, never by a
 * project-wide name match.
 *
 * - A call is a function only. A command word is a program on PATH as often
 *   as a function, so a name no sourced file defines stays unresolved: `set`,
 *   `test` or `run` never lands on a script that shares the name, and
 *   `command` never lands on a variable called `command`.
 * - Only `source`, `.` and Bats `load` bring definitions in: the extractor
 *   makes an `import` node for those alone. Running a script (`./x`,
 *   `bash x`, `exec x`) starts another process, so nothing it defines is
 *   visible to the caller (its file edge comes from the reference alone).
 * - Which definition runs follows the order the shell reads statements in. A
 *   file's definitions and the files it sources are taken in source order,
 *   each sourced file contributing what it defines by its end, so the last
 *   definition read wins. Top-level code sees what was read before it; a call
 *   in a function body runs later, so it sees the whole file.
 * - A sourced path is the exact file the extractor named, or nothing: a
 *   `./lib.sh` that `resolveShellPath` can't place never falls back to some
 *   other `lib.sh` by name.
 *
 * - A call in a library's function body that the library can't reach on its
 *   own falls back to the scripts that source the library: the function every
 *   one of them sees by its end, when it is the same one (a sibling library
 *   the entry script sources). One that lacks the name, or sees another, gives
 *   no edge. It never feeds back into what a file defines.
 * - A `.bash` helper's `load` is Bats's only when a test loads the helper, and
 *   is read against that test's directory; tests that read it differently
 *   give no file. A project that defines a `load` function of its own gets no
 *   helper loads at all, since any helper might be running that one.
 *
 * Not followed (missing edges, never wrong ones): a sibling reached only
 * through the importer's importer; files sourced through a variable the
 * extractor can't read; a `source` inside a function or an `if` counts as if
 * it always ran.
 */
import * as path from 'path';
import type { Node } from '../types';
import type { ResolutionContext, ResolvedRef, UnresolvedRef } from './types';
import { resolveImportPath } from './import-resolver';

/** Whether `ref` is a Bash reference this module answers (calls and file imports). */
export function isBashRef(ref: UnresolvedRef): boolean {
  return ref.language === 'bash' && (ref.referenceKind === 'calls' || ref.referenceKind === 'imports');
}

/** The resolution of a Bash call or import; null leaves it unresolved (no other strategy runs). */
export function resolveBashRef(ref: UnresolvedRef, context: ResolutionContext): ResolvedRef | null {
  if (ref.referenceKind === 'imports') {
    const helperLoad = context.getNodesInFile(ref.filePath).some((n) =>
      isHelperLoad(n) && n.startLine === ref.line && n.startColumn === ref.column);
    const file = helperLoad
      ? helperLoadTarget(ref.filePath, ref.referenceName, memoFor(context), context)
      : resolveImportPath(ref.referenceName, ref.filePath, 'bash', context);
    const node = file ? context.getNodesInFile(file).find((n) => n.kind === 'file') : undefined;
    return node ? { original: ref, targetNodeId: node.id, confidence: 0.95, resolvedBy: 'import' } : null;
  }
  const memo = memoFor(context);
  if (!isBashFunctionName(ref.referenceName, memo, context)) return null; // `echo`, `grep`, …: no lookup needed
  const pos: Pos = [ref.line ?? Number.MAX_SAFE_INTEGER, ref.column ?? 0];
  // Inside any function body, a Bats test included: it runs after the whole
  // file is read. Compared by line and column, so `f() { :; }; g` is top level.
  const inFunction = context.getNodesInFile(ref.filePath).some((fn) =>
    fn.kind === 'function' && fn.language === 'bash' &&
    before([fn.startLine, fn.startColumn], pos) && before(pos, [fn.endLine ?? fn.startLine, fn.endColumn ?? Number.MAX_SAFE_INTEGER]));
  const target = inFunction
    ? endState(ref.filePath, memo, context).get(ref.referenceName) ?? siblingDefinition(ref.filePath, ref.referenceName, memo, context)
    : lastBefore(ref.filePath, ref.referenceName, pos, memo, context);
  return target ? { original: ref, targetNodeId: target.id, confidence: 0.9, resolvedBy: 'import' } : null;
}

/**
 * The definition of `name` read last before `pos` in `file`: walking its
 * definitions and sources backwards from `pos`, the first that has it.
 */
function lastBefore(file: string, name: string, pos: Pos, memo: BashMemo, context: ResolutionContext): Node | undefined {
  const defs = defsOf(file, memo, context);
  const sources = sourcesOf(file, memo, context);
  let d = defs.length - 1;
  let s = sources.length - 1;
  while (d >= 0 && !before([defs[d]!.startLine, defs[d]!.startColumn], pos)) d--;
  while (s >= 0 && !before(sources[s]!.pos, pos)) s--;
  while (d >= 0 || s >= 0) {
    const def = d >= 0 ? defs[d] : undefined;
    const src = s >= 0 ? sources[s] : undefined;
    if (def && (!src || before(src.pos, [def.startLine, def.startColumn]))) {
      if (def.name === name) return def;
      d--;
    } else {
      const found = endState(src!.target, memo, context).get(name);
      if (found) return found;
      s--;
    }
  }
  return undefined;
}

type Pos = [line: number, column: number];

const before = (a: Pos, b: Pos): boolean => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

interface BashMemo {
  names: Set<string> | null;
  sources: Map<string, Array<{ pos: Pos; target: string }>>;
  defs: Map<string, Node[]>;
  ends: Map<string, Map<string, Node>>;
  reading: Set<string>;
  /** File -> the files that source or load it. */
  importers: Map<string, string[]> | null;
  /** `file\0name` -> the definition every importer agrees on (null: none or disagreement). */
  siblings: Map<string, Node | null>;
  /** File -> the directories of the Bats tests that load it, directly or through helpers. */
  batsDirs: Map<string, Set<string>> | null;
}

const memos = new WeakMap<ResolutionContext, BashMemo>();

function memoFor(context: ResolutionContext): BashMemo {
  let memo = memos.get(context);
  if (!memo) memos.set(context, (memo = {
    names: null, sources: new Map(), defs: new Map(), ends: new Map(), reading: new Set(),
    importers: null, siblings: new Map(), batsDirs: null,
  }));
  return memo;
}

/** Drop the per-context Bash memos (with the resolver's other caches, on every sync). */
export function clearBashResolutionMemos(context: ResolutionContext): void {
  memos.delete(context);
}

function isBashFunctionName(name: string, memo: BashMemo, context: ResolutionContext): boolean {
  if (!memo.names) {
    memo.names = new Set();
    for (const fn of context.getNodesByKind('function')) if (fn.language === 'bash' && !fn.decorators?.includes('@test')) memo.names.add(fn.name);
  }
  return memo.names.has(name);
}

function sourcesOf(file: string, memo: BashMemo, context: ResolutionContext): Array<{ pos: Pos; target: string }> {
  let out = memo.sources.get(file);
  if (out) return out;
  out = [];
  for (const imp of context.getNodesInFile(file)) {
    if (imp.kind !== 'import' || imp.language !== 'bash') continue;
    const written = imp.qualifiedName || imp.name;
    const target = isHelperLoad(imp)
      ? helperLoadTarget(file, written, memo, context)
      : resolveImportPath(written, file, 'bash', context);
    if (target && target !== file) out.push({ pos: [imp.startLine, imp.startColumn], target });
  }
  out.sort((a, b) => (before(a.pos, b.pos) ? -1 : before(b.pos, a.pos) ? 1 : 0));
  memo.sources.set(file, out);
  return out;
}

function defsOf(file: string, memo: BashMemo, context: ResolutionContext): Node[] {
  let out = memo.defs.get(file);
  if (out) return out;
  out = context.getNodesInFile(file)
    .filter((n) => n.kind === 'function' && n.language === 'bash')
    .sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);
  // A Bats test (marked `@test`) is a body to run, not a function to call.
  out = out.filter((n) => !n.decorators?.includes('@test'));
  memo.defs.set(file, out);
  return out;
}

/**
 * The functions visible once the shell has read `file` up to `pos`: its
 * definitions and the files it sources, in source order, each sourced file
 * adding what it defines by its end.
 */
function stateBefore(file: string, pos: Pos, memo: BashMemo, context: ResolutionContext): Map<string, Node> {
  const state = new Map<string, Node>();
  const defs = defsOf(file, memo, context);
  const sources = sourcesOf(file, memo, context);
  let d = 0;
  let s = 0;
  while (true) {
    const def = defs[d] && before([defs[d]!.startLine, defs[d]!.startColumn], pos) ? defs[d] : undefined;
    const src = sources[s] && before(sources[s]!.pos, pos) ? sources[s] : undefined;
    if (!def && !src) break;
    if (def && (!src || before([def.startLine, def.startColumn], src.pos))) {
      state.set(def.name, def);
      d++;
    } else {
      for (const [name, node] of endState(src!.target, memo, context)) state.set(name, node);
      s++;
    }
  }
  return state;
}

/**
 * What `file` defines by its end, memoized per pass. A file already being read
 * further up contributes only its own functions where it recurs, which keeps
 * the walk linear and the answer independent of where the walk began.
 */
function endState(file: string, memo: BashMemo, context: ResolutionContext): Map<string, Node> {
  const cached = memo.ends.get(file);
  if (cached) return cached;
  // Met again inside a cycle (sourcing usually behind an include guard): only
  // its own functions, the same whichever file the walk began from.
  if (memo.reading.has(file)) return new Map(defsOf(file, memo, context).map((fn) => [fn.name, fn]));
  memo.reading.add(file);
  try {
    const state = stateBefore(file, [Number.MAX_SAFE_INTEGER, 0], memo, context);
    memo.ends.set(file, state);
    return state;
  } finally {
    memo.reading.delete(file);
  }
}

/**
 * A `load` in a file that is not a Bats test: the extractor keeps its path as
 * written (relative to the test directory), for the resolver to place against
 * the tests that load the helper (extraction/languages/bash.ts).
 */
function isHelperLoad(imp: Node): boolean {
  return imp.kind === 'import' && imp.language === 'bash' && !/\.bats$/i.test(imp.filePath) && /^load\s/.test(imp.signature ?? '');
}

/** Every Bash file that sources or loads something, with what it names. */
function bashImports(context: ResolutionContext): Map<string, Array<{ written: string; helperLoad: boolean }>> {
  const out = new Map<string, Array<{ written: string; helperLoad: boolean }>>();
  for (const imp of context.getNodesByKind('import')) {
    if (imp.language !== 'bash') continue;
    let list = out.get(imp.filePath);
    if (!list) out.set(imp.filePath, (list = []));
    list.push({ written: imp.qualifiedName || imp.name, helperLoad: isHelperLoad(imp) });
  }
  return out;
}

/**
 * The function `name` that every script sourcing `file` sees by its end, when
 * all of them see the same one; a script that lacks it would fail on the call,
 * so no edge. Only for a call in a function body, which runs after the entry
 * script has read everything; memoized per file and name.
 */
function siblingDefinition(file: string, name: string, memo: BashMemo, context: ResolutionContext): Node | undefined {
  const key = `${file}\0${name}`;
  if (memo.siblings.has(key)) return memo.siblings.get(key) ?? undefined;
  let found: Node | null = null;
  for (const importer of importersOf(file, memo, context)) {
    const def = endState(importer, memo, context).get(name);
    if (!def || (found && found.id !== def.id)) { found = null; break; }
    found = def;
  }
  memo.siblings.set(key, found);
  return found ?? undefined;
}

function importersOf(file: string, memo: BashMemo, context: ResolutionContext): string[] {
  if (!memo.importers) {
    const importers = new Map<string, string[]>();
    for (const from of bashImports(context).keys()) {
      for (const { target } of sourcesOf(from, memo, context)) {
        let list = importers.get(target);
        if (!list) importers.set(target, (list = []));
        if (!list.includes(from)) list.push(from);
      }
    }
    memo.importers = importers;
  }
  return memo.importers.get(file) ?? [];
}

/**
 * The file a `.bash` helper's `load rel` reads: `rel` against the directory of
 * each Bats test that loads the helper, when every such reading that names an
 * indexed file names the same one. Null when no test loads the helper, or the
 * project defines a `load` function.
 */
function helperLoadTarget(file: string, rel: string, memo: BashMemo, context: ResolutionContext): string | null {
  if (isBashFunctionName('load', memo, context)) return null;
  let target: string | null = null;
  for (const dir of batsDirsOf(memo, context).get(file) ?? []) {
    const candidate = loadFromDir(dir, rel, context);
    if (!candidate) continue;
    if (target && target !== candidate) return null;
    target = candidate;
  }
  return target;
}

/** `load rel` read from test directory `dir`, as Bats names the file; null unless it is indexed. */
function loadFromDir(dir: string, rel: string, context: ResolutionContext): string | null {
  const joined = path.posix.normalize(path.posix.join(dir, rel));
  if (joined === '..' || joined.startsWith('../') || path.posix.isAbsolute(joined)) return null;
  const file = /\.(?:bash|sh)$/.test(joined) ? joined : `${joined}.bash`;
  return context.getNodesInFile(file).some((n) => n.kind === 'file') ? file : null;
}

/**
 * For each Bash file, the directories of the Bats tests that read it: a test's
 * own directory, carried along every `source` and `load` from it, a helper's
 * `load` going to the file it names from each of those directories.
 */
function batsDirsOf(memo: BashMemo, context: ResolutionContext): Map<string, Set<string>> {
  if (memo.batsDirs) return memo.batsDirs;
  const dirs = new Map<string, Set<string>>();
  memo.batsDirs = dirs;
  const imports = bashImports(context);
  const userLoad = isBashFunctionName('load', memo, context);
  const queue: Array<[file: string, dir: string]> = [];
  const add = (file: string, dir: string): void => {
    let set = dirs.get(file);
    if (!set) dirs.set(file, (set = new Set()));
    if (!set.has(dir)) { set.add(dir); queue.push([file, dir]); }
  };
  for (const file of imports.keys()) if (/\.bats$/i.test(file)) add(file, path.posix.dirname(file));
  while (queue.length > 0) {
    const [file, dir] = queue.pop()!;
    for (const { written, helperLoad } of imports.get(file) ?? []) {
      const target = helperLoad
        ? (userLoad ? null : loadFromDir(dir, written, context))
        : resolveImportPath(written, file, 'bash', context);
      if (target && target !== file) add(target, dir);
    }
  }
  return dirs;
}
