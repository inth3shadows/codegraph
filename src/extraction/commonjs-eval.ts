import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Language } from '../types';
import { getParser } from './grammars';

export function isCommonJsEvalLanguage(language: Language): boolean {
  return language === 'javascript' || language === 'jsx' || language === 'typescript' || language === 'tsx';
}

/** Native/deferred extraction has no reusable WASM tree. Parse only relevant files. */
export function commonJsEvalCallFromSource(source: string, language: Language): boolean | null | undefined {
  if (!isCommonJsEvalLanguage(language) || !source.includes('eval')) return undefined;
  const tree = getParser(language)?.parse(source);
  if (!tree) return null;
  try { return hasCommonJsEvalCall(tree.rootNode); }
  finally { tree.delete(); }
}

/**
 * Whether a file contains a syntactic direct eval call. Null means that parse
 * errors prevented proving its absence. This reads the existing tree only.
 */
export function hasCommonJsEvalCall(root: SyntaxNode): boolean | null {
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.type === 'call_expression') {
      let callee = node.childForFieldName('function');
      while (callee?.type === 'parenthesized_expression' && callee.namedChildCount === 1) {
        callee = callee.namedChild(0);
      }
      if (callee?.type === 'identifier' && callee.text === 'eval' && !isNonGeneratorYieldArgument(node)) {
        return true;
      }
    }
    for (const child of node.namedChildren) pending.push(child);
  }
  return root.hasError ? null : false;
}

/**
 * The JS grammar accepts yield expressions outside generators. In CommonJS,
 * yield can instead be a wrapper's identifier: yield(eval)(code). Its operand
 * looks like an eval call in that tree, but eval was only passed as a value.
 * A nested real call, yield(eval(code)), is not the direct yield operand and
 * remains a call. Function ancestry distinguishes this from generator yield.
 */
function isNonGeneratorYieldArgument(call: SyntaxNode): boolean {
  if (call.parent?.type !== 'yield_expression') return false;
  for (let scope = call.parent.parent; scope; scope = scope.parent) {
    if (scope.type === 'generator_function' || scope.type === 'generator_function_declaration') return false;
    if (scope.type === 'method_definition') {
      // Computed keys and decorators run outside the method's function scope.
      const regions = [scope.childForFieldName('body'), scope.childForFieldName('parameters')];
      if (!regions.some((region) => region && region.startIndex <= call.startIndex && call.endIndex <= region.endIndex)) continue;
      return !scope.children.some((child) => child.type === '*');
    }
    if (scope.type === 'function_expression' || scope.type === 'function_declaration' || scope.type === 'arrow_function') return true;
  }
  return true;
}
