import { beforeAll, describe, expect, it } from 'vitest';
import { readCommonJsExportMembers as readMembers } from '../src/resolution/commonjs-export-members';
import { getParser, loadGrammarsForLanguages } from '../src/extraction/grammars';
import { hasCommonJsEvalCall } from '../src/extraction/commonjs-eval';

beforeAll(async () => { await loadGrammarsForLanguages(['javascript', 'typescript', 'tsx']); });

function readCommonJsExportMembers(source: string, jsx = false) {
  return readMembers(source, jsx, () => {
    const language = jsx ? 'tsx' : source.includes('generic<T>') ? 'typescript' : 'javascript';
    const tree = getParser(language)!.parse(source)!;
    try { return hasCommonJsEvalCall(tree.rootNode); }
    finally { tree.delete(); }
  });
}

describe('CommonJS export member discovery', () => {
  describe.each([
    ['namespace writes', 'exports.known = known;', 'namespace', ['known']],
    ['direct alias', 'exports.load = Store.prototype.load;', 'namespace', ['load']],
    ['root object', 'module.exports = { load: Store.prototype.load };', 'value', []],
    ['root instance', 'module.exports = new Store();', 'value', []],
    ['computed write', 'exports[key] = Store.prototype.load;', 'opaque', []],
    ['escaped exports', 'take(exports);', 'opaque', []],
  ] as const)('%s independently of eval certainty', (_label, assignment, exportForm, members) => {
    it.each([
      ['absent', false], ['present', true], ['unknown', null],
    ] as const)('retains export evidence when eval is %s', (evalState, fact) => {
      const result = readMembers(`${assignment}\nwrap(eval)("code");`, false, () => fact);
      expect(result).toMatchObject({ exportForm, evalState });
      expect([...result.members]).toEqual(members);
      expect(result.uncertain).toBe(exportForm !== 'namespace' || fact !== false);
    });
  });

  it.each([
    'module["exports"] = new Store();',
    'module /* root */ ["exports"] = { load: Store.prototype.load };',
    'exports = module.exports = new Store();',
    'module.exports = exports = new Store();',
    'exports.known = known; module.exports = new Store();',
    'module.exports = new Store(); module.exports.extra = extra;',
    'module.exports = new Store(); take(module.exports);',
  ])('retains a stated whole value beside bracket or mixed writes: %s', (source) => {
    const result = readMembers(`${source}\nwrap(eval)("code");`, false, () => null);
    expect(result).toMatchObject({ exportForm: 'value', evalState: 'unknown', uncertain: true });
  });

  it.each([
    'holder.module.exports = new Store();',
    'module.exports === new Store();',
    'module.exports.load = Store.prototype.load;',
    'const text = "module.exports = new Store();";',
  ])('does not infer a stated whole value from %s', (source) => {
    expect(readMembers(source)).not.toHaveProperty('exportForm', 'value');
  });

  it('does not prove eval absent when the extraction fact is missing or unknown', () => {
    expect(readMembers('wrap(eval)("ignored");').uncertain).toBe(true);
    expect(readMembers('wrap(eval)("ignored");', false, () => null).uncertain).toBe(true);
  });
  it.each([
    'exports.load = Store.prototype.load;',
    'module.exports.load = Store.prototype.load;',
    "exports['load'] = Store.prototype.load;",
    'module.exports["load"] = Store.prototype.load;',
    'module["exports"]["load"] = Store.prototype.load;',
    'exports /* target */ . /* key */ load = Store.prototype.load;',
    'const text = `${exports.load = Store.prototype.load}`;',
    'const text = `outer ${`inner ${exports.load = Store.prototype.load}`}`;',
    'function generic<T>() { exports.load = Store.prototype.load; }',
  ])('finds executable assignment: %s', (source) => {
    const result = readCommonJsExportMembers(source);
    expect([...result.members]).toEqual(['load']);
    expect(result.uncertain).toBe(false);
  });

  it.each([
    '// exports.missing = fake;',
    '/* exports.missing = fake; */',
    'const text = "exports.missing = fake;";',
    'const text = `exports.missing = fake;`;',
    'const pattern = /exports.missing = fake/;',
    'if (true) /exports.missing = fake/.test("x");',
    'function setup(holder) { holder.exports.missing = 42; }',
    'function setup(holder) { holder . exports . missing = 42; }',
    'function setup(holder) { holder.module.exports.missing = 42; }',
    'holder?.exports.missing;',
    '$exports.missing = fake;',
    'αexports.missing = fake;',
    'exports.missing === fake;',
    'const text = "module exports";',
    'let value: typeof exports.missing = undefined;',
    'type Loader = typeof require.cache;',
    'class Evaluator { eval(code) {} }',
    'wrap(eval)("ignored");',
    'wrap((eval))(("ignored"));',
    '(makeWrap())(eval)("ignored");',
    'wrap["call"](eval)("ignored");',
    'wrap?.(eval)("ignored");',
    'wrap`tag`(eval)("ignored");',
    'if (eval) ("ignored");',
  ])('ignores non-export text: %s', (source) => {
    const result = readCommonJsExportMembers(source);
    expect([...result.members]).toEqual([]);
    expect(result.uncertain).toBe(false);
  });

  it.each([
    'module.exports = new Store();',
    'take(exports);',
    'Object.setPrototypeOf(exports, Store.prototype);',
    'module.exports.__proto__ = Store.prototype;',
    'exports[key] = Store.prototype.load;',
    'exports["lo\\u0061d"] = Store.prototype.load;',
    "eval('exports.load = Store.prototype.load;');",
    'eval(`exports.load = Store.prototype.load;`);',
    'eval(`exports.load = ${Store.prototype.load};`);',
    "(eval)('exports.load = Store.prototype.load;');",
    "((eval))(('exports.load = Store.prototype.load;'));",
    "function setup() { return (eval)('exports.load = Store.prototype.load;'); }",
    'require.cache[__filename].exports = new Store();',
    "const Module = require('node:module');",
    "import { Module } from 'node:module';",
    "const Module = await import('node:module');",
  ])('preserves uncertain object APIs: %s', (source) => {
    expect(readCommonJsExportMembers(source).uncertain).toBe(true);
  });

  it('ignores JSX text but keeps assignments in JSX expressions', () => {
    const source = '<div title="exports.missing = fake">exports.missing = fake{exports.load = Store.prototype.load}</div>';
    const result = readCommonJsExportMembers(source, true);
    expect([...result.members]).toEqual(['load']);
    expect(result.uncertain).toBe(false);
  });
});
