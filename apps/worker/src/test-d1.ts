import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

export function createMockD1Database(): D1Database {
  const db = new DatabaseSync(':memory:');

  // Load and apply migrations
  const migrationPath = path.resolve(__dirname, '../migrations/0000_init.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(migrationSql);

  const mockD1: any = {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmtObj: any = {
        bind(...params: any[]) {
          boundParams = params.map((p) => (p === undefined ? null : p));
          return stmtObj;
        },
        async first<T = any>() {
          const stmt = db.prepare(query);
          const result = stmt.get(...boundParams) as T | undefined;
          return result || null;
        },
        async all<T = any>() {
          const stmt = db.prepare(query);
          const results = stmt.all(...boundParams) as T[];
          return { results };
        },
        async run() {
          const stmt = db.prepare(query);
          const result = stmt.run(...boundParams);
          return {
            success: true,
            meta: {
              changes: result.changes,
              last_row_id: Number(result.lastInsertRowid)
            }
          };
        }
      };
      return stmtObj;
    },
    async batch(statements: any[]) {
      db.exec('BEGIN TRANSACTION');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        db.exec('COMMIT');
        return results;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async exec(sql: string) {
      db.exec(sql);
      return { count: 1, duration: 0 };
    }
  };

  return mockD1 as D1Database;
}
