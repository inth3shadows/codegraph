// Reserved words as export aliases (ES2015 IdentifierName). The current grammar parses
// these; SegaraRai/tree-sitter-typescript@82b3609 regresses them (Effect, Zod use them).
const a = 1;
const b = 2;
export { a as null, b as void };
export { a as delete, b as function };
