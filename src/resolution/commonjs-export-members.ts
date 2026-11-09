import jsTokens from 'js-tokens';

interface LexicalToken { type: string; value: string; closed?: boolean }
interface Property { name: string | null; next: number }

const TRIVIA = new Set(['WhiteSpace', 'LineTerminatorSequence', 'SingleLineComment', 'MultiLineComment', 'HashbangComment']);

/** Syntactic CommonJS writes, without interpreting their values or executing code. */
export function readCommonJsExportMembers(source: string, jsx = false): { members: ReadonlySet<string>; uncertain: boolean } {
  const tokens: LexicalToken[] = [...jsTokens(source, { jsx })].filter((t) => !TRIVIA.has(t.type));
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
