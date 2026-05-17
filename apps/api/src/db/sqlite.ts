import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type SqliteDatabase = InstanceType<typeof Database>;

export function openDatabase(): SqliteDatabase {
  const dataDir = path.resolve(__dirname, "../../data");
  fs.mkdirSync(dataDir, { recursive: true });
  const databasePath = path.join(dataDir, "cv-control.sqlite");
  const database = new Database(databasePath);
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
  `);

  return database;
}
