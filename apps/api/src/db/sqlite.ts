import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type SqliteDatabase = InstanceType<typeof Database>;

function resolveDatabasePath(databasePath?: string): string {
  if (databasePath) {
    return databasePath;
  }
  if (process.env.CV_CONTROL_DB_PATH) {
    return process.env.CV_CONTROL_DB_PATH;
  }
  return path.join(path.resolve(__dirname, "../../data"), "cv-control.sqlite");
}

export function openDatabase(databasePath?: string): SqliteDatabase {
  const resolvedPath = resolveDatabasePath(databasePath);
  if (resolvedPath !== ":memory:") {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }
  const database = new Database(resolvedPath);
  database.pragma("journal_mode = WAL");

  database.exec(`
    CREATE TABLE IF NOT EXISTS cv_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cv_versions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      version_id TEXT,
      status TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return database;
}
