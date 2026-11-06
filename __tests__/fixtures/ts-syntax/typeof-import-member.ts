// `typeof import("x").member` in a type position. The current grammar parses it;
// SegaraRai/tree-sitter-typescript@82b3609 regresses it (VS Code uses it).
export type Mod = typeof import("./mod").default;
export type Fn = typeof import("./mod").helper;
