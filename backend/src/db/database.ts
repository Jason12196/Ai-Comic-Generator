import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

let database: Database.Database | null = null;
let currentPath: string | null = null;

function resolveDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH?.trim();
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.resolve(process.cwd(), "data", "app.db");
}

function ensureDatabaseDirectory(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runMigrations(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

export function getDatabase() {
  const dbPath = resolveDatabasePath();
  if (database && currentPath === dbPath) {
    return database;
  }

  if (database) {
    database.close();
  }

  ensureDatabaseDirectory(dbPath);
  database = new Database(dbPath);
  currentPath = dbPath;
  runMigrations(database);
  return database;
}

export function resetDatabaseForTests() {
  if (database) {
    database.close();
    database = null;
    currentPath = null;
  }
}
