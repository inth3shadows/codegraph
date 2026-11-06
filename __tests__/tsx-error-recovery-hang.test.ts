/**
 * tree-sitter's error recovery before 0.27.1 never finishes on some broken
 * input (tree-sitter/tree-sitter#5997; tree-sitter-typescript upstream #323):
 * a TSX file holding `<a {{b:>c:d(e f)` timed out the parse worker three
 * times (3 x 30s) and was then dropped from the index. The grammar is not at
 * fault, so this pins the runtime: each input must give a tree, errors and
 * all, well inside the budget. web-tree-sitter 0.25.10's own tree-sitter.wasm
 * fails it; the vendored src/extraction/runtime/tree-sitter.wasm (0.25.10 +
 * tree-sitter/tree-sitter#5997) passes. See docs/grammars/web-tree-sitter-runtime.md.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initGrammars, loadGrammarsForLanguages, getParser, RUNTIME_WASM_PATH } from '../src/extraction/grammars';
import { parseWithinBudget } from '../src/extraction/parse-budget';

// The vendored runtime wasm is paired with web-tree-sitter's JS glue: both must be 0.25.10.
const VENDORED_RUNTIME_VERSION = '0.25.10';

beforeAll(async () => {
  await initGrammars();
  await loadGrammarsForLanguages(['typescript', 'tsx']);
});

const HANG_INPUTS = [
  '<a {{b:>c:d(e f)\n',
  '<div style={{ textAlign:>Note: This is important. (And this)</div>\n',
];

describe('vendored tree-sitter runtime', () => {
  it('is in place and matches the installed web-tree-sitter glue', () => {
    expect(fs.existsSync(RUNTIME_WASM_PATH)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'web-tree-sitter', 'package.json'), 'utf8'));
    expect(
      pkg.version,
      'web-tree-sitter changed: rebuild src/extraction/runtime/tree-sitter.wasm for it (docs/grammars/web-tree-sitter-runtime.md)',
    ).toBe(VENDORED_RUNTIME_VERSION);
  });
});

describe('error recovery finishes on input that once looped forever', () => {
  it.each(['tsx', 'typescript'] as const)('%s', (language) => {
    for (const src of HANG_INPUTS) {
      const started = Date.now();
      const tree = parseWithinBudget(getParser(language)!, src, 2000);
      expect(tree, `${language}: ${JSON.stringify(src)} did not finish within 2000ms`).not.toBeNull();
      expect(tree!.rootNode.hasError).toBe(true);
      expect(Date.now() - started).toBeLessThan(2000);
      tree!.delete();
    }
  });
});
