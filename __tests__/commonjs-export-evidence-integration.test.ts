import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { runInNewContext } from 'node:vm';
import { commonJsValueCases } from './fixtures/commonjs-value-cases';
import { collectCommonJsExportEvidence as collect } from '../src/resolution/commonjs-export-evidence';

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

describe('opaque writes on a known value stay no-edge', () => {
  it.each([
    'const api={load:Store.prototype.load};opaque(api);module.exports=api;',
    'const api={load:Store.prototype.load};api[key]=42;module.exports=api;',
  ])('never resolves to the storage variable: %s', async exportSource => {
    const graph = await index({ 'm.js': `class Store { load() { return 42; } }\n${exportSource}`,
      'use.js': "const named=require('./m');function run(){return named.load();}" });
    expect(calls(graph, 'run')).toEqual([]);
  });
});

describe('sloppy-mode CommonJS stays in the model (F18)', () => {
  const use = "const svc=require('./m');const {helper}=require('./m');function run(){helper();return svc.main();}";
  const body = 'function main(){ return 1; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n';
  it.each([
    ['hashbang', `#!/usr/bin/env node\n${body}`],
    ['hashbang after a BOM', `\uFEFF#!/usr/bin/env node\n${body}`],
    ['legacy octal literal', `var mode = 0755;\n${body}`],
    ['legacy octal escape', `var s = "\\101";\n${body}`],
    ['leading-zero decimal', `var n = 08;\n${body}`],
    ['escape \\8', `var s = "\\8";\n${body}`],
    ['Flow annotations', '// @flow\nfunction main(x: number): number { return x; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n'],
  ])('%s', async (_label, source) => {
    expect(collect(source, 'm.js').commonJs).toBe(true);
    expect(calls(await index({ 'm.js': source, 'use.js': use }), 'run')).toEqual(['m.js:helper', 'm.js:main']);
  });

  it('a hashbang ended by a lone CR stays modelled and resolves as before', async () => {
    // The extractor reads `function main` as part of the hashbang line, as it
    // did before the model; only helper has a node to resolve to.
    const source = `#!/usr/bin/env node\r${body}`;
    expect(collect(source, 'm.js').members).toHaveProperty('main');
    expect(calls(await index({ 'm.js': source, 'use.js': use }), 'run')).toEqual(['m.js:helper']);
  });

  it('an unparsable file leaves the model', () => {
    expect(collect(`<!-- legacy\n${body}`, 'm.js')).toMatchObject({ commonJs: false, unmodeled: 'unparsed source' });
  });

  it('a callback that never writes exports keeps exports closed', async () => {
    const source = 'function main(){ return 1; }\n[1].forEach(function(x){ return x; });\nmodule.exports = { main };\n';
    const graph = await index({ 'm.js': source, 'decoy.js': 'function helper() {}\n', 'use.js': use });
    expect(calls(graph, 'run')).toEqual(['m.js:main']);
  });
});

describe('a file outside the value model resolves exactly as before the model', () => {
  // Each expectation is the pre-PR (87576a8d) graph for the same files.
  it.each([
    ["ctorcls", {"c.js":"const svc=require('./m');\nfunction run(){ return svc.load(); }\nmodule.exports=run;\n","m.js":"class Foo {\n  constructor(){ this.x=1; }\n  load(){ return 1; }\n}\nmodule.exports = new Foo();\n"}, ["m.js:Foo::load"], "incomplete: custom construction/inheritance outside contract"],
    ["extcls", {"c.js":"const svc=require('./m');\nfunction run(){ svc.base(); return svc.load(); }\nmodule.exports=run;\n","m.js":"class Base { base(){ return 2; } }\nclass Foo extends Base {\n  load(){ return 1; }\n}\nmodule.exports = new Foo();\n"}, ["m.js:Base::base","m.js:Foo::load"], "incomplete: custom construction/inheritance outside contract"],
    ["evbus", {"c.js":"const bus=require('./m');\nfunction run(){ bus.publish(1); }\nmodule.exports=run;\n","m.js":"const EventEmitter = require('events');\nclass Bus extends EventEmitter {\n  publish(x){ this.emit('x', x); }\n}\nmodule.exports = new Bus();\n"}, ["m.js:Bus::publish"], "incomplete: custom construction/inheritance outside contract"],
    ["oassign", {"c.js":"const api = require('./m');\nconst { load } = require('./m');\nfunction run(){ load(); return api.load(); }\nmodule.exports = run;\n","m.js":"function load(){ return 42; }\nObject.assign(module.exports, { load });\n"}, ["m.js:load"], "incomplete: unmodeled builtin write"],
    ["spreadreq", {"a.js":"function load(){ return 1; }\nmodule.exports = { load };\n","b.js":"function save(){ return 2; }\nmodule.exports = { save };\n","c.js":"const api = require('./index');\nconst { save } = require('./index');\nfunction run(){ save(); return api.load(); }\nmodule.exports = run;\n","index.js":"module.exports = {\n  ...require('./a'),\n  ...require('./b'),\n};\n"}, ["b.js:save"], null],
    ["iife", {"c.js":"const lib = require('./m');\nconst { load } = require('./m');\nfunction run(){ load(); return lib.load(); }\nmodule.exports = run;\n","m.js":"(function(){\n  'use strict';\n  function load(){ return 1; }\n  module.exports = { load: load };\n})();\n"}, ["m.js:load","m.js:load"], "unmodeled use of module.exports"],
    ["thisexp2", {"c.js":"const { load } = require('./m');\nfunction run(){ return load(); }\nmodule.exports=run;\n","m.js":"function load(){ return 1; }\nthis.load = load;\n"}, ["m.js:load"], "top-level this"],
    ["topret", {"c.js":"const api = require('./m');\nconst { load } = require('./m');\nfunction run(){ load(); return api.load(); }\nmodule.exports = run;\n","m.js":"function load(){ return 1; }\nexports.load = load;\nif (exports.load) return;\nexports.load = 42;\n"}, ["m.js:load","m.js:load"], "top-level return"],
    ["interop", {"c.ts":"import load, { helper } from './m';\nexport function run(){ helper(); return load(); }\n","e.mjs.js":"import load from './m';\nexport function run2(){ return load(); }\n","m.js":"\"use strict\";\nObject.defineProperty(exports, \"__esModule\", { value: true });\nexports.helper = helper;\nexports.default = load;\nfunction load(){ return 1; }\nfunction helper(){ return 2; }\n"}, ["m.js:helper","m.js:load"], "ES module interop default"],
    ["callthis", {"m.js":"function main(){return 1;}\nfunction helper(){return 2;}\n(function(){ module.exports={main,helper}; }).call(this);\n","use.js":"const svc=require(\"./m\");const {helper}=require(\"./m\");function run(){helper();return svc.main();}\n"}, ["m.js:helper"], "unmodeled use of module.exports"],
    ["newfn", {"m.js":"function main(){return 1;}\nfunction helper(){return 2;}\nnew function(){ module.exports={main,helper}; };\n","use.js":"const svc=require(\"./m\");const {helper}=require(\"./m\");function run(){helper();return svc.main();}\n"}, ["m.js:helper"], "unmodeled use of module.exports"],
    ["aliasiife", {"m.js":"function main(){return 1;}\nfunction helper(){return 2;}\nconst api=module.exports={};\n(function(){ api.main=main; api.helper=helper; })();\n","use.js":"const svc=require(\"./m\");const {helper}=require(\"./m\");function run(){helper();return svc.main();}\n"}, ["m.js:helper"], "unmodeled use of exports"],
    ["varclosure", {"m.js":"function main(){return 1;}\nfunction helper(){return 2;}\nconst init=()=>{ module.exports={main,helper}; };\ninit();\n","use.js":"const svc=require(\"./m\");const {helper}=require(\"./m\");function run(){helper();return svc.main();}\n"}, ["m.js:helper"], "unmodeled use of module.exports"],
    ["fwd1", {"impl.js":"function load(){return 1;}\nObject.assign(exports,{load});\n","index.js":"module.exports = require('./impl');\n","use.js":"const {load}=require(\"./index\");function run(){return load();}\n"}, ["impl.js:load"], null],
    ["mixb", {"m.js":"function load(){return 1;}\nObject.assign(exports,{load});delete exports.load;\n","use.js":"const {load}=require(\"./m\");function run(){return load();}\n"}, ["m.js:load"], "unmodeled use of exports"],
    ["initfn", {"c.js":"const lib = require('./m');\nconst { helper } = require('./m');\nfunction run(){ helper(); return lib.load(); }\nmodule.exports = run;\n","m.js":"function load(){ return 1; }\nfunction helper(){ return 2; }\nfunction init(){ module.exports.load = load; module.exports.helper = helper; }\ninit();\n"}, ["m.js:helper"], "unmodeled use of module.exports"],
    ["namedcb", {"c.js":"const lib = require('./m');\nconst { helper } = require('./m');\nfunction run(){ helper(); return lib.load(); }\nmodule.exports = run;\n","m.js":"function load(){ return 1; }\nfunction helper(){ return 2; }\nfunction install(name){ module.exports[name] = name === 'load' ? load : helper; }\n['load','helper'].forEach(install);\n"}, ["m.js:helper"], "unmodeled use of module.exports"],
    ["clobber", {"c.js":"const lib = require('./m');\nconst { load } = require('./m');\nfunction run(){ load(); return lib.load(); }\nmodule.exports = run;\n","m.js":"class Impl { load(){ return 1; } }\nexports.load = 42;\nObject.assign(exports, { impl: new Impl() });\n"}, ["m.js:Impl::load"], "incomplete: unmodeled builtin write"],
    ["fwdesm", {"c.js":"const lib = require('./m');\nconst { helper } = require('./m');\nfunction run(){ helper(); return lib.load(); }\nmodule.exports = run;\n","impl.js":"export function load(){ return 1; }\nexport function helper(){ return 2; }\n","m.js":"module.exports = require('./impl');\n"}, ["impl.js:helper","impl.js:load"], null],
  ] as const)('%s', async (_name, files, expected, reason) => {
    const m = Object.keys(files).find(file => file === 'm.js');
    if (reason && m) expect(collect(files[m as keyof typeof files] as string, m)).toMatchObject({ commonJs: false, unmodeled: reason });
    expect(calls(await index(files), 'run')).toEqual(expected);
  });
});

describe('files the value model keeps', () => {
  it.each([
    ["frozen object", {"c.js":"const m=require('./m');\nfunction run(){ return m.load(); }\nmodule.exports=run;\n","m.js":"const api = { load(){ return 1; } };\nObject.freeze(api);\nmodule.exports = api;\n"}, ["m.js:api::load"]],
    ["legacy octal", {"c.js":"const util = require('./m');\nconst { mkdir } = require('./m');\nfunction run(){ mkdir('x'); return util.load(); }\nmodule.exports = run;\n","m.js":"var fs = require('fs');\nfunction mkdir(p){ return fs.mkdirSync(p, 0755); }\nfunction load(){ return 1; }\nmodule.exports = { mkdir: mkdir, load: load };\n"}, ["m.js:load","m.js:mkdir"]],
    ["hashbang", {"c.js":"const cli=require('./m');\nconst { helper } = require('./m');\nfunction run(){ helper(); return cli.main(); }\nmodule.exports=run;\n","m.js":"#!/usr/bin/env node\nfunction main(){ return 1; }\nfunction helper(){ return 2; }\nmodule.exports = { main, helper };\n"}, ["m.js:helper","m.js:main"]],
    ["literal-key data descriptor", {"c.js":"const api = require('./m');\nconst { load } = require('./m');\nfunction run(){ load(); return api.load(); }\nmodule.exports = run;\n","m.js":"function load(){ return 42; }\nObject.defineProperty(module.exports, 'load', { value: load, enumerable: true });\n"}, ["m.js:load","m.js:load"]],
    ["hoisted function first read in an if arm", {"c.js":"const cli = require('./m');\nconst { parse } = require('./m');\nfunction run(){ parse('y'); return cli.main(); }\nmodule.exports = run;\n","m.js":"if (require.main === module) {\n  main();\n}\nmodule.exports = { main, parse };\nfunction main(){ return parse('x'); }\nfunction parse(s){ return s; }\n"}, ["m.js:main","m.js:parse"]],
    ["__esModule marker keeps an unexported helper unlinked (R13-4)", {"m.js":"\"use strict\";\nObject.defineProperty(exports, \"__esModule\", { value: true });\nexports.main = void 0;\nfunction helper(){ return 2; }\nfunction main(){ return helper(); }\nexports.main = main;\n","use.js":"const svc=require(\"./m\");\nconst {helper}=require(\"./m\");\nfunction run(){ svc.helper(); helper(); return svc.main(); }\n"}, ["m.js:main"]],
    ["a closure that only reads module stays modeled (S8)", {"c.js":"const lib = require('./m');\nconst { load } = require('./m');\nfunction run(){ load(); return lib.load(); }\nmodule.exports = run;\n","m.js":"class Impl { load(){ return 1; } }\nexports.load = 42;\nprocess.nextTick(() => { if (require.main === module) console.log('main'); });\n"}, []],
    ["constructor function with prototype methods", {"c.js":"const { load } = require('./m');\nfunction run(){ return load(); }\nmodule.exports=run;\n","m.js":"function Foo(){}\nFoo.prototype.load = function load(){ return 1; };\nconst foo = new Foo();\nmodule.exports = { load: foo.load };\n"}, ["m.js:load"]],
  ] as const)('%s', async (_label, files, expected) => {
    expect(collect(files['m.js' as keyof typeof files] as string, 'm.js').commonJs).toBe(true);
    expect(calls(await index(files), 'run')).toEqual(expected);
  });
});

describe('round 14', () => {
  it('an unmodelled file uses the pre-model reader verbatim: wrap(eval)(code) is not a direct eval (R14-S1)', async () => {
    const graph = await index({
      'm.js': "class Impl { run(){ return 1; } }\nthis.flag = 1;\nexports.load = function load(){ return 2; };\nfunction wrap(f){ return f; }\nwrap(eval)('1');\n",
      'c.js': 'const lib = require("./m");\nconst { run } = require("./m");\nfunction go(){ run(); return lib.run(); }\nmodule.exports = go;\n',
    });
    expect(calls(graph, 'go')).toEqual([]);
  });

  const use = "const m=require('./m');const {a,b}=require('./m');\nfunction run(){ m.a(); m.b(); a(); b(); }\nmodule.exports=run;\n";
  const forwarder = 'exports.b=require("./y").b;exports.a=require("./y").a;\n';
  it.each([
    ['an ES module', 'export function b(){return 2}\nexport function a(){return 1}\n'],
    ['an unmodelled CommonJS file', 'function b(){return 2}\nfunction a(){return 1}\n(function(){exports.q=1})();\nexports.b=b;exports.a=a;\n'],
  ])('a member forwarded into %s resolves in that file (R14-6)', async (_label, target) => {
    expect(calls(await index({ 'm.js': forwarder, 'y.js': target, 'use.js': use }), 'run')).toEqual(['y.js:a', 'y.js:a', 'y.js:b', 'y.js:b']);
  });

  it('a same-named declaration the unmodelled file never exports is not the answer', async () => {
    const target = 'function b(){return 2}\nfunction a(){return 1}\n(function(){exports.q=1})();\nexports.a=a;\n';
    expect(calls(await index({ 'm.js': forwarder, 'y.js': target, 'use.js': use }), 'run')).toEqual(['y.js:a', 'y.js:a']);
  });
});
