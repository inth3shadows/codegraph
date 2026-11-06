/**
 * Initialize web-tree-sitter on CodeGraph's vendored runtime, the way
 * src/extraction/grammars.ts initGrammars() does, for scripts that cannot import it.
 *
 * npm's tree-sitter.wasm (0.25.10) loops forever in error recovery on some broken
 * input (tree-sitter/tree-sitter#5997); src/extraction/runtime/tree-sitter.wasm is the
 * same build with the fix. See docs/grammars/web-tree-sitter-runtime.md.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const RUNTIME_WASM_PATH = path.join(ROOT, 'src', 'extraction', 'runtime', 'tree-sitter.wasm');

/** `await Parser.init()` on the vendored runtime; throws if it is missing. */
export async function initVendoredRuntime(Parser) {
  if (!fs.existsSync(RUNTIME_WASM_PATH)) {
    throw new Error(`tree-sitter runtime missing: ${RUNTIME_WASM_PATH}`);
  }
  await Parser.init({
    locateFile: (file, scriptDirectory) => (file === 'tree-sitter.wasm' ? RUNTIME_WASM_PATH : scriptDirectory + file),
  });
}
