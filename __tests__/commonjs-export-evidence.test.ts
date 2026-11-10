import { describe, expect, it } from 'vitest';
import { collectCommonJsExportEvidence as collect, commonJsExportResult } from '../src/resolution/commonjs-export-evidence';

describe('binding-aware CommonJS export records', () => {
  it.each([
    'function pretend(module) { module.exports = {}; }',
    'const pretend = module => { module.exports = {}; };',
    '{ const module = {}; module.exports = {}; }',
    'function pretend() { module.exports = {}; var module; }',
    'function pretend({module}) { module.exports = {}; }',
    'try {} catch(module) { module.exports = {}; }',
  ])('ignores a shadowed wrapper binding: %s', (shadow) => {
    const record = collect(`exports.known = function known() {};\n${shadow}`, 'm.js');
    expect(record.defaults).toEqual([]);
    expect(Object.keys(record.members)).toEqual(['known']);
  });

  it.each([
    'module.exports = new Store();',
    '(module.exports) = new Store();',
    '((module["exports"])) = { load: Store.prototype.load };',
    'module.exports &&= new Store();',
  ])('records declaration ownership for %s', (assignment) => {
    const record = collect(`class Store { load() {} }\n${assignment}`, 'm.js');
    expect(record.members.load).toEqual([{ name: 'load', line: 1, column: 14, kind: 'method' }]);
    expect(record.version).toBe(2);
    expect(record.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    ['module.exports = class R { static make() {} route() {} };\n', 'make', 1, 34],
    ['const R = class { static make() {} };\nmodule.exports = R;\n', 'make', 1, 25],
    ['module.exports = { R: class { static make() {} } };\n', 'R.make', 1, 37],
    ['exports.Store = class StoreImpl {\n  static open() { return 4; }\n};\n', 'Store.open', 2, 9],
  ] as const)('keeps static methods of an exported class expression (#2499): %s', (source, member, line, column) => {
    const answer = commonJsExportResult(collect(source, 'm.js'), member);
    expect(answer.callable).toMatchObject({ status: 'positive', selector: { line, column, kind: 'method' } });
  });

  it('reads instance methods of an exported class expression through its prototype (#2499)', () => {
    const answer = commonJsExportResult(collect('module.exports = class R { route() {} };\n', 'm.js'), 'prototype.route');
    expect(answer.callable).toMatchObject({ status: 'positive', selector: { name: 'route', kind: 'method' } });
  });

  it('keeps static and instance members on their own exported value', () => {
    const record = collect('class Store { static make() {} load() {} } module.exports = Store;', 'm.js');
    expect(record.members.make).toHaveLength(1);
    expect(record.members.load).toBeUndefined();
  });

  it('replaces a previous whole value without treating old exports as the new object', () => {
    const record = collect('class Store { load() {} } module.exports = new Store(); module.exports = {}; exports.load = Store.prototype.load;', 'm.js');
    expect(record.members.load).toBeUndefined();
  });

  it('finds literal eval targets in generator scope, including declarations after the call site', () => {
    const record = collect("function* setup() { const obj = { [yield (eval)('exports.load = Store.prototype.load;')]() {} }; }\nclass Store { load() {} }\nsetup().next();", 'm.js');
    expect(record.members.load).toEqual([{ name: 'load', line: 2, column: 14, kind: 'method' }]);
  });

  it('does not interpret a local eval function as the intrinsic', () => {
    const record = collect("class Store { load() {} } function eval(code) {} eval('exports.load = Store.prototype.load;');", 'm.js');
    expect(record.members.load).toBeUndefined();
  });

  it('does not turn a dynamic eval into a declaration relationship', () => {
    const record = collect('class Store { load() {} } eval(code);', 'm.js');
    expect(record.unknown).toBe(true);
    expect(record.members.load).toBeUndefined();
  });

  it('returns no target on incomplete syntax', () => {
    const record = collect('module.exports = ;', 'm.js');
    expect(record.unknown).toBe(true);
    expect(record.defaults).toEqual([]);
  });

  it('leaves ESM and TypeScript export assignment to their existing resolver', () => {
    expect(collect('export default class Store {}', 'm.ts').commonJs).toBe(false);
    expect(collect('const value = {}; export = value;', 'm.ts').commonJs).toBe(false);
  });
});
