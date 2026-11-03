/**
 * Two tree-sitter-typescript v0.23.2 bugs, patched in the vendored grammar
 * (wasm and kernel); see docs/grammars/tree-sitter-typescript.md:
 *
 * - TS 4.7 variance annotations (`interface Stream<out A, in E>`) were parse
 *   errors (upstream #370).
 * - A generic call signature on its own line in an object type or interface
 *   (`<A>(self: A): A` after a member with no `;`) was read as type arguments
 *   to the previous member's type (upstream #335). Effect writes its overload
 *   lists this way.
 *
 * In a big file these errors pile up until the parser gives up and the whole
 * file becomes one ERROR: Effect's Schema.ts, Stream.ts and Channel.ts
 * indexed as almost nothing.
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { initGrammars, loadGrammarsForLanguages, getParser } from '../src/extraction/grammars';

let root = '';
let cg: CodeGraph;

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-ts-variance-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/stream.ts'), `export interface Stream<out A, in out E = never> {
  map<B>(f: (a: A) => B): Stream<B, E>
}

export const mapError: {
  <E, E2>(f: (e: E) => E2): <A>(self: Stream<A, E>) => Stream<A, E2>
  <A, E, E2>(self: Stream<A, E>, f: (e: E) => E2): Stream<A, E2>
} = (() => undefined) as any

export function runStream<A>(s: Stream<A>): A[] {
  return []
}
`);
  cg = await CodeGraph.init(root, { index: true });
});

afterAll(() => {
  cg?.close();
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe('TypeScript variance annotations and line-separated generic call signatures', () => {
  it('parse clean in typescript and tsx', async () => {
    await initGrammars();
    await loadGrammarsForLanguages(['typescript', 'tsx']);
    const sources = [
      'interface E<out A, in B, in out C> {}',
      'class C<const in T> {}',
      // `out` is still a valid parameter NAME, as tsc reads it.
      'type F<out> = out[];',
      'type H<out = number> = out;',
      'type I<out, T> = [out, T];',
      'type J<in out> = out;',
      'type T = {\n  (x: number): A\n  <A>(self: A): A\n}',
      'interface I {\n  m(): Promise<number>\n  // overload\n  <A>(self: A): A\n}',
    ];
    for (const language of ['typescript', 'tsx'] as const) {
      const parser = getParser(language)!;
      for (const src of sources) {
        expect(parser.parse(src)!.rootNode.hasError, `${language}: ${src}`).toBe(false);
      }
    }
    expect(getParser('tsx')!.parse('const c = <out,>(x: out) => x;')!.rootNode.hasError).toBe(false);
  });

  it('still reads a `<` on a new line in an expression as a comparison', async () => {
    await initGrammars();
    await loadGrammarsForLanguages(['typescript']);
    const tree = getParser('typescript')!.parse('const b = a\n  < c\n')!;
    expect(tree.rootNode.hasError).toBe(false);
    expect(tree.rootNode.descendantsOfType('binary_expression')).toHaveLength(1);
  });

  // A small file recovers locally even on the old grammar (the whole-file
  // ERROR needs Effect-scale files), so this guards extraction over the new
  // `in`/`out` tokens rather than reproducing the cascade.
  it('extracts the declarations that use them', () => {
    const names = cg.getNodesInFile('src/stream.ts').map((n) => `${n.kind}:${n.name}`);
    expect(names).toEqual(expect.arrayContaining(['interface:Stream', 'method:map', 'constant:mapError', 'function:runStream']));
  });
});
