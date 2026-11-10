import { beforeAll, describe, expect, it } from 'vitest';
import { getParser, loadGrammarsForLanguages } from '../src/extraction/grammars';
import { hasCommonJsEvalCall } from '../src/extraction/commonjs-eval';
import type { Language } from '../src/types';

beforeAll(async () => { await loadGrammarsForLanguages(['javascript', 'typescript', 'tsx']); });

function read(source: string, language: Language = 'javascript'): boolean | null {
  const tree = getParser(language)!.parse(source)!;
  try { return hasCommonJsEvalCall(tree.rootNode); }
  finally { tree.delete(); }
}

describe('AST recognition of CommonJS eval calls', () => {
  it.each([
    "eval('exports.load = Store.prototype.load;');",
    "((eval))(('exports.load = Store.prototype.load;'));",
    'eval(`exports.load = Store.prototype.load;`);',
    'eval(`exports.load = ${code};`);',
    "if (true) (eval)('exports.load = Store.prototype.load;');",
    "for (let i = 0; i < 1; i++) ((eval))('exports.load = Store.prototype.load;');",
    "function setup() { return (eval)('exports.load = Store.prototype.load;'); }",
    "function* setup() { yield (eval)('exports.load = Store.prototype.load;'); }",
    "const setup = { *run() { yield (eval)('exports.load = Store.prototype.load;'); } };",
    "function* setup() { const obj = { [yield (eval)('exports.load = Store.prototype.load;')]() {} }; }",
    "function yield(value) {} yield(eval('exports.load = Store.prototype.load;'));",
    'const text = `${eval(code)}`;',
    'eval(code);',
  ])('finds a real callee: %s', (source) => { expect(read(source)).toBe(true); });

  it.each([
    'wrap(eval)("ignored");',
    'wrap((eval))(("ignored"));',
    '(makeWrap())(eval)("ignored");',
    'wrap["call"](eval)("ignored");',
    'wrap?.(eval)("ignored");',
    'wrap`tag`(eval)("ignored");',
    'if (eval) ("ignored");',
    'function await(value) { return function ignore(code) {}; } await(eval)("ignored");',
    'function yield(value) { return function ignore(code) {}; } yield(eval)("ignored");',
    'function outer() { function yield(value) {} return yield(eval)("ignored"); }',
    'function* outer() { function nested() { function yield(value) {} yield(eval)("ignored"); } }',
    'function yield(value) {} const obj = { *[yield(eval)("ignored")]() {} };',
    'class Evaluator { eval(code) {} }',
    'const text = "eval(code)";',
    'const text = `eval(code)`;',
    '/* eval(code) */',
    'const pattern = /eval(code)/;',
    'holder.eval(code);',
  ])('does not confuse another expression with the callee: %s', (source) => {
    expect(read(source)).toBe(false);
  });

  it.each(['typescript', 'tsx'] as const)('uses the existing %s grammar', (language) => {
    expect(read("if (true) (eval)('exports.load = Store.prototype.load;');", language)).toBe(true);
    expect(read('wrap(eval)("ignored");', language)).toBe(false);
  });

  it('keeps a real call in a JSX expression', () => {
    expect(read('<div title="eval(code)">{(eval)(code)}</div>', 'tsx')).toBe(true);
    expect(read('<div title="eval(code)">eval(code)</div>', 'tsx')).toBe(false);
  });

  it('does not prove absence from malformed source', () => {
    expect(read('function broken( {')).toBe(null);
  });
});
