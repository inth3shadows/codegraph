/**
 * A member call through an import, `express.static()`, is a call of that
 * member, never of the module's default export it hangs off: when the
 * member can't be found, the call stays unresolved rather than landing on
 * `createApplication` or `User`. A member the module does export
 * (`exports.Router = Router`) still links, and an imported value (the `users`
 * array) stays the receiver its member calls link to, as before.
 */
import { afterEach, describe, expect, it } from 'vitest';
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-member-receiver-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  const cg = await CodeGraph.init(root, { index: true });
  graphs.push(cg);
  return cg;
}

/** What `fn` calls, as `<file>:<qualified name>`, sorted. */
function callsOf(cg: CodeGraph, fn: string): string[] {
  const node = cg.getNodesByName(fn).find((n) => n.kind === 'function');
  expect(node, fn).toBeDefined();
  return cg.getOutgoingEdges(node!.id)
    .filter((e) => e.kind === 'calls')
    .map((e) => { const t = cg.getNode(e.target)!; return `${t.filePath}:${t.qualifiedName}`; })
    .sort();
}

const EXPRESS = [
  "var Router = require('router');",
  "var bodyParser = require('body-parser');",
  'exports = module.exports = createApplication;',
  'function createApplication() { return function app() {}; }',
  'exports.Router = Router;',
  'exports.json = bodyParser.json;',
  "exports.static = require('serve-static');",
  '',
].join('\n');

describe('a member call through an import is not a call of the import itself', () => {
  it.each([
    ["const express = require('./express');", 'express'],
    ["import express from './express';", 'express'],
  ])('leaves express.static() and express.json() unresolved after %s', async (binding, recv) => {
    const cg = await indexProject({
      'express.js': EXPRESS,
      'app.js': `${binding}\nfunction run() {\n  ${recv}.static('public');\n  ${recv}.json();\n}\nmodule.exports = run;\n`,
    });
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it('keeps express() itself and a member the module exports by name', async () => {
    const cg = await indexProject({
      'express.js': EXPRESS,
      'app.js': "const express = require('./express');\nfunction run() {\n  express();\n  express.Router();\n}\nmodule.exports = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['express.js:Router', 'express.js:createApplication']);
  });

  it('leaves a static property assigned to an exported function unresolved', async () => {
    const cg = await indexProject({
      'user.js': "module.exports = User;\nfunction User(name) { this.name = name; }\nUser.all = function (fn) { fn(null, []); };\n",
      'app.js': "const User = require('./user');\nfunction run() {\n  User.all(() => {});\n  new User('a');\n}\nmodule.exports = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual([]);
  });

  it('does not guess another class for a member of an imported function', async () => {
    const cg = await indexProject({
      'model.js': "function Model () {}\nModel.insertMany = async function insertMany (arr) { return arr }\nModel.init = function init () { return 1 }\nmodule.exports = Model\n",
      'other.js': 'class Cast { init () { return 1 } insertMany () { return 2 } }\n',
      'app.js': "const Model = require('./model')\nasync function run () { await Model.init(); await Model.insertMany([1]) }\nmodule.exports = run\n",
    });
    expect(callsOf(cg, 'run').filter((e) => e.startsWith('other.js'))).toEqual([]);
  });

  it('keeps an exported value as the receiver of a member it does not declare', async () => {
    const cg = await indexProject({
      'db.js': "var users = [];\nusers.push({ name: 'Tobi' });\nmodule.exports = users;\n",
      'app.js': "const users = require('./db');\nfunction run() {\n  return users.map((u) => u.name);\n}\nmodule.exports = run;\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['db.js:users']);
  });

  it('still links a static method of an imported class', async () => {
    const cg = await indexProject({
      'foo.ts': 'export class Foo { static bar() {} }\n',
      'app.ts': "import { Foo } from './foo';\nexport function run() { Foo.bar(); }\n",
    });
    expect(callsOf(cg, 'run')).toEqual(['foo.ts:Foo::bar']);
  });
});
