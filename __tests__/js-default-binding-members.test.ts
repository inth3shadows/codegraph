/**
 * A member read through a default binding: `const named = require('./m');
 * named.second()`, or `import named from './m'` on the same module.
 *
 * Such a binding is the whole module where the module states no default of its
 * own, and the default lookup could only guess at its first export: every
 * member of a CommonJS module of `exports.x = …` assignments landed on
 * whichever function was assigned first, a method that doesn't exist among them.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const roots: string[] = [];
const graphs: CodeGraph[] = [];
afterEach(() => {
  for (const cg of graphs.splice(0)) cg.close();
  for (const r of roots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

async function indexProject(files: Record<string, string>): Promise<CodeGraph> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-default-member-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  const cg = await CodeGraph.init(root, { index: true });
  graphs.push(cg);
  return cg;
}

/** What each line of `fn` calls: `<line> <file>:<qualified name>`, sorted. */
function callsOf(cg: CodeGraph, fn: string): string[] {
  const node = cg.getNodesByName(fn).find((n) => n.kind === 'function');
  expect(node, fn).toBeDefined();
  return cg.getOutgoingEdges(node!.id)
    .filter((e) => e.kind === 'calls')
    .map((e) => {
      const t = cg.getNode(e.target)!;
      return `${e.line} ${t.filePath}:${t.qualifiedName}`;
    })
    .sort();
}

const CALLER = (binding: string, members: string[]): string =>
  `${binding}\nfunction run() {\n${members.map((m) => `  named.${m}();`).join('\n')}\n}\nmodule.exports.run = run;\n`;

describe('a member read through a default binding', () => {
  it.each([
    ['anonymous functions', 'exports.first = function () {};\nexports.second = function () {};\n', 'm.js:second'],
    ['named functions', 'exports.first = function first() {};\nexports.second = function second() {};\n', 'm.js:second'],
    ['a function of another name', 'exports.first = function one() {};\nexports.second = function two() {};\n', 'm.js:two'],
    ['local functions', 'function first() {}\nfunction second() {}\nexports.first = first;\nexports.second = second;\n', 'm.js:second'],
    ['an object of them', 'function first() {}\nfunction second() {}\nmodule.exports = { first, second };\n', 'm.js:second'],
  ])('reaches the export of that name on a CommonJS module of %s', async (_shape, module, target) => {
    const cg = await indexProject({
      'm.js': module,
      'use.js': CALLER("const named = require('./m');", ['second']),
    });
    expect(callsOf(cg, 'run')).toEqual([`3 ${target}`]);
  });

  it('reaches it through a module that forwards another whole', async () => {
    const cg = await indexProject({
      'index.js': "module.exports = require('./lib/m');\n",
      'lib/m.js': 'exports.first = function () {};\nexports.second = function () {};\n',
      'use.js': CALLER("const named = require('./index');", ['second']),
    });
    expect(callsOf(cg, 'run')).toEqual(['3 lib/m.js:second']);
  });

  it('reaches it through a default import of the module too', async () => {
    const cg = await indexProject({
      'm.js': 'exports.first = function () {};\nexports.second = function () {};\n',
      'use.mjs': "import named from './m.js';\nexport function run() {\n  named.second();\n}\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:second']);
  });

  it('reaches it on an ES module with no default, or one whose default is an expression', async () => {
    const cg = await indexProject({
      'plain.mjs': 'export function first() {}\nexport function second() {}\n',
      'made.mjs': 'export function first() {}\nexport function second() {}\nexport default make();\nfunction make() { return {}; }\n',
      'use.js': "const plain = require('./plain.mjs');\nconst made = require('./made.mjs');\nfunction run() {\n  plain.second();\n  made.second();\n}\nmodule.exports.run = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['4 plain.mjs:second', '5 made.mjs:second']);
  });

  it('keeps the value a declaration file says a module is', async () => {
    const cg = await indexProject({
      'typings/passport.d.ts': "declare module 'passport-x' {\n  const passport: { use(): void };\n  export = passport;\n}\n",
      'use.ts': "import passport from 'passport-x';\nexport function run() {\n  passport.use();\n}\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['3 typings/passport.d.ts:passport']);
  });

  it('links nothing for a name the module does not export', async () => {
    const cg = await indexProject({
      'm.js': 'exports.first = function () {};\nexports.second = function () {};\n',
      'plain.mjs': 'export function first() {}\n',
      'use.js': "const named = require('./m');\nconst plain = require('./plain.mjs');\nfunction run() {\n  named.missing();\n  plain.missing();\n}\nmodule.exports.run = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it.each([
    ["const named = require('./m');", 'Decoy'],
    ["import named from './m.js';", 'Decoy'],
    ["const named = require('./m');", 'named'],
  ])('does not borrow an unimported method after %s, even from class %s', async (binding, className) => {
    const cg = await indexProject({
      'm.js': 'exports.known = function known() {};\n',
      'decoy.js': `export class ${className} { static missing() {} }\n`,
      'use.js': CALLER(binding, ['missing']),
    });
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it('keeps real exports beside an unimported method and through a forwarding module', async () => {
    const cg = await indexProject({
      'm.js': 'exports.second = function second() {};\n',
      'index.js': "module.exports = require('./m');\n",
      'decoy.js': 'export class Decoy { second() {} missing() {} }\n',
      'use.js': CALLER("const named = require('./index');", ['second', 'missing']),
    });
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:second']);
  });

  it('keeps CommonJS stated class, object, instance and callable exports', async () => {
    const cg = await indexProject({
      'class.js': 'class Widget { static make() {} }\nmodule.exports = Widget;\n',
      'object.js': 'const api = { read() {} };\nmodule.exports = api;\n',
      'instance.js': 'class Store { load() {} }\nmodule.exports = new Store();\n',
      'callable.js': 'function create() {}\nmodule.exports = create;\nmodule.exports.extra = function extra() {};\n',
      'decoy.js': 'export class Decoy { make() {} read() {} load() {} extra() {} }\n',
      'use.js': "const Widget = require('./class');\nconst object = require('./object');\nconst store = require('./instance');\nconst create = require('./callable');\nfunction run() {\n  Widget.make();\n  object.read();\n  store.load();\n  create();\n  create.extra();\n}\nmodule.exports = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual([
      '10 callable.js:extra', '6 class.js:Widget::make', '7 object.js:api::read',
      '8 instance.js:Store::load', '9 callable.js:create',
    ]);
  });

  it('keeps typed parameters and local objects that shadow a default binding', async () => {
    const cg = await indexProject({
      'm.ts': 'export function known() {}\n',
      'use.ts': "import named from './m';\nclass Local { missing() {} }\nexport function typed(named: Local) {\n  named.missing();\n}\nexport function literal() {\n  const named = { present() {} };\n  named.present();\n}\n",
      'decoy.ts': 'export class Decoy { missing() {} present() {} }\n',
    });
    expect(callsOf(cg, 'typed')).toEqual(['4 use.ts:Local::missing']);
    expect(callsOf(cg, 'literal')).toEqual(['8 use.ts:literal::named::present']);
  });

  it.each([
    "import named from './m';",
    "import * as named from './m';",
  ])('keeps a lexical class shadow after %s', async (binding) => {
    const cg = await indexProject({
      'm.ts': 'export function known() {}\n',
      'use.ts': `${binding}\nexport function outer() {\n  class named { static missing() {} }\n  function run() { named.missing(); }\n  return run;\n}\n`,
    });
    expect(callsOf(cg, 'run')).toEqual(['4 use.ts:outer::named::missing']);
  });

  it.each([
    'module.exports = new Store();',
    'export default new Store();',
  ])('keeps the instance stated by %s', async (statement) => {
    const cg = await indexProject({
      'm.js': `class Store { load() {} }\n${statement}\n`,
      'decoy.js': 'export class Decoy { missing() {} }\n',
      'use.js': CALLER("const named = require('./m');", ['load']),
    });
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:Store::load']);
  });

  it('keeps a missing member unresolved when a decoy is added by sync', async () => {
    const cg = await indexProject({
      'm.js': 'exports.known = function known() {};\n',
      'use.js': CALLER("const named = require('./m');", ['missing']),
    });
    expect(callsOf(cg, 'run')).toEqual([]);
    const decoy = path.join(roots[roots.length - 1]!, 'decoy.js');
    fs.writeFileSync(decoy, 'export class Decoy { missing() {} }\n');
    await cg.sync();
    expect(callsOf(cg, 'run')).toEqual([]);
    fs.unlinkSync(decoy);
    await cg.sync();
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it('takes what `module.exports =` states over a neighbour assigned to it', async () => {
    const cg = await indexProject({
      'm.js': 'function main() {}\nmodule.exports = main;\nmodule.exports.extra = function () {};\n',
      'use.js': "const named = require('./m');\nfunction run() {\n  named();\n  named.extra();\n}\nmodule.exports.run = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:main', '4 m.js:extra']);
  });

  it.each([
    ['./m', 'named'], ['./index', 'named'],
    ['./m', 'Store'], ['./index', 'Store'],
  ])('rechecks calls through %s as %s when it changes between a value and a namespace', async (specifier, alias) => {
    const value = 'class Store { load() {} }\nmodule.exports = new Store();\n';
    const namespace = 'class Store { load() {} }\nexports.known = function known() {};\n';
    const files = {
      'm.js': value,
      'index.js': "module.exports = require('./m');\n",
      'use.js': CALLER(`const named = require('${specifier}');`, ['load']).replace(/\bnamed\b/g, alias),
    };
    const cg = await indexProject(files);
    const moduleFile = path.join(roots[roots.length - 1]!, 'm.js');
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:Store::load']);
    for (const source of [namespace, value, namespace]) {
      fs.writeFileSync(moduleFile, source);
      await cg.sync();
      const fresh = await indexProject({ ...files, 'm.js': source });
      expect(callsOf(cg, 'run')).toEqual(callsOf(fresh, 'run'));
      expect(callsOf(cg, 'run')).toEqual(source === value ? ['3 m.js:Store::load'] : []);
    }
  });

  it.each(['exports.load', 'module.exports.load', "exports['load']", "module.exports['load']"])(
    'keeps the callable alias in %s without borrowing an absent member', async (assignment) => {
      const cg = await indexProject({
        'm.js': `class Store { load() {} }\n${assignment} = Store.prototype.load;\n`,
        'decoy.js': 'export class Decoy { missing() {} }\n',
        'use.js': CALLER("const named = require('./m');", ['load', 'missing']),
      });
      expect(callsOf(cg, 'run')).toEqual(['3 m.js:Store::load']);
    }
  );

  it('drops an exported callable alias when sync removes only the assignment', async () => {
    const cg = await indexProject({
      'm.js': 'class Store { load() {} }\nexports.load = Store.prototype.load;\n',
      'use.js': CALLER("const named = require('./m');", ['load']),
    });
    const moduleFile = path.join(roots[roots.length - 1]!, 'm.js');
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:Store::load']);
    fs.writeFileSync(moduleFile, 'class Store { load() {} }\nexports.known = function known() {};\n');
    await cg.sync();
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it.each([
    "const named = require('./m');",
    "import named from './m';",
    "import * as named from './m';",
  ])('sees a block-local class only inside its block after %s', async (binding) => {
    const cg = await indexProject({
      'm.ts': 'export function known() {}\n',
      'use.ts': `${binding}\nexport function run() {\n  if (true) {\n    class named { static missing() {} }\n    function inside() { named.missing(); }\n  }\n  named.missing();\n}\n`,
    });
    expect(callsOf(cg, 'run')).toEqual([]);
    expect(callsOf(cg, 'inside')).toEqual(['5 use.ts:run::named::missing']);
  });

  it('does not mistake a class inside a TypeScript namespace for an import shadow', async () => {
    const cg = await indexProject({
      'm.ts': 'export function known() {}\n',
      'use.ts': "import named from './m';\nnamespace Parent {\n  export class named { static missing() {} }\n}\nexport function run() { named.missing(); }\n",
    });
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it.each([
    '// exports.missing = fake;',
    '/* exports.missing = fake; */',
    'const text = "exports.missing = fake;";',
    'const text = `exports.missing = fake;`;',
    'const pattern = /exports.missing = fake/;',
    'function setup(holder) { holder.exports.missing = 42; }',
    'function setup(holder) { holder . exports . missing = 42; }',
    'function setup(holder) { holder.module.exports.missing = 42; }',
  ])('does not treat non-export text as a member: %s', async (extra) => {
    const cg = await indexProject({
      'm.js': `exports.known = function known() {};\n${extra}\n`,
      'decoy.js': 'export class Decoy { missing() {} }\n',
      'use.js': CALLER("const named = require('./m');", ['missing']),
    });
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it.each([
    "eval('exports.load = Store.prototype.load;');",
    'eval(`exports.load = Store.prototype.load;`);',
    "(eval)('exports.load = Store.prototype.load;');",
    'require.cache[__filename].exports = new Store();',
  ])('keeps uncertain runtime export APIs: %s', async (mutation) => {
    const cg = await indexProject({
      'm.js': `class Store { load() {} }\n${mutation}\n`,
      'use.js': CALLER("const named = require('./m');", ['load']),
    });
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:Store::load']);
  });

  it('links the member a sync brings, and drops the one it takes away', async () => {
    const cg = await indexProject({
      'm.js': 'exports.first = function () {};\n',
      'use.js': CALLER("const named = require('./m');", ['second']),
    });
    expect(callsOf(cg, 'run')).toEqual([]);
    const moduleFile = path.join(roots[roots.length - 1]!, 'm.js');
    fs.writeFileSync(moduleFile, 'exports.first = function () {};\nexports.second = function () {};\n');
    await cg.sync();
    expect(callsOf(cg, 'run')).toEqual(['3 m.js:second']);
    fs.writeFileSync(moduleFile, 'exports.first = function () {};\n');
    await cg.sync();
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it("keeps a stated default's own member, and a class the module makes its default", async () => {
    const cg = await indexProject({
      'stated.ts': 'export class Widget { static make() {} }\nexport function make() {}\nexport default Widget;\n',
      'instance.ts': 'export class Store { load() {} }\nexport default new Store();\n',
      'value.ts': 'class Cache { read() {} }\nconst cache: Cache = new Cache();\nexport function read() {}\nexport default cache;\n',
      'use.ts': "import Widget from './stated';\nimport store from './instance';\nimport cache from './value';\nexport function run() {\n  Widget.make();\n  store.load();\n  cache.read();\n}\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['5 stated.ts:Widget::make', '6 instance.ts:Store::load', '7 value.ts:Cache::read']);
  });
});
