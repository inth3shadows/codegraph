import jsTokens from 'js-tokens';
import { stripCommentsForRegex } from './strip-comments';

/**
 * The module a whole-file CommonJS forwarder (`module.exports =
 * require('./m')`, optionally after `'use strict'`) hands on, or null when
 * the file holds anything else. Comments are blanked first: a license header
 * or trailing note is not code.
 */
export function readCommonJsForwarder(code: string, typescript: boolean): string | null {
  // Blanking comments never creates these, so a file without both is no forwarder.
  if (!code.includes('require(') || !code.includes('exports')) return null;
  const text = stripCommentsForRegex(code, typescript ? 'typescript' : 'javascript');
  return /^\s*(?:['"]use strict['"];\s*)?(?:exports\s*=\s*)?module\.exports\s*=\s*(?:exports\s*=\s*)?require\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*$/
    .exec(text)?.[1] ?? null;
}

interface LexicalToken { type: string; value: string; closed?: boolean }
interface Property { name: string | null; next: number }

const TRIVIA = new Set(['WhiteSpace', 'LineTerminatorSequence', 'SingleLineComment', 'MultiLineComment', 'HashbangComment']);
const EXPRESSION_PREFIX_WORDS = new Set(['return', 'throw', 'case', 'delete', 'void', 'typeof', 'new', 'in', 'instanceof', 'else', 'do', 'await', 'yield']);

/** Does the token stream end with a JSX element or fragment still open? */
function unclosedJsx(tokens: readonly LexicalToken[]): boolean {
  let depth = 0;
  const punct = (t: LexicalToken | undefined, value: string): boolean => t?.type === 'JSXPunctuator' && t.value === value;
  for (let i = 0; i < tokens.length; i++) {
    if (punct(tokens[i], '<')) depth += punct(tokens[i + 1], '/') ? -1 : 1;
    // `/>` ends a self-closing element; the `/` of `</` is the closing tag above.
    else if (punct(tokens[i], '/') && punct(tokens[i + 1], '>') && !punct(tokens[i - 1], '<')) depth--;
  }
  return depth > 0;
}

/**
 * Syntactic CommonJS writes, without interpreting their values or executing code.
 *
 * JSX mode reads `<T>(x) =>` (a Flow or TS generic) as an element, so what
 * follows, a `module.exports =` included, can become its text. A file that
 * ends with an element still open was not read as code; neither was one where
 * a `</div>` in a later comment or string closes that element. So a file with
 * any JSX is read in plain mode too: what either read finds uncertain is
 * uncertain, and a member either read sees is a member. Both directions only
 * hand the file back to the resolution it had without this reader.
 */
export function readCommonJsExportMembers(source: string, jsx = false): { members: ReadonlySet<string>; uncertain: boolean } {
  const tokens: LexicalToken[] = [...jsTokens(source, { jsx })].filter((t) => !TRIVIA.has(t.type));
  if (!jsx || !tokens.some((t) => t.type.startsWith('JSX'))) return readTokens(tokens);
  const jsxRead = readTokens(tokens);
  const plainRead = readCommonJsExportMembers(source, false);
  return {
    members: new Set([...jsxRead.members, ...plainRead.members]),
    uncertain: jsxRead.uncertain || plainRead.uncertain || unclosedJsx(tokens),
  };
}

function readTokens(tokens: readonly LexicalToken[]): { members: ReadonlySet<string>; uncertain: boolean } {
  const members = new Set<string>();
  let uncertain = false;
  const moduleApi = (token: LexicalToken | undefined): boolean => token?.type === 'StringLiteral' &&
    (token.value.slice(1, -1) === 'module' || token.value.slice(1, -1) === 'node:module');

  const literalEvalCall = (at: number): boolean => {
    let before = at - 1;
    let after = at + 1;
    // Parentheses around the bare callee preserve direct eval semantics.
    while (tokens[before]?.value === '(' && tokens[after]?.value === ')') {
      before--;
      after++;
    }
    const prefix = tokens[before];
    // wrap(eval)(code) passes eval as an argument; its parentheses do not
    // group the callee. The same applies after a member access or call.
    if (after > at + 1 && prefix && (
      (prefix.type === 'IdentifierName' && !EXPRESSION_PREFIX_WORDS.has(prefix.value)) ||
      prefix.type.endsWith('Literal') || prefix.type === 'NoSubstitutionTemplate' || prefix.type === 'TemplateTail' ||
      [')', ']', '?.', '++', '--'].includes(prefix.value)
    )) return false;
    if (tokens[after]?.value !== '(') return false;
    let argument = after + 1;
    while (tokens[argument]?.value === '(') argument++;
    const type = tokens[argument]?.type;
    return type === 'StringLiteral' || type === 'NoSubstitutionTemplate' || type === 'TemplateHead';
  };

  const property = (at: number): Property | null => {
    const key = tokens[at + 1];
    if (tokens[at]?.value === '.' && key?.type === 'IdentifierName') {
      return { name: key.value.includes('\\') ? null : key.value, next: at + 2 };
    }
    if (tokens[at]?.value !== '[') return null;
    if (key?.type === 'StringLiteral' && key.closed && tokens[at + 2]?.value === ']') {
      const name = key.value.slice(1, -1);
      return { name: name.includes('\\') ? null : name, next: at + 3 };
    }
    return { name: null, next: at + 1 };
  };

  for (let at = 0; at < tokens.length; at++) {
    const root = tokens[at];
    if (root?.type !== 'IdentifierName') continue;
    // obj.exports and obj.module.exports are not the CommonJS bindings.
    if (tokens[at - 1]?.value === '.' || tokens[at - 1]?.value === '?.') continue;
    if (tokens[at - 1]?.value === 'typeof') continue;
    // Literal eval code and Node's module/cache APIs can supply exports
    // without an assignment to the ordinary CommonJS bindings in this file.
    if ((root.value === 'eval' && literalEvalCall(at)) ||
        (root.value === 'require' && (property(at + 1)?.name === 'cache' ||
          (tokens[at + 1]?.value === '(' && moduleApi(tokens[at + 2])))) ||
        (root.value === 'from' && moduleApi(tokens[at + 1])) ||
        (root.value === 'import' && (moduleApi(tokens[at + 1]) ||
          (tokens[at + 1]?.value === '(' && moduleApi(tokens[at + 2]))))) {
      uncertain = true;
      continue;
    }
    if (root.value !== 'exports' && root.value !== 'module') continue;
    let next = at + 1;
    if (root.value === 'module') {
      const exported = property(next);
      if (exported?.name !== 'exports') { uncertain = true; continue; }
      next = exported.next;
    }
    const member = property(next);
    // Escaping the object, replacing its default, or mutating its prototype
    // supplies an API whose absent members cannot be established here.
    if (!member || member.name === null || member.name === '__proto__') {
      uncertain = true;
      continue;
    }
    if (tokens[member.next]?.value === '=') members.add(member.name);
  }
  return { members, uncertain };
}
