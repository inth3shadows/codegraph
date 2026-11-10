import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { runInNewContext } from 'node:vm';
import { commonJsValueCases } from './fixtures/commonjs-value-cases';

const projects: Array<{ root: string; graph: CodeGraph }> = [];
afterEach(() => {
  for (const { root, graph } of projects.splice(0)) {
    graph.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

async function index(files: Record<string, string>): Promise<CodeGraph> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-export-evidence-'));
  for (const [file, source] of Object.entries(files)) fs.writeFileSync(path.join(root, file), source);
  const graph = await CodeGraph.init(root, { index: true });
  projects.push({ root, graph });
  return graph;
}

function calls(graph: CodeGraph, name: string): string[] {
  const node = graph.getNodesByName(name).find(n => n.kind === 'function')!;
  expect(node).toBeDefined();
  return graph.getOutgoingEdges(node.id).filter(e => e.kind === 'calls').map(e => {
    const target = graph.getNode(e.target)!;
    return `${target.filePath}:${target.qualifiedName}`;
  }).sort();
}

describe('export evidence at the real import boundary', () => {
  describe.each(['./m', './index'])('value identity through %s', specifier => {
    it.each([
      'const api={};api.load=Store.prototype.load;module.exports=api;',
      'class Factory{};Factory.load=Store.prototype.load;module.exports=Factory;',
      'function Factory(){};Factory.load=Store.prototype.load;module.exports=Factory;',
      'const api={};const alias=api;alias.load=Store.prototype.load;module.exports=api;',
      'const api={};module.exports=api;api.load=Store.prototype.load;',
    ])('preserves F14 callable ownership: %s', async assignment => {
      const source = `class Store { load(){return 42;} }\n${assignment}`;
      const module = { exports: {} as { load(): number } };
      runInNewContext(source, { module, exports: module.exports });
      expect(module.exports.load()).toBe(42);
      const graph = await index({
        'm.js': source,
        'index.js': "module.exports=require('./m');",
        'decoy.js': 'class Decoy { load() {} }',
        'use.js': `const named=require('${specifier}');function run(){return named.load();}`,
      });
      expect(calls(graph, 'run')).toEqual(['m.js:Store::load']);
    });

    it.each(['const value=42;exports.load=value;', 'const value="payload";module.exports={load:value};'])(
      'preserves F15 data without creating a call: %s', async source => {
        const module = { exports: {} as { load(): unknown } };
        runInNewContext(source, { module, exports: module.exports });
        expect(() => module.exports.load()).toThrow(/not a function/);
        const graph = await index({
          'm.js': source, 'index.js': "module.exports=require('./m');",
          'use.js': `const named=require('${specifier}');function run(){return named.load();}`,
        });
        expect(calls(graph, 'run')).toEqual([]);
      });

    it('follows an assigned callable rather than its storage variable', async () => {
      const graph = await index({
        'm.js': 'function real(){return 42;}let value;value=real;exports.load=value;',
        'index.js': "module.exports=require('./m');",
        'use.js': `const named=require('${specifier}');function run(){return named.load();}`,
      });
      expect(calls(graph, 'run')).toEqual(['m.js:real']);
    });
  });
  it.each([
    'const alias = Store.prototype.load; exports.load = alias;',
    'const alias = Store.prototype.load; module.exports = { load: alias };',
    'const alias = () => 42; module.exports = { load: alias };',
  ])('follows the exported callable alias: %s', async (assignment) => {
    const graph = await index({
      'm.js': `class Store { load() {} }\n${assignment}`,
      'decoy.js': 'class Decoy { load() {} }',
      'use.js': "const named = require('./m'); function run() { named.load(); }",
    });
    expect(calls(graph, 'run')).toEqual([assignment.includes('=>') ? 'm.js:alias' : 'm.js:Store::load']);
  });

  it('honors a typed parameter that shadows the import at the call site', async () => {
    const graph = await index({
      'm.js': 'class Store { load() {} } exports.load = Store.prototype.load;',
      'use.ts': "import named from './m';\nclass Local { load() {} }\nexport function run(named: Local) { named.load(); }",
    });
    expect(calls(graph, 'run')).toEqual(['use.ts:Local::load']);
  });

  it('honors a lexical class that shadows the import at the call site', async () => {
    const graph = await index({
      'm.js': 'class Store { load() {} } exports.load = Store.prototype.load;',
      'use.js': "const named = require('./m');\nfunction outer() { class named { static load() {} } function run() { named.load(); } return run; }",
    });
    expect(calls(graph, 'run')).toEqual(['use.js:outer::named::load']);
  });

  it.each([
    'module.exports = makeUnknown();',
    'eval(code);',
    "function eval(code) {} eval('exports.load = Store.prototype.load;');",
  ])('does not supply a global target for unsupported export behavior: %s', async (mutation) => {
    const graph = await index({
      'm.js': `class Store { load() {} }\n${mutation}`,
      'decoy.js': 'class Decoy { load() {} }',
      'use.js': "const named = require('./m'); function run() { named.load(); }",
    });
    expect(calls(graph, 'run')).toEqual([]);
  });
});


describe.each(['./m', './index'])('production value contract through %s', specifier => {
  it.each(commonJsValueCases)('%s', async (_label, source, status, selector) => {
    const graph = await index({
      'm.js': source,
      'index.js': "module.exports=require('./m');",
      'decoy.js': 'class Decoy { load() {} }',
      'use.js': `const named=require('${specifier}');function run(){return named.load();}`,
    });
    expect(calls(graph, 'run')).toEqual(status === 'positive' ? [selector] : []);
  });
});

describe('callable evidence across import syntax and sync', () => {
  it.each([
    "const {load}=require('./index');",
    "import {load} from './index';",
    "import load from './index';",
  ])('does not borrow a global callable for data: %s', async declaration => {
    const graph = await index({
      'm.js': 'const value=42;exports.load=value;',
      'index.js': "module.exports=require('./m');",
      'decoy.js': 'function load() {}',
      'use.js': `${declaration}function run(){return load();}`,
    });
    expect(calls(graph, 'run')).toEqual([]);
  });

  it('retains a local function shadow of a destructured require', async () => {
    const graph = await index({
      'm.js': 'exports.load=42;',
      'use.js': "const {load}=require('./m');function outer(){function load(){}function run(){load();}return run;}",
    });
    expect(calls(graph, 'run')).toEqual(['use.js:outer::load']);
  });

  it('recomputes forwarded identity and callability after source edits', async () => {
    const graph = await index({
      'm.js': 'class Store{load(){}}const api={};api.load=Store.prototype.load;module.exports=api;',
      'index.js': "module.exports=require('./m');",
      'use.js': "const named=require('./index');function run(){named.load();}",
    });
    expect(calls(graph, 'run')).toEqual(['m.js:Store::load']);
    const { root } = projects.find(project => project.graph === graph)!;
    for (const [source, targets] of [
      ['const value=42;exports.load=value;', []],
      ['function real(){}let value;value=real;exports.load=value;', ['m.js:real']],
      ['function real(){}let value=42;exports.load=value;', []],
      ['function real(){}let value=real;exports.load=value;', ['m.js:real']],
      ['const api={};module.exports=api;', []],
      ['class Store{load(){}}const api={};module.exports=api;api.load=Store.prototype.load;', ['m.js:Store::load']],
    ] as const) {
      fs.writeFileSync(path.join(root, 'm.js'), source);
      await graph.sync();
      expect(calls(graph, 'run')).toEqual(targets);
    }
  });
});


describe.each(['./m', './index'])('named CommonJS values through %s', specifier => {
  it.each([
    `const {load}=require('${specifier}');`,
    `import {load} from '${specifier}';`,
  ])('follows the stored callable through %s', async declaration => {
    const graph = await index({
      'm.js': 'function real(){}let value;value=real;exports.load=value;',
      'index.js': "module.exports=require('./m');",
      'use.js': `${declaration}function run(){load();}`,
    });
    expect(calls(graph, 'run')).toEqual(['m.js:real']);
  });

  it('selects a callable property of a named object import', async () => {
    const graph = await index({
      'm.js': 'function real(){}const api={load:real};exports.api=api;',
      'index.js': "module.exports=require('./m');",
      'use.js': `import {api} from '${specifier}';function run(){api.load();}`,
      'decoy.js': 'class Decoy{load(){}}',
    });
    expect(calls(graph, 'run')).toEqual(['m.js:real']);
  });

  it('keeps class construction separate from ordinary calls', async () => {
    const graph = await index({
      'm.js': 'class Store{}module.exports=Store;',
      'index.js': "module.exports=require('./m');",
      'use.js': `const Made=require('${specifier}');function run(){Made();}function construct(){return new Made();}`,
      'decoy.js': 'function Made(){}',
    });
    expect(calls(graph, 'run')).toEqual([]);
    const construct = graph.getNodesByName('construct').find(node => node.kind === 'function')!;
    expect(graph.getOutgoingEdges(construct.id).filter(edge => edge.kind === 'instantiates').map(edge => graph.getNode(edge.target)?.qualifiedName)).toEqual(['Store']);
  });
});

describe('unknown CommonJS evidence falls back within its evidence files (F17)', () => {
  it.each([
    ['constructed instance', 'class Foo { constructor(){ this.x=1; } load(){ return 1; } }\nmodule.exports = new Foo();\n', ['m.js:Foo::load']],
    ['inherited instance', 'class Base { base(){} }\nclass Foo extends Base { load(){ return 1; } }\nmodule.exports = new Foo();\n', ['m.js:Foo::load']],
    ['frozen object', 'const api = { load(){ return 1; } };\nObject.freeze(api);\nmodule.exports = api;\n', ['m.js:api::load']],
    ['Object.assign', 'function load(){ return 42; }\nObject.assign(module.exports, { load });\n', ['m.js:load']],
    ['defineProperty', "function load(){ return 42; }\nObject.defineProperty(module.exports, 'load', { value: load, enumerable: true });\n", ['m.js:load']],
  ])('%s', async (label, source, expected) => {
    // Baseline resolved assigned/defined members only through a destructured require.
    const use = /assign|define/i.test(label) ? "const {load}=require('./m');function run(){return load();}" : "const svc=require('./m');function run(){return svc.load();}";
    expect(calls(await index({ 'm.js': source, 'use.js': use }), 'run')).toEqual(expected);
    // A same-named candidate elsewhere is never the fallback's answer; at
    // worst the fallback declines.
    const withDecoy = calls(await index({ 'm.js': source, 'use.js': use, 'decoy.js': 'class Decoy { load() {} }\nfunction load() {}\n' }), 'run');
    expect(withDecoy.filter(target => !expected.includes(target))).toEqual([]);
  });

  it('follows spread re-exports into the spread modules', async () => {
    const graph = await index({ 'a.js': 'function load(){ return 1; }\nmodule.exports = { load };\n',
      'b.js': 'function save(){ return 2; }\nmodule.exports = { save };\n',
      'index.js': "module.exports = { ...require('./a'), ...require('./b') };\n", 'decoy.js': 'function save() {}\n',
      'use.js': "const { save } = require('./index');function run(){return save();}" });
    expect(calls(graph, 'run')).toEqual(['b.js:save']);
  });

  it.each([
    'const api={load:Store.prototype.load};opaque(api);module.exports=api;',
    'const api={load:Store.prototype.load};api[key]=42;module.exports=api;',
  ])('never falls back to the storage variable: %s', async exportSource => {
    const graph = await index({ 'm.js': `class Store { load() { return 42; } }\n${exportSource}`,
      'use.js': "const named=require('./m');function run(){return named.load();}" });
    expect(calls(graph, 'run')).toEqual([]);
  });
});

describe('sloppy-mode and closure-written CommonJS keep their import edges (F18, F19a)', () => {
  const use = "const svc=require('./m');const {helper}=require('./m');function run(){helper();return svc.main();}";
  it.each([
    ['hashbang', '#!/usr/bin/env node\nfunction main(){ return 1; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n'],
    ['legacy octal literal', 'var mode = 0755;\nfunction main(){ return mode; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n'],
    ['legacy octal escape', 'var s = "\\101";\nfunction main(){ return s; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n'],
    ['Flow annotations', '// @flow\nfunction main(x: number): number { return x; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n'],
  ])('%s', async (_label, source) => {
    expect(calls(await index({ 'm.js': source, 'use.js': use }), 'run')).toEqual(['m.js:helper', 'm.js:main']);
  });

  it('an unparsable file falls back instead of blocking its imports', async () => {
    const source = '<!-- legacy\nfunction main(){ return 1; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n';
    const graph = await index({ 'm.js': source, 'use.js': use, 'decoy.js': 'function helper() {}\nfunction main() {}\n' });
    expect(calls(graph, 'run').filter(target => !target.startsWith('m.js:'))).toEqual([]);
  });

  it.each([
    ['function IIFE', "(function(){\n  'use strict';\n  function main(){ return 1; }\n  function helper(){ return 2; }\n  module.exports = { main: main, helper: helper };\n})();\n"],
    ['arrow IIFE', '(() => {\n  function main(){ return 1; }\n  function helper(){ return 2; }\n  module.exports = { main, helper };\n})();\n'],
  ])('%s', async (_label, source) => {
    expect(calls(await index({ 'm.js': source, 'use.js': use }), 'run')).toEqual(['m.js:helper', 'm.js:main']);
  });

  it('a callback that never writes exports keeps exports closed', async () => {
    const source = 'function main(){ return 1; }\n[1].forEach(function(x){ return x; });\nmodule.exports = { main };\n';
    const graph = await index({ 'm.js': source, 'decoy.js': 'function helper() {}\n', 'use.js': use });
    expect(calls(graph, 'run')).toEqual(['m.js:main']);
  });
});
