/**
 * Node shapes and extraction for the constructs our tree-sitter-typescript fork
 * added (docs/grammars/tree-sitter-typescript.md). The tsc differential only
 * checks that a file parses; these pin what it parses into, and the call edges
 * codegraph derives from it, so a later grammar move cannot regress them silently.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Node } from 'web-tree-sitter';
import { extractFromSource } from '../src/extraction';
import { initGrammars, loadGrammarsForLanguages, getParser } from '../src/extraction/grammars';

beforeAll(async () => {
  await initGrammars();
  await loadGrammarsForLanguages(['typescript', 'tsx']);
});

const LANGS = ['typescript', 'tsx'] as const;

function parse(language: 'typescript' | 'tsx', src: string): Node {
  return getParser(language)!.parse(src)!.rootNode;
}

/** Names this file's code calls, as codegraph records them. */
function calls(language: 'typescript' | 'tsx', src: string): string[] {
  const file = language === 'tsx' ? 'src/a.tsx' : 'src/a.ts';
  return extractFromSource(file, src, language)
    .unresolvedReferences.filter((r) => r.referenceKind === 'calls')
    .map((r) => r.referenceName);
}

describe('tagged templates with type arguments', () => {
  it.each(LANGS)('%s: sql<Row>`...` is a call of sql with type arguments', (language) => {
    const root = parse(language, 'sql<{ id: number }>`SELECT ${x}`;\nconst lt = a < b;');
    expect(root.hasError).toBe(false);
    const call = root.descendantsOfType('call_expression')[0]!;
    expect(call.childForFieldName('function')!.text).toBe('sql');
    expect(call.childForFieldName('type_arguments')!.type).toBe('type_arguments');
    expect(call.childForFieldName('arguments')!.type).toBe('template_string');
    expect(root.descendantsOfType('binary_expression')).toHaveLength(1);
  });

  it.each(LANGS)('%s: the tag is a call edge, also behind await and on a member', (language) => {
    const src = [
      'export async function load() {',
      '  const a = sql<Row>`SELECT 1`;',
      '  const b = await query<Row[]>`SELECT 2`;',
      '  const c = db.tag<Row>`SELECT 3`;',
      '}',
    ].join('\n');
    expect(calls(language, src)).toEqual(expect.arrayContaining(['sql', 'query', 'db.tag']));
  });
});

describe('tuple labels named like type keywords', () => {
  it.each(LANGS)('%s: keyword labels are names, keyword-named types stay types', (language) => {
    const cases: Array<[string, Record<string, number>]> = [
      ['type A = [symbol: string, number?: string];', { required_parameter: 1, optional_parameter: 1 }],
      ['type B = [readonly: string, new: number];', { required_parameter: 2 }],
      ['type C = [any?];', { optional_type: 1 }],
      ['type D = [readonly string[]];', { readonly_type: 1 }],
      ['type E = [type, get?];', { type_identifier: 3, optional_type: 1 }],
      ['function f(a: [declare]) {}', { type_identifier: 1 }],
    ];
    for (const [src, want] of cases) {
      const root = parse(language, src);
      expect(root.hasError, src).toBe(false);
      for (const [kind, n] of Object.entries(want)) {
        expect(root.descendantsOfType(kind), `${src} ${kind}`).toHaveLength(n);
      }
    }
  });
});

describe('unique as a name', () => {
  it.each(LANGS)('%s: `unique` is a name everywhere except `unique symbol`', (language) => {
    for (const src of [
      'for (let i = 0; i < unique.length; i++) {}',
      'type U = typeof unique;',
      'class D implements unique {}',
      'type A = [unique: T];',
      'declare const s: readonly unique /* c */ symbol[];',
    ]) {
      expect(parse(language, src).hasError, src).toBe(false);
    }
    const sym = parse(language, 'declare const s: unique symbol;').descendantsOfType('predefined_type');
    expect(sym.map((n) => n.text)).toEqual(['unique symbol']);
  });
});

describe('ASI before names starting with in', () => {
  it.each(LANGS)('%s: in2 / in$x start a statement; `a\\n in(b)` stays the operator', (language) => {
    const root = parse(language, 'let a = 1\nin2 = 3\nlet c = 1\nin$x = 4\nvar x = a\n  in(b)');
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('expression_statement')).toHaveLength(2);
    expect(root.descendantsOfType('binary_expression').map((n) => n.child(1)!.type)).toEqual(['in']);
    expect(calls(language, 'export function g() { return a\n  in(b) }')).not.toContain('in');
  });
});

describe('typeof unique in type arguments', () => {
  it.each(LANGS)('%s: f<typeof unique>(x) stays a generic call', (language) => {
    const src = 'export function g() { return f<typeof unique>(1); }\ntype E = (typeof unique)[];';
    expect(parse(language, src).hasError).toBe(false);
    expect(calls(language, src)).toContain('f');
    for (const more of [
      'f<typeof unique.a>(x);',
      'f<typeof unique[]>(x);',
      'f<(typeof unique)[]>(x);',
      'type A = (typeof unique);',
      'type T = (typeof unique)["x"];',
    ]) {
      expect(parse(language, more).hasError, more).toBe(false);
    }
  });
});
