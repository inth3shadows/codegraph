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
  unknown: boolean;
  importShadows: Array<{ name: string; startLine: number; startColumn: number; endLine: number; endColumn: number }>;
}

let compiler: typeof TS | undefined;
// Loading the library/CLI for a read must not load the compiler.
function api(): typeof TS { return compiler ??= require('typescript') as typeof TS; }
const records = new WeakMap<ResolutionContext, Map<string, { source: string; record: CommonJsExportEvidence }>>();

export function clearCommonJsExportEvidence(context: ResolutionContext): void { records.delete(context); }

export function commonJsExportEvidence(file: string, context: ResolutionContext): CommonJsExportEvidence | undefined {
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
    commonJs: true, defaults: [], members: Object.create(null) as Record<string, Declaration[]>, forwards: [], unknown: false, importShadows: [],
  };
  const unwrap = (expression: TS.Expression): TS.Expression => {
    while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isNonNullExpression(expression)) expression = expression.expression;
    return expression;
  };
  const touchesWrapperExports = (body: TS.Node, b: { isBinding: (expression: TS.Expression, name: string) => boolean }): boolean => {
    let found = false;
    const scan = (child: TS.Node): void => {
      if (found) return;
      const propertyName = (ts.isPropertyAccessExpression(child.parent) && child.parent.name === child) ||
        ((ts.isPropertyAssignment(child.parent) || ts.isMethodDeclaration(child.parent)) && child.parent.name === child);
      if (!propertyName && ts.isIdentifier(child) && (b.isBinding(child, 'module') || b.isBinding(child, 'exports'))) { found = true; return; }
      ts.forEachChild(child, scan);
    };
    scan(body);
    return found;
  };
  const bind = (text: string) => {
    // A hashbang is legal only at offset 0, which the wrapper moves; blank it
    // in place so every later offset is unchanged (F18).
    text = text.replace(/^#![^\n]*/, line => ' '.repeat(line.length));
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
  if (bound.diagnostics.length || !bound.wrapper.body) {
    result.unknown = true;
    result.exported = result.graph.unknown('unparsed source');
    return result;
  }
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
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) graph.objects.get(owner.id)!.closed = false;
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
      value = graph.allocate('function', identity(selector), selector, true);
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
      return selector ? graph.allocate('function', identity(selector), selector, ts.isFunctionExpression(expression)) : graph.unknown('unindexed synthetic declaration');
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
          // `...require('./a')` still names a module the value may come from.
          if (ts.isSpreadAssignment(item)) valueOf(item.expression, b, map);
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
  const write = (left: TS.Expression, value: CommonJsValue, b: Bound, map: (offset: number) => number, weak: boolean): void => {
    left = unwrap(left);
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
        // `Object.freeze(api)` changes no member; `Object.assign(exports, …)`
        // writes members this analysis does not model, so ordinary matching may
        // still answer for them (FALLBACK_CAUSES).
        const builtin = ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Object' &&
          !b.symbol(callee.expression) ? callee.name.text : undefined;
        if (!(builtin && OBJECT_READS.has(builtin))) for (const argument of node.arguments)
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
        // An IIFE, UMD factory or callback that writes module/exports runs
        // code this walk does not enter; its writes are unknown, not absent (F19a).
        const closures = [callee, ...node.arguments.map(unwrap)].filter((fn): fn is TS.FunctionExpression | TS.ArrowFunction =>
          ts.isFunctionExpression(fn) || ts.isArrowFunction(fn));
        if (closures.some(fn => touchesWrapperExports(fn.body, b))) graph.invalidate(graph.read(module, 'exports'), 'unmodeled closure write');
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
  visit(bound.wrapper.body, bound, offset => offset);
  for (const pending of deferredEval) visit(pending.node, pending.b, pending.map);
  result.graph = graph; result.exported = graph.read(module, 'exports');
  result.forwards = [...new Set([...graph.objects.values()].flatMap(object => object.source ? [object.source] : []))];
  const reference = graph.answer(result.exported).reference;
  result.defaults = reference.status === 'positive' && reference.selector ? [reference.selector] : [];
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

/**
 * What an export answers for one intent. `blocked` is a complete negative
 * (absent, non-callable, or disagreeing positives) and licenses no other
 * target. `unknown` is the analyzer giving up; callers fall back to their
 * prior matching, limited to the module's evidence files.
 */
/**
 * Whether a fallback target found by ordinary matching may stand for an
 * unknown CommonJS answer: inside the module's evidence files, and code that
 * can run (or be constructed) rather than the storage holding it.
 */
export function commonJsFallbackAllows(target: Node | null | undefined, files: ReadonlySet<string>, kind: string): boolean {
  if (!target || !files.has(target.filePath)) return false;
  if (kind === 'calls') return target.kind === 'function' || target.kind === 'method';
  if (kind === 'instantiates') return target.kind === 'class' || target.kind === 'function';
  return true;
}

const OBJECT_READS = new Set(['freeze', 'seal', 'preventExtensions', 'isFrozen', 'isSealed', 'isExtensible', 'keys', 'values', 'entries', 'getOwnPropertyNames', 'getOwnPropertyDescriptor', 'getPrototypeOf']);
const OBJECT_WRITES = new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']);
/**
 * Unknowns from code this analysis does not model, as opposed to an opaque
 * call or dynamic write that may have changed a known value. Only these let
 * ordinary matching answer (inside the module's evidence files).
 */
const FALLBACK_CAUSES = new Set(['custom construction/inheritance outside contract', 'unmodeled builtin write', 'object spread',
  'unparsed source', 'unmodeled closure write']);
/** Sloppy-mode syntax the parser reports but parses intact: legacy octal literals and escapes. */
const SLOPPY_SYNTAX = new Set([1121, 1487]);

export type CommonJsExportDecision = { status: 'positive'; node: Node } | { status: 'blocked' } | { status: 'unknown' };

export function commonJsExportNode(file: string, member: string | null, context: ResolutionContext,
  intent: CommonJsIntent = 'reference'): Node | undefined {
  const decision = commonJsExportDecision(file, member, context, intent);
  return decision.status === 'positive' ? decision.node : undefined;
}

export function commonJsExportDecision(file: string, member: string | null, context: ResolutionContext,
  intent: CommonJsIntent = 'reference', seen = new Set<string>()): CommonJsExportDecision {
  const blocked: CommonJsExportDecision = { status: 'blocked' };
  const key = `${file}\0${member ?? ''}\0${intent}`;
  if (seen.has(key) || seen.size >= 8) return blocked;
  seen.add(key);
  const record = commonJsExportEvidence(file, context);
  if (!record?.commonJs) return blocked;
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
  const select = (candidate: CommonJsValue): CommonJsExportDecision => {
    if (candidate.kind === 'union') {
      const decisions = candidate.values.map(select);
      const first = decisions[0];
      return first?.status === 'positive' && decisions.every(d => d.status === 'positive' && d.node.id === first.node.id) ? first : blocked;
    }
    const source = candidate.kind === 'forward' ? candidate.source : candidate.kind === 'identity' ? record.graph.objects.get(candidate.id)?.source : undefined;
    if (source && !(intent === 'reference' && candidate.reference)) {
      const next = context.resolveModuleFile?.(source, file, 'javascript');
      const path = candidate.kind === 'forward' ? candidate.path.join('.') || null : null;
      return next ? commonJsExportDecision(next, path, context, intent, new Set(seen)) : blocked;
    }
    if (candidate.kind === 'unknown') return FALLBACK_CAUSES.has(candidate.cause ?? candidate.reason) ? { status: 'unknown' } : blocked;
    const decision = record.graph.answer(candidate)[intent];
    const node = decision.status === 'positive' && decision.selector ? indexed(decision.selector) : undefined;
    return node ? { status: 'positive', node } : blocked;
  };
  return select(value);
}
