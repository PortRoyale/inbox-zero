import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import { config } from "@/server/config";
import { migrations } from "@/server/migrations";

// Embedded SQLite (Node's built-in node:sqlite). All queries use bound parameters; no string-built SQL.
type Row = Record<string, SQLInputValue>;
type Params = Record<string, SQLInputValue | boolean | undefined>;

const g = globalThis as unknown as { __rlSqlite?: DatabaseSync; __rlStmts?: Map<string, StatementSync> };

export function database(): DatabaseSync {
  if (g.__rlSqlite) return g.__rlSqlite;
  const dir = config().dataDir;
  const file = process.env.READYLINE_DB === ":memory:" ? ":memory:" : path.join(dir, "readyline.db");
  if (file !== ":memory:") fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file, { enableForeignKeyConstraints: true });
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON;");
  migrate(db);
  g.__rlSqlite = db;
  g.__rlStmts = new Map();
  return db;
}

function stmt(sql: string) {
  const db = database();
  let s = g.__rlStmts!.get(sql);
  if (!s) {
    s = db.prepare(sql);
    g.__rlStmts!.set(sql, s);
  }
  return s;
}

function bind(params: Params = {}) {
  const out: Record<string, SQLInputValue> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    out[k] = typeof v === "boolean" ? (v ? 1 : 0) : v;
  }
  return out;
}

export function all<T = Row>(sql: string, params?: Params): T[] {
  return stmt(sql).all(bind(params)) as T[];
}

export function get<T = Row>(sql: string, params?: Params): T | undefined {
  return stmt(sql).get(bind(params)) as T | undefined;
}

export function run(sql: string, params?: Params) {
  return stmt(sql).run(bind(params));
}

export function tx<T>(fn: () => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function migrate(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const applied = new Set((db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]).map((r) => r.version));
  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(m.version, Date.now());
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

export function closeDatabaseForTests() {
  g.__rlSqlite?.close();
  g.__rlSqlite = undefined;
  g.__rlStmts = undefined;
}

export const now = () => Date.now();
export const newId = () => crypto.randomUUID();
