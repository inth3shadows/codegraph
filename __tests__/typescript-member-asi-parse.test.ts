/**
 * The vendored grammar's scanner inserts an implicit `;` before a `<` that
 * starts a line inside a type or class body, so a generic call-signature
 * overload after a member with no `;` parses (tree-sitter-typescript #335):
 *
 *   interface I { a: string
 *     <A>(self: A): A }        → property `a`, call signature
 *
 * Right after a bare member name, though, tsc reads the `<` as that member's
 * type parameters, so `find\n<T>(id): T` is ONE method. Splitting it there
 * turns a method into a property and drops its call edges, and the interface
 * form parses without an error, so only the node kinds show it. The same holds
 * for `(`: `find\n(id): T` is one method too.
 *
 * The scanner learns "right after a member name" from a never-produced
 * external token that the grammar allows only there. Checking whether `(`
 * could come next instead also fired after `typeof x` / `import("m").X`
 * types and after `return`, which these cases pin.
 * See docs/grammars/tree-sitter-typescript.md.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Node } from 'web-tree-sitter';
import { initGrammars, loadGrammarsForLanguages, getParser } from '../src/extraction/grammars';

beforeAll(async () => {
  await initGrammars();
  await loadGrammarsForLanguages(['typescript', 'tsx']);
});

const MEMBER_KINDS = [
  'method_signature',
  'method_definition',
  'abstract_method_signature',
  'property_signature',
  'public_field_definition',
  'call_signature',
  'construct_signature',
];

function members(language: 'typescript' | 'tsx', src: string): { hasError: boolean; kinds: string[] } {
  const root: Node = getParser(language)!.parse(src)!.rootNode;
  return { hasError: root.hasError, kinds: root.descendantsOfType(MEMBER_KINDS).map((n) => n.type) };
}

describe('TypeScript member ASI before `<`', () => {
  it.each(['typescript', 'tsx'] as const)('%s: a member name then `<T>` on the next line is one method', (language) => {
    const cases: Array<[string, string[]]> = [
      ['interface Repo {\n  find\n    <T>(id: string): T\n}', ['method_signature']],
      ['interface I {\n  a?\n  <T>(): T\n}', ['method_signature']],
      ['class Svc {\n  load\n    <T>(id: string): T { return helper(id) }\n}', ['method_definition']],
      ['abstract class A {\n  abstract m\n  <T>(): T\n}', ['abstract_method_signature']],
      ['declare class D {\n  m\n  <T>(): T\n}', ['method_signature']],
      ['interface I {\n  find\n  (id: string): T\n}', ['method_signature']],
      ['interface I {\n  a?\n  (id: string): T\n}', ['method_signature']],
      ['class C {\n  load\n  (id: string) { return helper(id) }\n}', ['method_definition']],
    ];
    for (const [src, want] of cases) {
      const got = members(language, src);
      expect(got.hasError, src).toBe(false);
      expect(got.kinds, src).toEqual(want);
    }
  });

  it.each(['typescript', 'tsx'] as const)('%s: after a type, `<` on the next line starts a call signature', (language) => {
    const cases: Array<[string, string[]]> = [
      ['interface I {\n  a: string\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      ['interface I {\n  a: Foo\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      ['interface I {\n  f(): void\n  <A>(self: A): A\n}', ['method_signature', 'call_signature']],
      ['interface I {\n  (a: string)\n  <A>(self: A): A\n}', ['call_signature', 'call_signature']],
      ['interface I {\n  a: string\n  (id: string): T\n}', ['property_signature', 'call_signature']],
      ['interface I {\n  a: typeof b\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      ['interface I {\n  a: typeof b.c\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      ['interface I {\n  a: typeof this.x\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      ['type O = {\n  a: keyof typeof b\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      ['interface I {\n  a: import("m").X\n  <A>(self: A): A\n}', ['property_signature', 'call_signature']],
      [
        'type T = {\n  readonly a: number\n  <A>(self: A): A\n  new <B>(b: B): B\n}',
        ['property_signature', 'call_signature', 'construct_signature'],
      ],
    ];
    for (const [src, want] of cases) {
      const got = members(language, src);
      expect(got.hasError, src).toBe(false);
      expect(got.kinds, src).toEqual(want);
    }
  });

  it.each([
    ['typescript', ['function f() {\n  return\n  <any>x\n}', 'function f() {\n  return\n  <T,>(x: T) => x\n}']],
    ['tsx', ['function f() {\n  return\n  <div/>\n}', 'function f() {\n  return\n  <T,>(x: T) => x\n}']],
  ] as const)('%s: `return` then `<` on the next line still ends the return', (language, sources) => {
    // tsc: `return;` then a type-assertion / generic-arrow / JSX statement.
    for (const src of sources) {
      const root = getParser(language)!.parse(src)!.rootNode;
      expect(root.hasError, src).toBe(false);
      const ret = root.descendantsOfType('return_statement');
      expect(ret, src).toHaveLength(1);
      expect(ret[0]!.namedChildCount, src).toBe(0);
      expect(root.descendantsOfType('expression_statement'), src).toHaveLength(1);
    }
  });
});
