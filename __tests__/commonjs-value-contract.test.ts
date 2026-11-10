import { expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { collectCommonJsExportEvidence as collect, commonJsExportResult as answer } from '../src/resolution/commonjs-export-evidence';
import { commonJsValueCases as cases } from './fixtures/commonjs-value-cases';

for (const [label, source, status, selector, execute = true] of cases) {
  it(label, () => {
    if (execute) {
      const module = { exports: {} as { load?: () => number } };
      runInNewContext(source, { module, exports: module.exports });
      expect(typeof module.exports.load === 'function').toBe(status === 'positive');
      if (status === 'positive') expect(module.exports.load!()).toBe(42);
    }
    const result = answer(collect(source, 'm.js'), 'load');
    expect(result.callable.status).toBe(status);
    expect(result.callable.status === 'positive' ? result.callable.selector?.name : undefined).toBe(selector?.split('::').pop()?.split(':').pop());
  });
}

it('data reference ownership stays independent of callability', () => {
  const result = answer(collect('const value=42;exports.load=value;', 'm.js'), 'load');
  expect(result.reference).toMatchObject({ status: 'positive', selector: { name: 'value', kind: 'value' } });
  expect(result.callable.status).toBe('non-callable');
});

it('class construction is distinct from ordinary calls and instances', () => {
  const cls = answer(collect('class Store{};module.exports=Store;', 'm.js'), null);
  expect(cls.constructible).toMatchObject({ status: 'positive', selector: { name: 'Store', kind: 'class' } });
  expect(cls.callable.status).toBe('non-callable');
  const instance = answer(collect('class Store{};module.exports=new Store();', 'm.js'), null);
  expect(instance.callable.status).toBe('non-callable');
  expect(instance.constructible.status).toBe('non-callable');
});

it.each([
  'class Store { constructor(){return {};} load(){return 42;} } module.exports=new Store();',
  'class Base { load(){return 42;} } class Store extends Base {} module.exports=new Store();',
  'class Store { load(){return 42;} } class Other { load(){return 99;} } Store.prototype={load:Other.prototype.load};module.exports=new Store();',
])('unsupported construction supplies no guessed callable: %s', source => {
  expect(answer(collect(source, 'm.js'), 'load').callable.status).toBe('unknown');
});

it('eval-local data cannot invent an indexed reference selector', () => {
  const result = answer(collect("eval('var data=42;exports.load=data;');", 'm.js'), 'load');
  expect(result.reference.status === 'positive' ? result.reference.selector : undefined).toBeUndefined();
  expect(result.callable.status).toBe('non-callable');
});

it.each([
  'class Factory{};if(false)Factory.load=Store.prototype.load;module.exports=Factory;',
  'function Factory(){};if(false)Factory.load=Store.prototype.load;module.exports=Factory;',
  'module.exports={};module.exports ||= (exports.load=Store.prototype.load);',
])('does not infer a write from an unexecuted arm: %s', assignment => {
  const source = `class Store{load(){return 42;}}${assignment}`;
  const module = { exports: {} as { load?: unknown } };
  runInNewContext(source, { module, exports: module.exports });
  expect(module.exports.load).toBeUndefined();
  expect(answer(collect(source, 'm.js'), 'load').callable.status).toBe('absent');
});

it.each([
  "const indirect=eval;indirect('exports.load=Store.prototype.load;');",
  "eval?.('exports.load=Store.prototype.load;');",
  "function invoke(fn){fn('exports.load=Store.prototype.load;');}invoke(eval);",
])('indirect eval supplies no wrapper-scoped target: %s', expression => {
  const result = answer(collect(`class Store{load(){}}${expression}`, 'm.js'), 'load');
  expect(result.callable.status).toBe('unknown');
});

it('an eval-local class has no indexed constructor selector', () => {
  expect(answer(collect("eval('class Made{};module.exports=Made;');", 'm.js'), null).constructible.status).toBe('unknown');
});

it('a conditional value needs agreement on the callable identity', () => {
  const source = 'function one(){}function two(){}exports.load=flag?one:two;';
  expect(answer(collect(source, 'm.js'), 'load').callable.status).toBe('unknown');
});
