/**
 * A TypeScript import type, `import("./m").Shape`, names the export of that
 * module, the way `import { Shape } from "./m"` does. The grammar parses it as
 * an `import_type` node since tree-sitter-typescript fork v0.25.0 (before, a
 * call to a function named `import`). Read by its last name alone, the
 * reference reached whatever project declaration shared the name: another
 * copy of a package's types, or the property the type annotates. Now the name
 * is followed through the module, and a module the project doesn't hold links
 * nothing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

async function indexed(files: Record<string, string>): Promise<CodeGraph> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-ts-import-type-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return CodeGraph.init(root, { index: true });
}

/** `references` targets of the declarations named `name` in `file`, as `file:name`. */
function refs(cg: CodeGraph, file: string, name: string): string[] {
  const from = cg.searchNodes(name, { limit: 50 }).map((r) => r.node).filter((n) => n.name === name && n.filePath === file);
  if (from.length === 0) throw new Error(`no ${name} in ${file}`);
  return from
    .flatMap((n) => cg.getCallees(n.id))
    .filter((r) => r.edge.kind === 'references')
    .map((r) => `${r.node.filePath}:${r.node.name}`)
    .sort();
}

describe('TypeScript import types', () => {
  it('reach the export of the module they name, not a namesake elsewhere', async () => {
    const cg = await indexed({
      'src/shapes.ts': 'export interface Shape { a: number }\n',
      'src/other/shape.ts': 'export interface Shape { b: string }\n',
      'src/use.ts': 'export interface Holder {\n  shape: import("./shapes").Shape;\n  list: (import("./shapes").Shape)[];\n}\n',
    });
    try {
      expect(refs(cg, 'src/use.ts', 'shape')).toEqual(['src/shapes.ts:Shape']);
      expect(refs(cg, 'src/use.ts', 'list')).toEqual(['src/shapes.ts:Shape']);
    } finally {
      cg.close();
    }
  });

  it('reach the class a typeof import names, never the property it annotates', async () => {
    const cg = await indexed({
      'src/proxy.ts': 'export class ProxyZoneSpec { run(): void {} }\n',
      'src/global.ts': 'export interface Globals {\n  ProxyZoneSpec?: typeof import("./proxy").ProxyZoneSpec;\n}\n',
    });
    try {
      expect(refs(cg, 'src/global.ts', 'ProxyZoneSpec')).toEqual(['src/proxy.ts:ProxyZoneSpec']);
    } finally {
      cg.close();
    }
  });

  it('follow a namespace path inside the module', async () => {
    const cg = await indexed({
      'src/ns.ts': 'export namespace Outer {\n  export interface Inner { x: number }\n}\n',
      'src/elsewhere.ts': 'export interface Inner { y: number }\n',
      'src/use.ts': [
        'export const v: import("./ns").Outer.Inner = { x: 1 };',
        'export const w: import("./ns")',
        '  .Outer.Inner = { x: 1 };',
        'export const u: import("./ns")',
        '  // a note',
        '  .Outer',
        '  .Inner = { x: 1 };',
        '',
      ].join('\n'),
    });
    try {
      expect(refs(cg, 'src/use.ts', 'v')).toEqual(['src/ns.ts:Inner']);
      expect(refs(cg, 'src/use.ts', 'w')).toEqual(['src/ns.ts:Inner']);
      expect(refs(cg, 'src/use.ts', 'u')).toEqual(['src/ns.ts:Inner']);
    } finally {
      cg.close();
    }
  });

  it('link a package path the tsconfig maps to its source, not a copy of its types', async () => {
    const cg = await indexed({
      'tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@app/core': ['packages/core/index.ts'] } } }),
      'packages/core/index.ts': 'export { ModelSignal } from "./model";\n',
      'packages/core/model.ts': 'export interface ModelSignal<T> { value: T }\n',
      'tests/workspace/node_modules_mock/@app/core/index.d.ts': 'export declare interface ModelSignal<T> { value: T }\n',
      'tests/golden/out.d.ts': 'export declare class Cmp {\n  counter: import("@app/core").ModelSignal<number>;\n}\n',
    });
    try {
      expect(refs(cg, 'tests/golden/out.d.ts', 'counter')).toEqual(['packages/core/model.ts:ModelSignal']);
    } finally {
      cg.close();
    }
  });

  it('read the module across line breaks, comments and import attributes', async () => {
    const cg = await indexed({
      'src/shapes.ts': 'export interface Shape { a: number }\n',
      'src/other/shape.ts': 'export interface Shape { b: string }\n',
      'src/use.ts': [
        'export interface Holder {',
        '  split: import(',
        '    "./shapes"',
        '  ).Shape;',
        '  dotted: import("./shapes")',
        '    .Shape;',
        '  commented: import("./shapes" /* the shapes */).Shape;',
        '  attrs: import("./shapes", { with: { "resolution-mode": "import" } }).Shape;',
        '  noted: import("./shapes")',
        '    // the shapes module',
        '    .Shape;',
        '  inline: import("./shapes") /* the shapes */ .Shape;',
        '}',
        '',
      ].join('\n'),
    });
    try {
      for (const prop of ['split', 'dotted', 'commented', 'attrs', 'noted', 'inline']) {
        expect(refs(cg, 'src/use.ts', prop), prop).toEqual(['src/shapes.ts:Shape']);
      }
    } finally {
      cg.close();
    }
  });

  it('follow a namespace re-export the module makes', async () => {
    const cg = await indexed({
      'src/inner.ts': 'export interface T { x: number }\n',
      'src/other.ts': 'export interface T { y: number }\n',
      'src/m.ts': 'export * as ns from "./inner";\n',
      'src/use.ts': 'export interface Holder {\n  b: import("./m").ns.T;\n}\n',
    });
    try {
      expect(refs(cg, 'src/use.ts', 'b')).toEqual(['src/inner.ts:T']);
    } finally {
      cg.close();
    }
  });

  it('link nothing for a package outside the project, even when a project type shares the name', async () => {
    const cg = await indexed({
      'package.json': JSON.stringify({ name: 'app', dependencies: { lodash: '4.17.21' } }),
      'src/dict.ts': 'export interface Dictionary<T> { [k: string]: T }\n',
      'src/use.ts': [
        'export interface Holder {',
        '  d: import("lodash").Dictionary<number>;',
        '  split: import(',
        '    "lodash"',
        '  ).Dictionary<number>;',
        '  attrs: import("lodash", { with: { "resolution-mode": "import" } }).Dictionary<number>;',
        '  deep: import("lodash")',
        '    .Outer.Dictionary<number>;',
        '  noted: import("lodash")',
        '    // a note',
        '    .Dictionary<number>;',
        '  inline: import("lodash") /* c */ .Dictionary<number>;',
        '}',
        '',
      ].join('\n'),
    });
    try {
      expect(refs(cg, 'src/use.ts', 'd')).toEqual([]);
      expect(refs(cg, 'src/use.ts', 'split')).toEqual([]);
      expect(refs(cg, 'src/use.ts', 'attrs')).toEqual([]);
      for (const prop of ['deep', 'noted', 'inline']) expect(refs(cg, 'src/use.ts', prop), prop).toEqual([]);
    } finally {
      cg.close();
    }
  });

  it('index a function whose for-of head declares with using, and its calls', async () => {
    const cg = await indexed({
      'src/res.ts': 'export function open(): Disposable { return { [Symbol.dispose]() {} }; }\n',
      'src/use.ts': 'import { open } from "./res";\nexport function drain(rs: Disposable[]) {\n  for (using r of rs) { void r; }\n  using h = open();\n  return open();\n}\n',
    });
    try {
      const drain = cg.getNodesByKind('function').find((n) => n.name === 'drain' && n.filePath === 'src/use.ts');
      expect(drain).toBeDefined();
      const callees = cg.getCallees(drain!.id).filter((r) => r.edge.kind === 'calls').map((r) => `${r.node.filePath}:${r.node.name}`);
      expect([...new Set(callees)]).toEqual(['src/res.ts:open']);
    } finally {
      cg.close();
    }
  });
});
