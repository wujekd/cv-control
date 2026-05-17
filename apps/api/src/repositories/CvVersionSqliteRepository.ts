import type { CvVersion } from "@cv-control/shared";
import type { SqliteDatabase } from "../db/sqlite";

interface CvVersionRow {
  id: string;
  profile_id: string;
  name: string;
  data_json: string;
}

export class CvVersionSqliteRepository {
  constructor(private readonly database: SqliteDatabase) {}

  listByProfile(profileId: string): CvVersion[] {
    const rows = this.database
      .prepare(
        "SELECT id, profile_id, name, data_json FROM cv_versions WHERE profile_id = ? ORDER BY updated_at DESC"
      )
      .all(profileId) as CvVersionRow[];

    return rows.map((row) => JSON.parse(row.data_json) as CvVersion);
  }

  get(versionId: string): CvVersion | null {
    const row = this.database
      .prepare("SELECT id, profile_id, name, data_json FROM cv_versions WHERE id = ?")
      .get(versionId) as CvVersionRow | undefined;

    return row ? (JSON.parse(row.data_json) as CvVersion) : null;
  }

  save(version: CvVersion): void {
    const statement = this.database.prepare(`
      INSERT INTO cv_versions (id, profile_id, name, data_json, created_at, updated_at)
      VALUES (@id, @profile_id, @name, @data_json, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `);

    statement.run({
      id: version.id,
      profile_id: version.profileId,
      name: version.name,
      data_json: JSON.stringify(version),
      created_at: version.createdAt,
      updated_at: version.updatedAt
    });
  }
}

