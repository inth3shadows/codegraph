import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CommonJsValueGraph as ValueGraph, type CommonJsDeclaration, type CommonJsValue } from '../src/resolution/commonjs-value-graph';
const d = (name: string): CommonJsDeclaration => ({ name, line: 1, column: 0, kind: 'function' });
const id = (value: CommonJsValue): string | undefined => value.kind === 'identity' ? value.id : undefined;

const call = (g: ValueGraph, value: CommonJsValue) => g.answer(value).callable;
const target = (g: ValueGraph, value: CommonJsValue, selector: CommonJsDeclaration) => assert.deepEqual(call(g, value), { status: 'positive', selector, identity: id(value) });

for (const kind of ['object', 'function', 'class'] as const) {
  test(`F14: ${kind} retains its explicitly assigned callable property`, () => {
    const g = new ValueGraph();
    const api = g.allocate(kind, 'api', d('api'));
    const load = g.allocate('function', 'Store.load', d('Store::load'));
    g.write(api, 'load', load);
    g.bind('module.exports', api);
    target(g, g.read(g.get('module.exports'), 'load'), d('Store::load'));
  });
}

for (const value of [42, 'payload', undefined, null, false]) {
  test(`F15: exported data ${String(value)} has reference identity without callable identity`, () => {
    const g = new ValueGraph();
    g.bind('value', g.data(value), d('value'));
    const result = g.answer(g.get('value'));
    assert.equal(result.reference.status, 'positive');
    assert.deepEqual(result.reference.selector, d('value'));
    assert.deepEqual(result.callable, { status: 'non-callable' });
  });
}

test('F15: assigned callable reaches its body, not the storage variable', () => {
  const g = new ValueGraph();
  const real = g.allocate('function', 'real', d('real'));
  g.bind('value', g.data(undefined), d('value'));
  g.bind('value', real, d('value'));
  const result = g.answer(g.get('value'));
  assert.deepEqual(result.reference.selector, d('value'));
  assert.deepEqual(result.callable.selector, d('real'));
});

test('an alias shares the object; rebinding the alias leaves the original object intact', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api');
  const real = g.allocate('function', 'real', d('real'));
  g.bind('api', api); g.bind('alias', g.get('api'));
  g.write(g.get('alias'), 'load', real);
  target(g, g.read(g.get('api'), 'load'), d('real'));
  g.bind('alias', g.allocate('object', 'replacement'));
  assert.equal(g.answer(g.read(g.get('alias'), 'load')).callable.status, 'absent');
  target(g, g.read(g.get('api'), 'load'), d('real'));
});

test('property aliases retain the implementation selector', () => {
  const g = new ValueGraph();
  const first = g.allocate('object', 'first'), second = g.allocate('object', 'second');
  g.write(first, 'load', g.allocate('function', 'real', d('real')));
  g.write(second, 'load', g.read(first, 'load'));
  target(g, g.read(second, 'load'), d('real'));
});

test('a definite data overwrite removes the old callable', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api');
  g.write(api, 'load', g.allocate('function', 'real', d('real')));
  g.write(api, 'load', g.data(42));
  assert.equal(call(g, g.read(api, 'load')).status, 'non-callable');
});

test('post-export writes use the same object identity', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api'); g.bind('default', api);
  g.write(api, 'load', g.allocate('function', 'real', d('real')));
  target(g, g.read(g.get('default'), 'load'), d('real'));
});

test('class construction, ordinary calls, and instance identity stay distinct', () => {
  const g = new ValueGraph();
  const cls = g.allocate('class', 'Store', d('Store'));
  const instance = g.allocate('object', 'instance');
  assert.deepEqual(g.answer(cls).callable, { status: 'non-callable' });
  assert.deepEqual(g.answer(cls).constructible, { status: 'positive', selector: d('Store'), identity: id(cls) });
  assert.deepEqual(g.answer(instance).callable, { status: 'non-callable' });
  assert.deepEqual(g.answer(instance).constructible, { status: 'non-callable' });
});

test('instances observe their prototype property writes', () => {
  const g = new ValueGraph();
  const prototype = g.allocate('object', 'prototype');
  const instance = g.allocate('object', 'instance');
  g.setPrototype(instance, prototype);
  g.write(prototype, 'load', g.allocate('function', 'first', d('first')));
  target(g, g.read(instance, 'load'), d('first'));
  g.write(prototype, 'load', g.allocate('function', 'second', d('second')));
  target(g, g.read(instance, 'load'), d('second'));
});

test('an unsupported write invalidates only the affected slot', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api');
  const real = g.allocate('function', 'real', d('real'));
  g.write(api, 'load', real); g.write(api, 'save', real);
  g.write(api, 'load', g.unknown('unsupported mutation'));
  assert.equal(call(g, g.read(api, 'load')).status, 'unknown');
  target(g, g.read(api, 'save'), d('real'));
});

test('unknown dynamic writes remove stale callable/absence claims without affecting another object', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api'), other = g.allocate('object', 'other');
  const real = g.allocate('function', 'real', d('real'));
  g.write(api, 'load', real); g.write(other, 'load', real);
  g.invalidate(api, 'dynamic key');
  assert.equal(call(g, g.read(api, 'load')).status, 'unknown');
  assert.equal(g.answer(g.read(api, 'missing')).reference.status, 'unknown');
  target(g, g.read(other, 'load'), d('real'));
});

test('escape invalidates reachable property slots, including a prototype', () => {
  const g = new ValueGraph();
  const proto = g.allocate('object', 'proto'), api = g.allocate('object', 'api');
  g.setPrototype(api, proto);
  g.write(proto, 'load', g.allocate('function', 'real', d('real')));
  g.escape(api, 'opaque call');
  assert.equal(call(g, g.read(api, 'load')).status, 'unknown');
});

test('conflicting branch writes stay unknown; agreement preserves the callable', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api'); g.bind('api', api);
  const first = g.allocate('function', 'first', d('first'));
  const second = g.allocate('function', 'second', d('second'));
  const left = g.fork(), right = g.fork();
  left.write(api, 'load', first); right.write(api, 'load', second);
  const joined = ValueGraph.join(left, right);
  assert.equal(call(joined, joined.read(joined.get('api'), 'load')).status, 'unknown');
  right.write(api, 'load', first);
  const agreed = ValueGraph.join(left, right);
  target(agreed, agreed.read(agreed.get('api'), 'load'), d('first'));
});

test('a branch with a missing member does not prove callability', () => {
  const g = new ValueGraph(); const api = g.allocate('object', 'api'); g.bind('api', api);
  const left = g.fork(); left.write(api, 'load', g.allocate('function', 'real', d('real')));
  const joined = ValueGraph.join(left, g.fork());
  assert.equal(call(joined, joined.read(joined.get('api'), 'load')).status, 'unknown');
});

test('unknown branch alternatives cannot contribute a candidate', () => {
  const g = new ValueGraph();
  g.bind('value', g.allocate('function', 'real', d('real')));
  const other = g.fork(); other.bind('value', g.unknown('escape'));
  const joined = ValueGraph.join(g, other);
  assert.equal(call(joined, joined.get('value')).status, 'unknown');
});

test('a property write through an uncertain alias is weak for each possible receiver', () => {
  const g = new ValueGraph();
  const api = g.allocate('object', 'api'), other = g.allocate('object', 'other');
  const alias = g.union([api, other]);
  g.write(alias, 'load', g.allocate('function', 'real', d('real')));
  assert.equal(call(g, g.read(api, 'load')).status, 'unknown');
});

test('same display name in distinct declarations cannot prove one callable', () => {
  const g = new ValueGraph();
  const first = g.allocate('function', 'scope-one:real', d('real'));
  const second = g.allocate('function', 'scope-two:real', d('real'));
  assert.equal(call(g, g.union([first, second])).status, 'unknown');
});

test('known storage reference survives unknown runtime value without supplying callability', () => {
  const g = new ValueGraph();
  g.bind('scope:value', g.unknown('dynamic initializer'), d('value'));
  const result = g.answer(g.get('scope:value'));
  assert.equal(result.reference.status, 'positive');
  assert.equal(result.reference.identity, 'scope:value');
  assert.equal(result.callable.status, 'unknown');
  assert.equal(result.callable.selector, undefined);
});
