import { describe, expect, it } from 'vitest';
import { readCommonJsExportMembers } from '../src/resolution/commonjs-export-members';

describe('CommonJS export member discovery', () => {
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
