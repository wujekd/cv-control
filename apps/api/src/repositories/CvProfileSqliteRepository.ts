import type { CvProfile } from "@cv-control/shared";
import type { SqliteDatabase } from "../db/sqlite";

interface CvProfileRow {
  id: string;
  name: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export class CvProfileSqliteRepository {
  constructor(private readonly database: SqliteDatabase) {}

  get(): CvProfile | null {
    const row = this.database
      .prepare("SELECT id, name, data_json, created_at, updated_at FROM cv_profiles LIMIT 1")
      .get() as CvProfileRow | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.data_json) as CvProfile;
  }

  save(profile: CvProfile): void {
    const statement = this.database.prepare(`
      INSERT INTO cv_profiles (id, name, data_json, created_at, updated_at)
      VALUES (@id, @name, @data_json, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `);

    statement.run({
      id: profile.id,
      name: profile.name,
      data_json: JSON.stringify(profile),
      created_at: profile.metadata.createdAt,
      updated_at: profile.metadata.updatedAt
    });
  }
}

