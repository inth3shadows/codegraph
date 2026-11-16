/**
 * Two reaches the shell has that a file alone does not show: a library function
 * calling a sibling library that the entry script sources (every script that
 * sources the library must agree), and a Bats `load` inside a `.bash` helper,
 * which Bats reads against the directory of the test that loaded the helper.
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

let dir: string | undefined;
let cg: CodeGraph | undefined;

afterEach(() => {
  cg?.destroy();
  cg = undefined;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

async function index(files: Record<string, string>): Promise<CodeGraph> {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-bash-scope-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, { mode: 0o755 });
  }
  cg = await CodeGraph.init(dir, { index: true });
  return cg;
}

/** Every bash `calls` / `imports` edge as `from-file:from-name -> to-file:to-name (kind)`. */
function edges(graph: CodeGraph, kind: 'calls' | 'imports'): string[] {
  const out: string[] = [];
  for (const file of graph.getFiles()) {
    for (const n of graph.getNodesInFile(file.path)) {
      for (const e of graph.getOutgoingEdgesFrom([n.id], [kind] as any)) {
        const t = graph.getNode(e.target);
        if (t?.language === 'bash') out.push(`${n.filePath}:${n.name} -> ${t.filePath}:${t.name} (${t.kind})`);
      }
    }
  }
  return out.sort();
}

const S = (rel: string) => `source "$(dirname "$0")/${rel}"\n`;

describe('Bash sibling libraries', () => {
  it('links a library function to a sibling library its entry script sources', async () => {
    const graph = await index({
      'bin/main.sh': '#!/bin/bash\n' + S('../lib/a.sh') + S('../lib/b.sh') + 'run_a\n',
      'lib/a.sh': 'run_a() { helper_b; }\n',
      'lib/b.sh': 'helper_b() { echo b; }\n',
    });
    expect(edges(graph, 'calls')).toContain('lib/a.sh:run_a -> lib/b.sh:helper_b (function)');
  });

  it('agrees across entry scripts that source the same sibling', async () => {
    const graph = await index({
      'bin/one.sh': '#!/bin/bash\n' + S('../lib/a.sh') + S('../lib/b.sh') + 'run_a\n',
      'bin/two.sh': '#!/bin/bash\n' + S('../lib/b.sh') + S('../lib/a.sh') + 'run_a\n',
      'bin/three.sh': '#!/bin/bash\n' + S('../lib/a.sh') + 'run_a\n',
      'lib/a.sh': 'run_a() { helper_b; }\n',
      'lib/b.sh': 'helper_b() { echo b; }\n',
    });
    expect(edges(graph, 'calls')).toContain('lib/a.sh:run_a -> lib/b.sh:helper_b (function)');
  });

  it('links nothing when entry scripts disagree on the sibling', async () => {
    const graph = await index({
      'bin/one.sh': '#!/bin/bash\n' + S('../lib/a.sh') + S('../lib/b.sh') + 'run_a\n',
      'bin/two.sh': '#!/bin/bash\n' + S('../lib/a.sh') + S('../lib/c.sh') + 'run_a\n',
      'lib/a.sh': 'run_a() { helper; }\n',
      'lib/b.sh': 'helper() { echo b; }\n',
      'lib/c.sh': 'helper() { echo c; }\n',
    });
    expect(edges(graph, 'calls').filter((e) => e.startsWith('lib/a.sh'))).toEqual([]);
  });

  it('leaves a top-level call in the library alone: it runs before the sibling is read', async () => {
    const graph = await index({
      'bin/main.sh': '#!/bin/bash\n' + S('../lib/a.sh') + S('../lib/b.sh'),
      'lib/a.sh': 'helper_b\n',
      'lib/b.sh': 'helper_b() { echo b; }\n',
    });
    expect(edges(graph, 'calls').filter((e) => e.startsWith('lib/a.sh'))).toEqual([]);
  });

  it('keeps the library\'s own definition over a sibling\'s', async () => {
    const graph = await index({
      'bin/main.sh': '#!/bin/bash\n' + S('../lib/a.sh') + S('../lib/b.sh') + 'run_a\n',
      'lib/a.sh': 'helper() { echo a; }\nrun_a() { helper; }\n',
      'lib/b.sh': 'helper() { echo b; }\n',
    });
    expect(edges(graph, 'calls').filter((e) => e.startsWith('lib/a.sh'))).toEqual(['lib/a.sh:run_a -> lib/a.sh:helper (function)']);
  });
});

describe('Bats load inside a .bash helper', () => {
  it('reads the helper\'s load against the loading test\'s directory', async () => {
    const graph = await index({
      'test/main.bats': 'load test_helper/common\n@test "x" {\n  check_it\n}\n',
      'test/test_helper/common.bash': 'load test_helper/assert\ncheck_it() { assert_ok; }\n',
      'test/test_helper/assert.bash': 'assert_ok() { :; }\n',
      // The same path read against the helper's own directory: never chosen.
      'test/test_helper/test_helper/assert.bash': 'assert_ok() { :; }\n',
    });
    expect(edges(graph, 'calls')).toContain('test/test_helper/common.bash:check_it -> test/test_helper/assert.bash:assert_ok (function)');
    expect(edges(graph, 'calls').join('\n')).not.toContain('test/test_helper/test_helper/');
  });

  it('reads $BATS_TEST_DIRNAME in a helper as the test\'s directory', async () => {
    const graph = await index({
      'test/main.bats': 'load "$BATS_TEST_DIRNAME/helpers/common"\n@test "x" {\n  check_it\n}\n',
      'test/helpers/common.bash': 'load "${BATS_TEST_DIRNAME}/libs/assert"\ncheck_it() { assert_ok; }\n',
      'test/libs/assert.bash': 'assert_ok() { :; }\n',
    });
    expect(edges(graph, 'calls')).toContain('test/helpers/common.bash:check_it -> test/libs/assert.bash:assert_ok (function)');
  });

  it('links nothing when two tests in different directories read the load differently', async () => {
    const graph = await index({
      'a/t.bats': 'load ../shared/common\n@test "x" {\n  check_it\n}\n',
      'b/t.bats': 'load ../shared/common\n@test "y" {\n  check_it\n}\n',
      'shared/common.bash': 'load assert\ncheck_it() { assert_ok; }\n',
      'a/assert.bash': 'assert_ok() { :; }\n',
      'b/assert.bash': 'assert_ok() { :; }\n',
    });
    expect(edges(graph, 'calls').filter((e) => e.startsWith('shared/'))).toEqual([]);
  });

  it('keeps a library\'s own load function: no import, the call still links', async () => {
    const graph = await index({
      'test/main.bats': 'load lib\n@test "x" {\n  go\n}\n',
      'test/lib.bash': 'load() { echo own; }\ngo() { load assert; }\n',
      'test/assert.bash': 'assert_ok() { :; }\n',
    });
    expect(edges(graph, 'calls')).toContain('test/lib.bash:go -> test/lib.bash:load (function)');
    expect(edges(graph, 'imports').filter((e) => e.startsWith('test/lib.bash'))).toEqual([]);
  });

  it('does not treat load as Bats in a .bash file no test loads', async () => {
    const graph = await index({
      'lib/x.bash': 'load assert\nrun() { assert_ok; }\n',
      'lib/assert.bash': 'assert_ok() { :; }\n',
    });
    expect(edges(graph, 'calls').filter((e) => e.startsWith('lib/x.bash'))).toEqual([]);
    expect(edges(graph, 'imports').filter((e) => e.startsWith('lib/x.bash'))).toEqual([]);
  });
});
