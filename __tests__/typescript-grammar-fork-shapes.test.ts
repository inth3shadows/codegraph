/**
 * Node shapes and extraction for the constructs our tree-sitter-typescript fork
 * added (docs/grammars/tree-sitter-typescript.md). The tsc differential only
 * checks that a file parses; these pin what it parses into, and the call edges
 * codegraph derives from it, so a later grammar move cannot regress them silently.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Node } from 'web-tree-sitter';
import { extractFromSource } from '../src/extraction';
import { initGrammars, loadGrammarsForLanguages, getParser } from '../src/extraction/grammars';
import { getKernel, decodeExtractBuffers } from '../src/extraction/kernel';

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

  // Silent before fork 9ce21f8: `in(b)` vanished (`a = x ? 1 : 2`), and no ERROR shows it.
  it.each(LANGS)('%s: after a field initializer, `in(b) ? 1 : 2` keeps the `in` operator', (language) => {
    const root = parse(language, 'class K {\n  a = x\n  in(b) ? 1 : 2\n  c = x\n  in(")") ? 1 : 2\n}');
    expect(root.hasError).toBe(false);
    const conds = root.descendantsOfType('ternary_expression').map((t) => t.childForFieldName('condition')!);
    expect(conds.map((c) => c.type)).toEqual(['binary_expression', 'binary_expression']);
    expect(conds.map((c) => c.child(1)!.type)).toEqual(['in', 'in']);
    expect(root.descendantsOfType(['method_definition', 'method_signature'])).toHaveLength(0);
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

describe('bare \\x / \\u escapes in templates (fork #15)', () => {
  it.each(LANGS)('%s: String.raw`\\usepackage` parses clean and is a call edge', (language) => {
    const src = 'export function f() {\n  return String.raw`\\usepackage \\x41`;\n}';
    const root = parse(language, src);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('escape_sequence').map((n) => n.text)).toEqual(['\\u', '\\x41']);
    expect(calls(language, src)).toContain('String.raw');
  });

  it.each(LANGS)('%s: f<`\\u`>(1) is a call with type arguments, not a comparison', (language) => {
    const src = 'export function g() {\n  return f<`\\u`>(1);\n}';
    const root = parse(language, src);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('binary_expression')).toHaveLength(0);
    const call = root.descendantsOfType('call_expression')[0]!;
    expect(call.childForFieldName('type_arguments')!.type).toBe('type_arguments');
    expect(calls(language, src)).toContain('f');
  });

  it.each(LANGS)('%s: a string still rejects a bare \\u or \\x', (language) => {
    expect(parse(language, 'const s = "\\u";').hasError).toBe(true);
    expect(parse(language, "const s = '\\x';").hasError).toBe(true);
  });
});

describe('contextual abstract and accessor members (fork #12 and #13)', () => {
  const members = 'export class Names { abstract = 1; accessor() { return helper(); } }';
  const modifiers = [
    'class Base { accessor value = 0; }',
    'class Derived extends Base {',
    '  public static accessor shared = 1;',
    '  static accessor #hidden = 2;',
    '  override accessor value = 3;',
    '  @dec accessor decorated = 4;',
    '}',
    'abstract class Abstract { abstract accessor value: number; }',
  ].join('\n');

  it.each(LANGS)('%s: keyword names retain member nodes and calls', (language) => {
    const root = parse(language, members);
    expect(root.hasError).toBe(false);
    const body = root.descendantsOfType('class_body')[0]!;
    expect(body.namedChildren.map((n) => [n.type, n.childForFieldName('name')?.text])).toEqual([
      ['public_field_definition', 'abstract'],
      ['method_definition', 'accessor'],
    ]);
    const result = extractFromSource('src/names.' + (language === 'tsx' ? 'tsx' : 'ts'), members, language);
    expect(result.nodes.filter((n) => n.kind === 'method').map((n) => n.name)).toContain('accessor');
    expect(calls(language, members)).toContain('helper');
    expect(parse(language, 'interface I { abstract(): void; accessor?: boolean; }').hasError).toBe(false);
  });

  it.each(LANGS)('%s: auto-accessors accept field modifiers and private names', (language) => {
    const root = parse(language, modifiers);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('public_field_definition').map((n) => n.childForFieldName('name')?.text))
      .toEqual(['value', 'shared', '#hidden', 'value', 'decorated', 'value']);
  });

  it.each(LANGS)('%s: bare names end at a newline; a signature continues the method', (language) => {
    const root = parse(language, 'class C { abstract\n one = 1; accessor\n two = 2; accessor\n () {} }');
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('class_body')[0]!.namedChildren
      .map((n) => [n.type, n.childForFieldName('name')?.text])).toEqual([
      ['public_field_definition', 'abstract'],
      ['public_field_definition', 'one'],
      ['public_field_definition', 'accessor'],
      ['public_field_definition', 'two'],
      ['method_definition', 'accessor'],
    ]);
  });

  it.each(LANGS)('%s: accessor type arguments remain calls and shorthand remains a name', (language) => {
    const src = 'type T = (accessor); type Q = accessor.Value; f<accessor>(0); f<typeof accessor>``; const o = { accessor };';
    const root = parse(language, src);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('binary_expression')).toHaveLength(0);
    expect(root.descendantsOfType('call_expression').map((n) => n.childForFieldName('type_arguments')?.type))
      .toEqual(['type_arguments', 'type_arguments']);
    expect(root.descendantsOfType('parenthesized_type')).toHaveLength(1);
    expect(root.descendantsOfType('shorthand_property_identifier').map((n) => n.text)).toEqual(['accessor']);
    expect(calls(language, src)).toEqual(['f', 'f']);
  });

  const kernelBuilt = fs.existsSync(path.join(__dirname, '..', 'codegraph-kernel', 'prebuilds',
    `${process.platform}-${process.arch}`, 'codegraph-kernel.node'));
  it.skipIf(!kernelBuilt).each(LANGS)('%s: native grammar handles these members without deferring', (language) => {
    const kernel = getKernel();
    expect(kernel).not.toBeNull();
    const file = 'src/native.' + (language === 'tsx' ? 'tsx' : 'ts');
    const result = decodeExtractBuffers(kernel!.extractFile(file, members + '\n' + modifiers, language), file, language);
    expect(result.errors).toEqual([]);
    expect(result.nodes.filter((n) => n.kind === 'method').map((n) => n.name)).toContain('accessor');
    expect(result.unresolvedReferences.filter((r) => r.referenceKind === 'calls').map((r) => r.referenceName))
      .toContain('helper');
  });

  const abstractQueries = [
    'const abstract = { value: 0 };',
    'function f<T>(value: T) { return value; }',
    'function tag<T>(parts: TemplateStringsArray) { return parts[0]; }',
    'export function caller() {',
    '  f<typeof abstract>(abstract);',
    '  f<typeof abstract.value>(0);',
    '  tag<typeof abstract>`hello`;',
    '}',
  ].join('\n');

  it.each(LANGS)('%s: typeof abstract keeps generic calls and typed tags', (language) => {
    const root = parse(language, abstractQueries);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('binary_expression')).toHaveLength(0);
    expect(root.descendantsOfType('call_expression').map((n) => n.childForFieldName('function')?.text))
      .toEqual(['f', 'f', 'tag']);
    expect(root.descendantsOfType('type_query').map((n) => n.text))
      .toEqual(['typeof abstract', 'typeof abstract.value', 'typeof abstract']);
    expect(calls(language, abstractQueries)).toEqual(['f', 'f', 'tag']);
  });

  it.each(LANGS)('%s: parenthesized typeof abstract stays a type query', (language) => {
    const root = parse(language, 'type T = (typeof abstract); type Q = (typeof abstract.value);');
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('parenthesized_type').map((n) => n.namedChild(0)?.type))
      .toEqual(['type_query', 'type_query']);
  });

  it.skipIf(!kernelBuilt).each(LANGS)('%s: native typeof abstract queries preserve calls without errors', (language) => {
    const kernel = getKernel();
    expect(kernel).not.toBeNull();
    const file = 'src/queries.' + (language === 'tsx' ? 'tsx' : 'ts');
    const result = decodeExtractBuffers(kernel!.extractFile(file, abstractQueries, language), file, language);
    expect(result.errors).toEqual([]);
    expect(result.unresolvedReferences.filter((r) => r.referenceKind === 'calls').map((r) => r.referenceName))
      .toEqual(['f', 'f', 'tag']);
  });

  it.each(LANGS)('%s: runtime typeof calls stay comparisons, not phantom generic calls', (language) => {
    const src = [
      'declare function abstract(x: unknown): number;',
      'declare const f: string, x: any;',
      'f < typeof abstract(x) > (x);',
      'const holder = { abstract: abstract };',
      'f < typeof holder.abstract(x) > (x);',
    ].join('\n');
    const root = parse(language, src);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('binary_expression')).toHaveLength(4);
    expect(root.descendantsOfType('type_query')).toHaveLength(0);
    expect(calls(language, src)).toEqual(['abstract', 'holder.abstract']);
    if (kernelBuilt) {
      const file = 'src/comparison.' + (language === 'tsx' ? 'tsx' : 'ts');
      const result = decodeExtractBuffers(getKernel()!.extractFile(file, src, language), file, language);
      expect(result.errors).toEqual([]);
      expect(result.unresolvedReferences.filter((r) => r.referenceKind === 'calls').map((r) => r.referenceName))
        .toEqual(['abstract', 'holder.abstract']);
    }
  });

  it.each(LANGS)('%s: optional typeof operands stay runtime comparisons', (language) => {
    const src = [
      'declare const abstract: { abstract: { value: number } | undefined } | undefined;',
      'declare const f: string, x: any;',
      'f < typeof abstract?.abstract > (x);',
      'f < typeof abstract?.abstract?.["value"] > (x);',
    ].join('\n');
    const root = parse(language, src);
    expect(root.hasError).toBe(false);
    expect(root.descendantsOfType('binary_expression')).toHaveLength(4);
    expect(root.descendantsOfType('type_query')).toHaveLength(0);
    expect(calls(language, src)).toEqual([]);
    if (kernelBuilt) {
      const file = 'src/optional.' + (language === 'tsx' ? 'tsx' : 'ts');
      const result = decodeExtractBuffers(getKernel()!.extractFile(file, src, language), file, language);
      expect(result.errors).toEqual([]);
      expect(result.unresolvedReferences.filter((r) => r.referenceKind === 'calls')).toEqual([]);
    }
  });
});
