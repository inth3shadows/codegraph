import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DatabaseConnection } from '../src/db';
import { QueryBuilder } from '../src/db/queries';
import type { FileRecord } from '../src/types';

describe('stored CommonJS eval facts', () => {
  let root: string;
  let db: DatabaseConnection;
  let queries: QueryBuilder;
  const file = (contentHash: string, value?: boolean | null): FileRecord => ({
    path: 'm.js', contentHash, language: 'javascript', size: 1,
    modifiedAt: 1, indexedAt: 1, nodeCount: 0, commonJsEvalCall: value,
  });
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-eval-facts-'));
    db = DatabaseConnection.initialize(path.join(root, 'graph.db'));
    queries = new QueryBuilder(db.getDb());
  });
  afterEach(() => { db.close(); fs.rmSync(root, { recursive: true, force: true }); });

  it('does not prove absence from missing, malformed, or inconclusive facts', () => {
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(null);
    queries.upsertFile(file('v1', null));
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(null);
    queries.setMetadata('commonjs_eval:m.js', '{broken');
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(null);
  });

  it('requires an exact source hash and replaces the verdict on a new store', () => {
    queries.upsertFile(file('v1', false));
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(false);
    expect(queries.getCommonJsEvalCall('m.js', 'v2')).toBe(null);
    queries.upsertFile(file('v2', true));
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(null);
    expect(queries.getCommonJsEvalCall('m.js', 'v2')).toBe(true);
  });

  it('rolls back the fact with the surrounding file-store transaction', () => {
    queries.upsertFile(file('v1', false));
    expect(() => queries.runInTransaction(() => {
      queries.upsertFile(file('v2', true));
      throw new Error('store failed');
    })).toThrow('store failed');
    expect(queries.getFileByPath('m.js')!.contentHash).toBe('v1');
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(false);
  });

  it('removes facts with their file instead of leaking them to a replacement', () => {
    queries.upsertFile(file('v1', true));
    queries.deleteFile('m.js');
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(null);
    queries.upsertFile(file('v1'));
    expect(queries.getCommonJsEvalCall('m.js', 'v1')).toBe(null);
  });
});
