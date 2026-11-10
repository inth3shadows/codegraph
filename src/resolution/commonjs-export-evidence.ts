import { createHash } from 'crypto';
import type * as TS from 'typescript';
import type { Node } from '../types';
import type { ResolutionContext } from './types';
import { CommonJsValueGraph, type CommonJsValue, type CommonJsValueResult, type CommonJsIntent, type CommonJsDeclaration } from './commonjs-value-graph';

type Declaration = CommonJsDeclaration;

/** Positive static relationships. Completeness never grants a candidate. */
export interface CommonJsExportEvidence {
  version: 2;
  sourceHash: string;
  commonJs: boolean;
  defaults: Declaration[];
  graph: CommonJsValueGraph;
  exported: CommonJsValue;
  members: Record<string, Declaration[]>;
  forwards: string[];
  /** Modules the whole exported value forwards into (`module.exports = require(…)`). */
  exportForwards: string[];
  unknown: boolean;
  /**
   * Why this file is outside the model, when it is. Such a record has
   * commonJs false, so every resolver takes its pre-model path for the file.
   */
  unmodeled?: string;
  importShadows: Array<{ name: string; startLine: number; startColumn: number; endLine: number; endColumn: number }>;
}

let compiler: typeof TS | undefined;
// Loading the library/CLI for a read must not load the compiler.
function api(): typeof TS { return compiler ??= require('typescript') as typeof TS; }
const records = new WeakMap<ResolutionContext, Map<string, { source: string; record: CommonJsExportEvidence }>>();

export function clearCommonJsExportEvidence(context: ResolutionContext): void { records.delete(context); }

export function commonJsExportEvidence(file: string, context: ResolutionContext): CommonJsExportEvidence | undefined {
  const record = commonJsExportEvidenceOf(file, context);
  return record && forwardsOutside(file, record, context);
}

const outsideCopies = new WeakMap<CommonJsExportEvidence, CommonJsExportEvidence>();
/**
 * A modelled file whose exports forward into a file outside the model (ESM,
 * unparsed, unmodelled) is outside it too: the model cannot answer for the
 * forwarded part, and the pre-model path can. Checked on every read, since it
 * depends on other files.
 */
function forwardsOutside(file: string, record: CommonJsExportEvidence, context: ResolutionContext, seen = new Set<string>()): CommonJsExportEvidence {
  if (!record.commonJs || !record.exportForwards.length) return record;
  seen.add(file);
  for (const source of record.exportForwards) {
    const next = context.resolveModuleFile?.(source, file, 'javascript');
    if (!next || seen.has(next) || seen.size >= 8) continue;
    const target = commonJsExportEvidenceOf(next, context);
    if (target && forwardsOutside(next, target, context, seen).commonJs) continue;
    if (!/\.[cm]?[jt]sx?$/.test(next) || /\.d\.[cm]?ts$/.test(next)) continue;
    let copy = outsideCopies.get(record);
    if (!copy) outsideCopies.set(record, copy = { ...record, commonJs: false, unmodeled: 'forward outside the model', unknown: true });
    return copy;
  }
  return record;
}

/** The cached record of one file, without the cross-file forward check. */
function commonJsExportEvidenceOf(file: string, context: ResolutionContext): CommonJsExportEvidence | undefined {
  if (!/\.[cm]?[jt]sx?$/.test(file) || /\.d\.[cm]?ts$/.test(file)) return undefined;
  const source = context.readFile(file);
  if (source === null) return undefined;
  let cache = records.get(context);
  if (!cache) records.set(context, cache = new Map());
  const previous = cache.get(file);
  if (previous?.source === source) return previous.record;
  const record = collectCommonJsExportEvidence(source, file);
  cache.set(file, { source, record });
  return record;
}

/** No AST/compiler objects escape into the record or its cache. */
export function collectCommonJsExportEvidence(source: string, file: string): CommonJsExportEvidence {
  const ts = api();
  const result: CommonJsExportEvidence = {
    version: 2, graph: new CommonJsValueGraph(), exported: { kind: 'unknown', reason: 'not analyzed' }, sourceHash: createHash('sha256').update(source).digest('hex'),
    commonJs: true, defaults: [], members: Object.create(null) as Record<string, Declaration[]>, forwards: [], exportForwards: [], unknown: false, importShadows: [],
  };
  const unwrap = (expression: TS.Expression): TS.Expression => {
    while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isNonNullExpression(expression)) expression = expression.expression;
    return expression;
  };
  const bind = (text: string) => {
    // A hashbang is legal only at offset 0, which the wrapper moves; blank it
    // in place (after any BOM) so every later offset is unchanged.
    text = text.replace(/^(\uFEFF?)#![^\n\r\u2028\u2029]*/, (line, bom: string) => bom + ' '.repeat(line.length - bom.length));
    const prefix = 'function __codegraph_cjs(exports, require, module, __filename, __dirname) {\n';
    const filename = `/${file}`;
    const tree = ts.createSourceFile(filename, `${prefix}${text}\n}`, ts.ScriptTarget.Latest, true,
      /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : /\.[cm]?ts$/.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    const host: TS.CompilerHost = {
      getSourceFile: name => name === filename ? tree : undefined,
      getDefaultLibFileName: () => '', writeFile: () => {}, getCurrentDirectory: () => '/', getDirectories: () => [],
      fileExists: name => name === filename, readFile: name => name === filename ? tree.text : undefined,
      getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true, getNewLine: () => '\n',
    };
    const program = ts.createProgram([filename], { allowJs: true, noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve }, host);
    const checker = program.getTypeChecker();
    const wrapper = tree.statements[0] as TS.FunctionDeclaration;
    const parameters = new Map(wrapper.parameters.map(p => [(p.name as TS.Identifier).text, checker.getSymbolAtLocation(p.name)]));
    const symbol = (identifier: TS.Identifier) => checker.resolveName(identifier.text, identifier, ts.SymbolFlags.Value, false);
    const isBinding = (expression: TS.Expression, name: string) => {
      expression = unwrap(expression);
      return ts.isIdentifier(expression) && symbol(expression) === parameters.get(name);
    };
    return { tree, wrapper, parameters, checker, symbol, isBinding, diagnostics: program.getSyntacticDiagnostics(tree).filter(diagnostic => !SLOPPY_SYNTAX.has(diagnostic.code) &&
      !(diagnostic.code >= 8002 && diagnostic.code <= 8017)), prefix: prefix.length };
  };
  type Bound = ReturnType<typeof bind>;
  const functionLike = (node: TS.Node): boolean => ts.isFunctionLike(node) || ts.isClassStaticBlockDeclaration(node) ||
    ts.isPropertyDeclaration(node);
  /**
   * Rule 1, an allowlist over uses of the CommonJS bindings (webpack/esbuild
   * bail out the same way): every reference to `module`, `exports`,
   * `module.exports` or a top-level alias of them must sit in a position this
   * analysis models. Any other use leaves the model, so a shape nobody listed
   * bails instead of reading as complete absence.
   */
  const bindingUses = (body: TS.Block, b: Bound): string | undefined => {
    const skip = (node: TS.Node): TS.Node => {
      let parent = node.parent;
      while (parent && (ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) || ts.isNonNullExpression(parent))) { node = parent; parent = node.parent; }
      return node;
    };
    // aliases: other names for the exports object; values: top-level values
    // written into it, whose members a nested function must not write either.
    const aliases = new Set<TS.Symbol>(), values = new Set<TS.Symbol>();
    const exportsObject = (expression: TS.Expression): boolean => {
      expression = unwrap(expression);
      if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) return exportsObject(expression.left) || exportsObject(expression.right);
      if (moduleExports(expression)) return true;
      if (!ts.isIdentifier(expression)) return false;
      const symbol = b.symbol(expression);
      return b.isBinding(expression, 'exports') || (symbol !== undefined && aliases.has(symbol));
    };
    function moduleExports(expression: TS.Expression): boolean {
      expression = unwrap(expression);
      const name = ts.isPropertyAccessExpression(expression) ? expression.name.text :
        ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(unwrap(expression.argumentExpression)) ? (unwrap(expression.argumentExpression) as TS.StringLiteralLike).text : undefined;
      return name === 'exports' && b.isBinding((expression as TS.PropertyAccessExpression).expression, 'module');
    }
    const rootOf = (expression: TS.Expression): TS.Expression => {
      expression = unwrap(expression);
      while (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
        if (moduleExports(expression)) return expression;
        expression = unwrap(expression.expression);
      }
      return expression;
    };
    let changed = true;
    const collect = (node: TS.Node): void => {
      if (functionLike(node)) return;
      const add = (set: Set<TS.Symbol>, name: TS.Node): void => {
        const symbol = ts.isIdentifier(name) ? b.symbol(name) : undefined;
        if (symbol && !set.has(symbol)) { set.add(symbol); changed = true; }
      };
      if (ts.isVariableDeclaration(node) && node.initializer && exportsObject(node.initializer)) add(aliases, node.name);
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isIdentifier(unwrap(node.left)) && exportsObject(node.right) && !exportsObject(node.left)) add(aliases, unwrap(node.left));
        const root = rootOf(node.left);
        if (exportsObject(root)) {
          const value = unwrap(node.right);
          if (ts.isIdentifier(value)) add(values, value);
          else if (ts.isObjectLiteralExpression(value)) for (const item of value.properties) {
            if (ts.isShorthandPropertyAssignment(item)) add(values, item.name);
            else if (ts.isPropertyAssignment(item) && ts.isIdentifier(unwrap(item.initializer))) add(values, unwrap(item.initializer));
          }
        }
      }
      ts.forEachChild(node, collect);
    };
    for (let round = 0; changed && round < 4; round++) { changed = false; collect(body); }
    const writeTarget = (node: TS.Node): boolean => {
      const parent = skip(node).parent;
      return (ts.isBinaryExpression(parent) && parent.left === skip(node) && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
          (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken));
    };
    /** Whether one use of the exports object `node` is modelled. */
    const allowed = (node: TS.Expression, nested: boolean): boolean => {
      const outer = skip(node), parent = outer.parent;
      // A member: reads anywhere; writes only where the walk sees them.
      if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === outer) {
        let member: TS.Node = parent;
        while ((ts.isPropertyAccessExpression(skip(member).parent) || ts.isElementAccessExpression(skip(member).parent)) &&
          (skip(member).parent as TS.PropertyAccessExpression).expression === skip(member)) member = skip(member).parent;
        if (ts.isDeleteExpression(skip(member).parent)) return false;
        return !(nested && writeTarget(member));
      }
      if (ts.isTypeOfExpression(parent)) return true;
      if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(parent.operatorToken.kind)) return true;
      if (nested) return false;
      // Top level: assignments, aliases, and call arguments (an opaque call
      // makes its arguments' members unknown, which the walk records).
      if (ts.isBinaryExpression(parent) && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) return true;
      if (ts.isVariableDeclaration(parent) && parent.initializer === outer) return true;
      if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.arguments?.includes(outer as TS.Expression)) return true;
      return ts.isExpressionStatement(parent);
    };
    let found: string | undefined;
    const fail = (reason: string): void => { found ??= reason; };
    const scan = (node: TS.Node, nested: boolean, thisBound: boolean): void => {
      if (found) return;
      // `this` at top level (or in a top-level arrow) is module.exports.
      if (!thisBound && node.kind === ts.SyntaxKind.ThisKeyword) return fail('top-level this');
      // A top-level return ends the module where the walk keeps going.
      if (!nested && ts.isReturnStatement(node)) return fail('top-level return');
      // A declaration's own name is not a use of what it is initialised to.
      const declared = (ts.isVariableDeclaration(node.parent) || ts.isParameter(node.parent) || ts.isBindingElement(node.parent) ||
        ts.isFunctionDeclaration(node.parent) || ts.isFunctionExpression(node.parent) || ts.isClassDeclaration(node.parent) ||
        ts.isClassExpression(node.parent)) && node.parent.name === node;
      if (ts.isIdentifier(node) && !declared && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
          !((ts.isPropertyAssignment(node.parent) || ts.isMethodDeclaration(node.parent) || ts.isPropertyDeclaration(node.parent)) && node.parent.name === node)) {
        const symbol = b.symbol(node);
        if (b.isBinding(node, 'module')) {
          const parent = skip(node).parent;
          if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === skip(node)) {
            if (moduleExports(parent)) { if (!allowed(parent, nested)) return fail('unmodeled use of module.exports'); }
            else if (ts.isDeleteExpression(skip(parent).parent)) return fail('unmodeled use of module');
          } else if (!ts.isTypeOfExpression(parent) && !(ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken,
            ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(parent.operatorToken.kind)) &&
            !(!nested && (ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.arguments?.includes(skip(node) as TS.Expression))) return fail('unmodeled use of module');
        } else if (b.isBinding(node, 'exports') || (symbol && aliases.has(symbol))) {
          if (!allowed(node, nested)) return fail('unmodeled use of exports');
        } else if (symbol && values.has(symbol) && nested) {
          // A member of an exported value written where the walk does not go.
          let member: TS.Node = skip(node);
          while ((ts.isPropertyAccessExpression(member.parent) || ts.isElementAccessExpression(member.parent)) &&
            (member.parent as TS.PropertyAccessExpression).expression === member) member = skip(member.parent);
          if (member !== skip(node) && (writeTarget(member) || ts.isDeleteExpression(member.parent))) return fail('unmodeled write to an exported value');
        }
      }
      ts.forEachChild(node, child => { scan(child, nested || functionLike(child), thisBound || (functionLike(child) && !ts.isArrowFunction(child))); });
    };
    scan(body, false, false);
    return found;
  };
  /** `Object.defineProperty(target, 'name', { value })` with a literal key and a plain data descriptor. */
  const dataDefinition = (node: TS.CallExpression): { target: TS.Expression; name: string; value: TS.Expression } | undefined => {
    const [target, key, descriptor] = node.arguments.map(unwrap);
    if (node.arguments.length !== 3 || !target || !key || !descriptor || !ts.isStringLiteralLike(key) ||
        key.text === '__proto__' || key.text === 'prototype' || !ts.isObjectLiteralExpression(descriptor)) return undefined;
    let value: TS.Expression | undefined;
    for (const item of descriptor.properties) {
      if (!ts.isPropertyAssignment(item) || !(ts.isIdentifier(item.name) || ts.isStringLiteralLike(item.name))) return undefined;
      if (item.name.text === 'value') value = item.initializer;
      else if (!['enumerable', 'writable', 'configurable'].includes(item.name.text)) return undefined;
    }
    return value ? { target, name: key.text, value } : undefined;
  };
  const bound = bind(source);
  const position = (offset: number) => {
    const before = source.slice(0, Math.max(0, offset));
    const line = before.split('\n').length;
    return { line, column: before.length - before.lastIndexOf('\n') - 1 };
  };
  // The consumer's receiver must refer to its import too. The same lexical
  // binding API distinguishes parameters/classes that shadow it at a call.
  const imports = new Map<string, TS.Symbol>();
  const remember = (name: TS.Identifier): void => {
    const symbol = bound.symbol(name);
    if (symbol) imports.set(name.text, symbol);
  };
  for (const statement of bound.wrapper.body?.statements ?? []) {
    if (ts.isImportDeclaration(statement) && statement.importClause) {
      const clause = statement.importClause;
      if (clause.name) remember(clause.name);
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) remember(clause.namedBindings.name);
        else for (const element of clause.namedBindings.elements) remember(element.name);
      }
    }
    if (ts.isImportEqualsDeclaration(statement)) remember(statement.name);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      const value = declaration.initializer && unwrap(declaration.initializer);
      if (value && ts.isCallExpression(value) && bound.isBinding(value.expression, 'require')) {
        const rememberPattern = (name: TS.BindingName): void => {
          if (ts.isIdentifier(name)) remember(name);
          else for (const element of name.elements) if (ts.isBindingElement(element)) rememberPattern(element.name);
        };
        rememberPattern(declaration.name);
      }
    }
  }
  const receivers = (node: TS.Node): void => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      let root = unwrap(node.expression);
      while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) root = unwrap(root.expression);
      if (ts.isIdentifier(root) && imports.has(root.text) && bound.symbol(root) !== imports.get(root.text)) {
        const start = position(root.getStart(bound.tree) - bound.prefix);
        const end = position(node.end - bound.prefix);
        result.importShadows.push({ name: root.text, startLine: start.line, startColumn: start.column, endLine: end.line, endColumn: end.column });
      }
    }
    ts.forEachChild(node, receivers);
  };
  if (bound.wrapper.body) receivers(bound.wrapper.body);
  if (bound.wrapper.body?.statements.some(statement => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) || (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)))) {
    result.commonJs = false;
    return result;
  }
  const unmodeled = (reason: string): CommonJsExportEvidence => {
    result.commonJs = false; result.unmodeled = reason; result.unknown = true;
    result.graph = new CommonJsValueGraph(); result.exported = { kind: 'unknown', reason };
    result.defaults = []; result.members = Object.create(null) as Record<string, Declaration[]>; result.forwards = []; result.exportForwards = [];
    return result;
  };
  if (bound.diagnostics.length || !bound.wrapper.body) return unmodeled('unparsed source');
  const uses = bindingUses(bound.wrapper.body, bound);
  if (uses) return unmodeled(uses);
  // Function declarations are hoisted: bind them before any branch forks the
  // graph, so one first read inside an `if` arm is not a one-armed binding.
  const hoist = (statement: TS.Statement): void => {
    if (ts.isFunctionDeclaration(statement) && statement.name) { const symbol = bound.symbol(statement.name); if (symbol) symbolValue(symbol, bound, offset => offset); }
  };
  let graph = result.graph;
  const module = graph.allocate('object', `${file}:module`);
  const namespace = graph.allocate('object', `${file}:namespace`);
  const cache = graph.allocate('object', `${file}:require-cache`);
  const requireValue = graph.allocate('function', `${file}:require`);
  graph.write(module, 'exports', namespace);
  graph.write(cache, file, module); graph.write(requireValue, 'cache', cache);
  for (const name of bound.parameters.keys()) graph.bind(`${file}:wrapper:${name}`,
    name === 'module' ? module : name === 'exports' ? namespace : name === 'require' ? requireValue :
      name === '__filename' ? graph.data(file) : graph.unknown('wrapper builtin'));
  const identity = (selector: Declaration) => `${file}:${selector.kind}:${selector.line}:${selector.column}`;
  const declaration = (node: TS.Declaration, b: Bound, map: (offset: number) => number): Declaration | undefined => {
    const named = 'name' in node ? node.name as TS.Node | undefined : undefined;
    const offset = map((named ?? node).getStart(b.tree) - b.prefix);
    if (offset < 0) return undefined;
    const kind: Declaration['kind'] = ts.isClassDeclaration(node) || ts.isClassExpression(node) ? 'class' :
      ts.isMethodDeclaration(node) || ts.isMethodSignature(node) ? 'method' :
        ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ? 'function' : 'value';
    return { name: named && ts.isIdentifier(named) ? named.text : undefined, ...position(offset), kind };
  };
  const binding = (symbol: TS.Symbol, b: Bound, map: (offset: number) => number): string => {
    for (const [name, parameter] of b.parameters) if (symbol === parameter) return `${file}:wrapper:${name}`;
    const node = symbol.declarations?.[0];
    const selector = node && declaration(node, b, map);
    return selector ? `${file}:binding:${selector.line}:${selector.column}` : `${file}:synthetic:${symbol.name}`;
  };
  const processed = new Set<string>();
  const emptyBodies = new Set<string>();
  /** A constructible function owns a prototype object, as a class does. */
  const constructorFunction = (fn: CommonJsValue, selector: Declaration, body: TS.Node | undefined): CommonJsValue => {
    if (fn.kind !== 'identity') return fn;
    if (body && ts.isBlock(body) && !body.statements.length) emptyBodies.add(fn.id);
    const object = graph.objects.get(fn.id)!;
    if (!object.properties.has('prototype')) graph.write(fn, 'prototype', graph.allocate('object', `${identity(selector)}:prototype`));
    return fn;
  };
  const unsupportedClasses = new Set<string>();
  const seeding = new Set<string>();
  const typeValue = (type: TS.Type, at: TS.Node, b: Bound, map: (offset: number) => number, id: string): CommonJsValue => {
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return graph.unknown('unresolved type');
    if (type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) {
      return graph.data(undefined, false);
    }
    for (const signature of type.getCallSignatures()) {
      const node = signature.getDeclaration();
      if (node && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) && node.body) {
        const selector = declaration(node, b, map);
        if (selector) return graph.allocate('function', identity(selector), selector, ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node));
      }
    }
    const value = graph.allocate('object', id);
    seedType(value, type, at, b, map);
    return value;
  };
  const seedType = (owner: CommonJsValue, type: TS.Type, _at: TS.Node, b: Bound, map: (offset: number) => number): void => {
    if (owner.kind !== 'identity' || seeding.has(owner.id)) return;
    seeding.add(owner.id);
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      const object = graph.objects.get(owner.id)!;
      object.closed = false; (object.openReasons ??= new Set()).add('unresolved type');
    }
    for (const property of type.getProperties()) {
      if (property.name === 'prototype' || property.name.startsWith('__@') || graph.objects.get(owner.id)!.properties.has(property.name)) continue;
      const values: CommonJsValue[] = [];
      for (const node of property.declarations ?? []) {
        if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
          if (node.initializer) values.push(valueOf(node.initializer, b, map));
        } else if (ts.isShorthandPropertyAssignment(node)) values.push(valueOf(node.name, b, map));
        else if (ts.isMethodDeclaration(node) && node.body) {
          const selector = declaration(node, b, map);
          if (selector) values.push(graph.allocate('function', identity(selector), selector));
        }
      }
      if (values.length) graph.write(owner, property.name, graph.union(values));
      else if (!property.declarations?.every(node => ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) graph.write(owner, property.name, graph.unknown('property value is not established'));
    }
  };
  const symbolValue = (symbol: TS.Symbol, b: Bound, map: (offset: number) => number): CommonJsValue => {
    const key = binding(symbol, b, map);
    if (graph.bindings.has(key)) return graph.get(key);
    if (seeding.has(key)) return graph.unknown('cyclic binding');
    seeding.add(key);
    const node = symbol.declarations?.[0];
    const selector = node && declaration(node, b, map);
    let value: CommonJsValue = graph.unknown('binding has no established value');
    if (node && selector && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node))) {
      value = constructorFunction(graph.allocate('function', identity(selector), selector, true), selector, node.body);
      graph.bind(key, value, selector);
      seedType(value, b.checker.getTypeOfSymbolAtLocation(symbol, node), node, b, map);
    } else if (node && selector && (ts.isClassDeclaration(node) || ts.isClassExpression(node))) {
      value = graph.allocate('class', identity(selector), selector);
      if (node.heritageClauses?.length || node.members.some(member => ts.isConstructorDeclaration(member))) unsupportedClasses.add(identity(selector));
      const prototype = graph.allocate('object', `${identity(selector)}:prototype`);
      graph.write(value, 'prototype', prototype); graph.bind(key, value, selector);
      seedType(value, b.checker.getTypeOfSymbolAtLocation(symbol, node), node, b, map);
      seedType(prototype, b.checker.getDeclaredTypeOfSymbol(symbol), node, b, map);
    } else if (node && ts.isVariableDeclaration(node)) value = node.initializer ? valueOf(node.initializer, b, map) : graph.data(undefined);
    else if (node && ts.isBindingElement(node)) value = typeValue(b.checker.getTypeAtLocation(node.name), node, b, map, `${key}:value`);
    graph.bind(key, value, selector);
    seeding.delete(key);
    return graph.get(key);
  };
  const property = (expression: TS.Expression, b: Bound, map: (offset: number) => number): { owner: CommonJsValue; name?: string } | undefined => {
    expression = unwrap(expression);
    if (ts.isPropertyAccessExpression(expression)) return { owner: valueOf(expression.expression, b, map), name: expression.name.text };
    if (ts.isElementAccessExpression(expression) && expression.argumentExpression) {
      const key = valueOf(expression.argumentExpression, b, map);
      return { owner: valueOf(expression.expression, b, map), name: key.kind === 'data' && key.known ? String(key.value) : undefined };
    }
    return undefined;
  };
  const valueOf = (raw: TS.Expression, b: Bound, map: (offset: number) => number): CommonJsValue => {
    const expression = unwrap(raw);
    if (ts.isIdentifier(expression)) {
      const symbol = b.symbol(expression);
      return symbol ? symbolValue(symbol, b, map) : expression.text === 'undefined' ? graph.data(undefined) : graph.unknown(expression.text === 'eval' ? 'intrinsic eval' : 'unbound identifier');
    }
    if (ts.isStringLiteralLike(expression)) return graph.data(expression.text);
    if (ts.isNumericLiteral(expression)) return graph.data(Number(expression.text));
    if (expression.kind === ts.SyntaxKind.NullKeyword) return graph.data(null);
    if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) return graph.data(expression.kind === ts.SyntaxKind.TrueKeyword);
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) return valueOf(expression.right, b, map);
    if (ts.isConditionalExpression(expression)) {
      const condition = truth(valueOf(expression.condition, b, map));
      return condition === undefined ? graph.union([valueOf(expression.whenTrue, b, map), valueOf(expression.whenFalse, b, map)]) : valueOf(condition ? expression.whenTrue : expression.whenFalse, b, map);
    }

    if (ts.isClassExpression(expression)) {
      // Same seeding as a class declaration: statics, prototype and the
      // construction contract, or `module.exports = class { static f() {} }`
      // reports f as absent.
      const selector = declaration(expression, b, map);
      if (!selector) return graph.unknown('unindexed synthetic declaration');
      const id = identity(selector);
      if (graph.objects.has(id)) return graph.allocate('class', id, selector);
      const value = graph.allocate('class', id, selector);
      if (expression.heritageClauses?.length || expression.members.some(member => ts.isConstructorDeclaration(member))) unsupportedClasses.add(id);
      const prototype = graph.allocate('object', `${id}:prototype`);
      graph.write(value, 'prototype', prototype);
      const type = b.checker.getTypeAtLocation(expression);
      seedType(value, type, expression, b, map);
      const symbol = type.getSymbol();
      if (symbol) seedType(prototype, b.checker.getDeclaredTypeOfSymbol(symbol), expression, b, map);
      return value;
    }
    if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
      const selector = declaration(expression, b, map);
      if (!selector) return graph.unknown('unindexed synthetic declaration');
      const fn = graph.allocate('function', identity(selector), selector, ts.isFunctionExpression(expression));
      return ts.isFunctionExpression(expression) ? constructorFunction(fn, selector, expression.body) : fn;
    }
    const member = property(expression, b, map);
    if (member) {
      const value = member.name === undefined ? graph.unknown('dynamic property') : graph.read(member.owner, member.name);
      return value.kind === 'absent' ? graph.data(undefined) : value;
    }
    if (ts.isObjectLiteralExpression(expression)) {
      const value = graph.allocate('object', `${file}:object:${map(expression.getStart(b.tree) - b.prefix)}`);
      for (const item of expression.properties) {
        if (ts.isPropertyAssignment(item)) {
          const name = ts.isIdentifier(item.name) || ts.isStringLiteralLike(item.name) ? item.name.text : undefined;
          if (name !== undefined) graph.write(value, name, valueOf(item.initializer, b, map)); else graph.invalidate(value, 'dynamic object property');
        } else if (ts.isShorthandPropertyAssignment(item)) graph.write(value, item.name.text, valueOf(item.name, b, map));
        else if (ts.isMethodDeclaration(item) && item.body) {
          const selector = declaration(item, b, map);
          if (selector?.name) graph.write(value, selector.name, graph.allocate('function', identity(selector), selector));
        } else {
          graph.invalidate(value, ts.isSpreadAssignment(item) ? 'object spread' : 'unmodeled object member');
        }
      }
      return value;
    }
    if (ts.isNewExpression(expression)) {
      const cls = valueOf(expression.expression, b, map);
      const value = graph.allocate('object', `${file}:instance:${map(expression.getStart(b.tree) - b.prefix)}`);
      if (cls.kind === 'identity' && graph.objects.get(cls.id)?.kind === 'class') {
        const selector = graph.objects.get(cls.id)?.selector;
        const unsupported = !selector || unsupportedClasses.has(cls.id);
        if (unsupported) return graph.unknown('custom construction/inheritance outside contract');
        graph.setPrototype(value, graph.read(cls, 'prototype'));
      } else if (cls.kind === 'identity' && graph.objects.get(cls.id)?.kind === 'function' && graph.objects.get(cls.id)?.constructible) {
        // `new Foo()` on a constructor function: Foo.prototype's members,
        // plus whatever its body writes to `this`, which the walk does not see.
        graph.setPrototype(value, graph.read(cls, 'prototype'));
        if (!emptyBodies.has(cls.id)) graph.invalidate(value, 'constructor function body');
      }
      else seedType(value, b.checker.getTypeAtLocation(expression), expression, b, map);
      return value;
    }
    if (ts.isCallExpression(expression) && b.isBinding(expression.expression, 'require') && expression.arguments.length === 1 && ts.isStringLiteralLike(unwrap(expression.arguments[0]!))) {
      const source = (unwrap(expression.arguments[0]!) as TS.StringLiteralLike).text;
      return graph.allocate('module', `${file}:forward:${source}`, undefined, false, source);
    }
    return typeValue(b.checker.getTypeAtLocation(expression), expression, b, map, `${file}:typed:${map(expression.getStart(b.tree) - b.prefix)}`);
  };
  const truth = (value: CommonJsValue): boolean | undefined => value.kind === 'identity' ? true : value.kind === 'data' && value.known ? Boolean(value.value) : undefined;
  const bindPattern = (name: TS.BindingName, value: CommonJsValue, b: Bound, map: (offset: number) => number): void => {
    if (ts.isIdentifier(name)) {
      const symbol = b.symbol(name); const node = symbol?.declarations?.[0];
      if (symbol) graph.bind(binding(symbol, b, map), value, node && declaration(node, b, map));
    } else for (const element of name.elements) if (ts.isBindingElement(element)) {
      const key = element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)) ? element.propertyName.text : ts.isIdentifier(element.name) ? element.name.text : undefined;
      bindPattern(element.name, key === undefined ? graph.unknown('binding pattern') : graph.read(value, key), b, map);
    }
  };
  const write = (left: TS.Expression, value: CommonJsValue, b: Bound, map: (offset: number) => number, weak: boolean, name?: string): void => {
    left = unwrap(left);
    if (name !== undefined) {
      const owner = valueOf(left, b, map);
      graph.write(owner, name, weak ? graph.union([graph.read(owner, name), value]) : value);
      return;
    }
    if (ts.isIdentifier(left)) {
      const symbol = b.symbol(left); if (!symbol) return;
      const key = binding(symbol, b, map), prior = graph.get(key);
      const node = symbol.declarations?.[0]; graph.bind(key, weak ? graph.union([prior, value]) : value, node && declaration(node, b, map));
    } else {
      const member = property(left, b, map); if (!member) return;
      if (member.name === undefined || member.name === '__proto__') graph.invalidate(member.owner, 'dynamic property write');
      else if (member.name === 'prototype' && member.owner.kind === 'identity' && graph.objects.get(member.owner.id)?.kind === 'class') graph.write(member.owner, member.name, graph.unknown('class prototype descriptor'));
      else graph.write(member.owner, member.name, weak ? graph.union([graph.read(member.owner, member.name), value]) : value);
    }
  };
  const deferredEval: Array<{ node: TS.CallExpression; b: Bound; map: (offset: number) => number }> = [];
  const evalCalls = (node: TS.Node, b: Bound, map: (offset: number) => number): void => {
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (ts.isIdentifier(callee) && callee.text === 'eval' && !b.symbol(callee) && !node.questionDotToken) deferredEval.push({ node, b, map });
    }
    ts.forEachChild(node, child => { evalCalls(child, b, map); });
  };
  const visit = (node: TS.Node, b: Bound, map: (offset: number) => number, inEval = false, weak = false): void => {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
      if (ts.isFunctionDeclaration(node) && node.name) { const symbol = b.symbol(node.name); if (symbol) symbolValue(symbol, b, map); }
      if (!inEval && node.body) evalCalls(node.body, b, map);
      return;
    }
    if (ts.isIfStatement(node)) {
      visit(node.expression, b, map, inEval, weak);
      const condition = truth(valueOf(node.expression, b, map));
      if (condition !== undefined) { const arm = condition ? node.thenStatement : node.elseStatement; if (arm) visit(arm, b, map, inEval, weak); return; }
      const before = graph.fork(); visit(node.thenStatement, b, map, inEval, weak); const then = graph;
      graph = before; if (node.elseStatement) visit(node.elseStatement, b, map, inEval, weak);
      graph = CommonJsValueGraph.join(then, graph); return;
    }
    // Logical assignments evaluate their RHS only in the replacing arm.
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken].includes(node.operatorToken.kind)) {
      visit(node.left, b, map, inEval, weak);
      const before = valueOf(node.left, b, map), condition = truth(before);
      const replace = node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ? condition :
        node.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken ? condition === undefined ? undefined : !condition :
          before.kind === 'data' && before.known ? before.value == null : before.kind === 'identity' ? false : undefined;
      if (replace === false) return;
      const prior = replace === undefined ? graph.fork() : undefined;
      visit(node.right, b, map, inEval, weak);
      write(node.left, valueOf(node.right, b, map), b, map, weak);
      if (prior) graph = CommonJsValueGraph.join(prior, graph);
      return;
    }
    ts.forEachChild(node, child => { visit(child, b, map, inEval, weak); });
    if (ts.isVariableDeclaration(node)) bindPattern(node.name, node.initializer ? valueOf(node.initializer, b, map) : graph.data(undefined), b, map);
    if (ts.isClassDeclaration(node) && node.name) { const symbol = b.symbol(node.name); if (symbol) symbolValue(symbol, b, map); }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const operator = node.operatorToken.kind;
      if (operator === ts.SyntaxKind.EqualsToken) write(node.left, valueOf(node.right, b, map), b, map, weak);
      else write(node.left, graph.unknown('compound assignment'), b, map, weak);
    }
    if (ts.isCallExpression(node) && !inEval) {
      const callee = unwrap(node.expression);
      const intrinsicEval = ts.isIdentifier(callee) && callee.text === 'eval' && !b.symbol(callee);
      if (!(intrinsicEval && !node.questionDotToken) && !b.isBinding(callee, 'require')) {
        const builtin = ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Object' &&
          !b.symbol(callee.expression) ? callee.name.text : undefined;
        const definition = builtin === 'defineProperty' ? dataDefinition(node) : undefined;
        // `Object.freeze(api)` changes no member. A literal-key data
        // descriptor (the `__esModule` marker) is one ordinary write.
        if (definition) write(definition.target, valueOf(definition.value, b, map), b, map, weak, definition.name);
        if (!definition && !(builtin && OBJECT_READS.has(builtin))) for (const argument of node.arguments)
          graph.escape(valueOf(argument, b, map), builtin && OBJECT_WRITES.has(builtin) ? 'unmodeled builtin write' : 'opaque call argument');
        const receiver = property(callee, b, map);
        if (receiver) graph.escape(receiver.owner, 'opaque method receiver');
        let localHarmless = false, capturesExports = false;
        if (ts.isIdentifier(callee)) {
          const declaration = b.symbol(callee)?.valueDeclaration;
          if (declaration && ts.isFunctionDeclaration(declaration) && declaration.body) {
            localHarmless = true;
            const effects = (child: TS.Node): void => {
              if (ts.isCallExpression(child)) localHarmless = false;
              const propertyName = (ts.isPropertyAccessExpression(child.parent) && child.parent.name === child) ||
                ((ts.isPropertyAssignment(child.parent) || ts.isMethodDeclaration(child.parent)) && child.parent.name === child);
              if (!propertyName && ts.isIdentifier(child) && (b.isBinding(child, 'module') || b.isBinding(child, 'exports'))) {
                localHarmless = false; capturesExports = true;
              }
              ts.forEachChild(child, effects);
            };
            effects(declaration.body);
          }
        }
        const calleeValue = valueOf(callee, b, map);
        if (capturesExports || (calleeValue.kind === 'unknown' && calleeValue.reason === 'intrinsic eval') || intrinsicEval || (!localHarmless && node.arguments.some(argument => ts.isIdentifier(unwrap(argument)) && (unwrap(argument) as TS.Identifier).text === 'eval'))) {
          graph.invalidate(graph.read(module, 'exports'), 'indirect eval effects');
        }
      }
      if (ts.isIdentifier(callee) && callee.text === 'eval' && !b.symbol(callee) && !node.questionDotToken) {
        const marker = `${map(node.getStart(b.tree) - b.prefix)}`;
        if (processed.has(marker)) return; processed.add(marker);
        const argument = node.arguments[0] && unwrap(node.arguments[0]);
        if (!argument || !ts.isStringLiteralLike(argument)) { graph.invalidate(graph.read(module, 'exports'), 'dynamic eval'); result.unknown = true; return; }
        const from = map(node.getStart(b.tree) - b.prefix), to = map(node.end - b.prefix);
        const replacement = `(()=>{${argument.text}\n})()`;
        const expanded = bind(source.slice(0, from) + replacement + source.slice(to));
        if (expanded.diagnostics.length) { result.unknown = true; return; }
        const remap = (offset: number): number => offset < from ? offset : offset >= from + replacement.length ? offset - replacement.length + to - from : -1;
        const payload = (candidate: TS.Node): void => {
          if (ts.isArrowFunction(candidate) && candidate.getStart(expanded.tree) - expanded.prefix === from + 1) { visit(candidate.body, expanded, remap, true, weak); return; }
          ts.forEachChild(candidate, payload);
        };
        payload(expanded.wrapper.body!);
      }
    }
  };
  for (const statement of bound.wrapper.body.statements) hoist(statement);
  visit(bound.wrapper.body, bound, offset => offset);
  for (const pending of deferredEval) visit(pending.node, pending.b, pending.map);
  const exportedValue = graph.read(module, 'exports');
  // A default import of an `__esModule` module means exports.default, which
  // the import paths do not read (F21).
  const marker = graph.read(exportedValue, '__esModule');
  if (marker.kind === 'data' && marker.value === true && graph.read(exportedValue, 'default').kind !== 'absent') return unmodeled('ES module interop default');
  // Rule 2: the answer is complete or the file leaves the model. Any unknown
  // reachable from the exports, other than the opaque escapes the model is
  // ruled to block on, means a member the model cannot answer for.
  const incomplete = (value: CommonJsValue, depth = 0, seen = new Set<string>()): string | undefined => {
    if (depth > 8) return undefined;
    if (value.kind === 'union') { for (const alternative of value.values) { const reason = incomplete(alternative, depth, seen); if (reason) return reason; } return undefined; }
    if (value.kind === 'unknown') return BLOCKING_UNKNOWNS.has(value.reason) ? undefined : value.reason;
    if (value.kind !== 'identity' || seen.has(value.id)) return undefined;
    seen.add(value.id);
    const object = graph.objects.get(value.id)!;
    for (const reason of object.openReasons ?? []) if (!BLOCKING_UNKNOWNS.has(reason)) return reason;
    for (const [name, child] of object.properties) { if (name === 'prototype' && object.kind !== 'object') continue; const reason = incomplete(child, depth + 1, seen); if (reason) return reason; }
    return object.prototype ? incomplete(object.prototype, depth + 1, seen) : undefined;
  };
  const gap = incomplete(exportedValue);
  if (gap) return unmodeled(`incomplete: ${gap}`);
  result.graph = graph; result.exported = graph.read(module, 'exports');
  result.forwards = [...new Set([...graph.objects.values()].flatMap(object => object.source ? [object.source] : []))];
  const reference = graph.answer(result.exported).reference;
  result.defaults = reference.status === 'positive' && reference.selector ? [reference.selector] : [];
  const exportForwards = new Set<string>();
  const paths = (value: CommonJsValue, prefix = '', depth = 0, seen = new Set<string>()): void => {
    if (value.kind === 'union') { for (const alternative of value.values) paths(alternative, prefix, depth, new Set(seen)); return; }
    if (value.kind !== 'identity' || seen.has(value.id) || depth > 3) return;
    seen.add(value.id); const object = graph.objects.get(value.id)!;
    if (object.prototype) paths(object.prototype, prefix, depth, new Set(seen));
    for (const name of object.properties.keys()) {
      if (name === 'prototype') continue;
      const item = graph.read(value, name), decision = graph.answer(item).reference;
      if (decision.status === 'positive' && decision.selector) result.members[prefix + name] = [decision.selector];
      paths(item, `${prefix}${name}.`, depth + 1, new Set(seen));
    }
  };
  paths(result.exported);
  // Only a whole-export forward: a member forwarded into an unmodelled file
  // (express's `exports.application`) answers blocked for that member alone.
  for (const value of result.exported.kind === 'union' ? result.exported.values : [result.exported]) {
    const source = value.kind === 'forward' && !value.path.length ? value.source : value.kind === 'identity' ? graph.objects.get(value.id)?.source : undefined;
    if (source) exportForwards.add(source);
  }
  result.exportForwards = [...exportForwards];
  return result;
}

export function commonJsEvidenceFiles(file: string, context: ResolutionContext, seen = new Set<string>()): Set<string> {
  if (seen.has(file) || seen.size >= 8) return seen;
  seen.add(file);
  for (const source of commonJsExportEvidence(file, context)?.forwards ?? []) {
    const next = context.resolveModuleFile?.(source, file, 'javascript');
    if (next) commonJsEvidenceFiles(next, context, seen);
  }
  return seen;
}

export function commonJsImportShadowed(file: string, receiver: string, line: number, column: number, context: ResolutionContext): boolean {
  return commonJsExportEvidence(file, context)?.importShadows.some(site => site.name === receiver &&
    site.startLine <= line && site.endLine >= line &&
    (site.startLine !== line || site.startColumn <= column) && (site.endLine !== line || site.endColumn >= column)) ?? false;
}

/** Consumers select a capability, never a declaration-list fallback. */
export function commonJsExportResult(record: CommonJsExportEvidence, member: string | null): CommonJsValueResult {
  let value = record.exported;
  for (const name of member?.split('.') ?? []) value = record.graph.read(value, name);
  return record.graph.answer(value);
}

const OBJECT_READS = new Set(['freeze', 'seal', 'preventExtensions', 'isFrozen', 'isSealed', 'isExtensible', 'keys', 'values', 'entries',
  'getOwnPropertyNames', 'getOwnPropertyDescriptor', 'getPrototypeOf']);
const OBJECT_WRITES = new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']);
/** Unknowns the model answers as blocked (F17 ruling: an opaque escape or dynamic write on a known value; F12/F13: eval). */
const BLOCKING_UNKNOWNS = new Set(['opaque call argument', 'opaque method receiver', 'dynamic property write', 'dynamic object property',
  'dynamic eval', 'indirect eval effects']);
/** Sloppy-mode syntax the parser reports but parses intact: legacy octal literals, escapes and leading-zero decimals. */
const SLOPPY_SYNTAX = new Set([1121, 1487, 1488, 1489]);

/**
 * Resolves a member that a modelled file forwards into a file outside the
 * model, by that file's pre-model export lookup.
 */
export type CommonJsOutsideLookup = (file: string, member: string | null, intent: CommonJsIntent) => Node | undefined;

export function commonJsExportNode(file: string, member: string | null, context: ResolutionContext,
  intent: CommonJsIntent = 'reference', seen = new Set<string>(), outside?: CommonJsOutsideLookup): Node | undefined {
  const key = `${file}\0${member ?? ''}\0${intent}`;
  if (seen.has(key) || seen.size >= 8) return undefined;
  seen.add(key);
  const record = commonJsExportEvidence(file, context);
  if (!record?.commonJs) return undefined;
  let value = record.exported;
  for (const name of member?.split('.') ?? []) value = record.graph.read(value, name);
  const indexed = (declaration: Declaration): Node | undefined => {
    const candidates = declaration.name ? context.getNodesInFileNamed?.(file, declaration.name) ?? context.getNodesInFile(file).filter(n => n.name === declaration.name) : context.getNodesInFile(file);
    const matches = candidates.filter(n => n.startLine <= declaration.line && n.endLine >= declaration.line &&
      (n.startLine !== declaration.line || n.startColumn <= declaration.column) &&
      (n.endLine !== declaration.line || n.endColumn >= declaration.column) &&
      (declaration.kind === 'value' ? ['constant', 'variable', 'property', 'field'].includes(n.kind) :
        declaration.kind === 'method' || declaration.kind === 'function' ? n.kind === 'method' || n.kind === 'function' : n.kind === declaration.kind));
    matches.sort((a, b) => (a.endLine - a.startLine) - (b.endLine - b.startLine) || b.startColumn - a.startColumn);
    return matches[0];
  };
  const select = (candidate: CommonJsValue): Node | undefined => {
    if (candidate.kind === 'union') {
      const nodes = candidate.values.map(select);
      return nodes.length && nodes.every(node => node && node.id === nodes[0]?.id) ? nodes[0] : undefined;
    }
    const source = candidate.kind === 'forward' ? candidate.source : candidate.kind === 'identity' ? record.graph.objects.get(candidate.id)?.source : undefined;
    if (source && !(intent === 'reference' && candidate.reference)) {
      const next = context.resolveModuleFile?.(source, file, 'javascript');
      const path = candidate.kind === 'forward' ? candidate.path.join('.') || null : null;
      if (!next) return undefined;
      // A forward into a file outside the model answers as that file does
      // without the model (R14-6), not as a blocked member.
      if (!commonJsExportEvidence(next, context)?.commonJs) return path?.includes('.') ? undefined : outside?.(next, path, intent);
      return commonJsExportNode(next, path, context, intent, new Set(seen), outside);
    }
    const decision = record.graph.answer(candidate)[intent];
    return decision.status === 'positive' && decision.selector ? indexed(decision.selector) : undefined;
  };
  return select(value);
}
