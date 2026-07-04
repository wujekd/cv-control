import type { JobApplication } from "@cv-control/shared";
import type { SqliteDatabase } from "../db/sqlite";

interface JobApplicationRow {
  id: string;
  version_id: string | null;
  status: string;
  data_json: string;
}

export class JobApplicationSqliteRepository {
  constructor(private readonly database: SqliteDatabase) {}

  list(): JobApplication[] {
    const rows = this.database
      .prepare(
        "SELECT id, version_id, status, data_json FROM job_applications ORDER BY updated_at DESC"
      )
      .all() as JobApplicationRow[];

    return rows.map((row) => JSON.parse(row.data_json) as JobApplication);
  }

  get(applicationId: string): JobApplication | null {
    const row = this.database
      .prepare("SELECT id, version_id, status, data_json FROM job_applications WHERE id = ?")
      .get(applicationId) as JobApplicationRow | undefined;

    return row ? (JSON.parse(row.data_json) as JobApplication) : null;
  }

  listByVersion(versionId: string): JobApplication[] {
    const rows = this.database
      .prepare(
        "SELECT id, version_id, status, data_json FROM job_applications WHERE version_id = ?"
      )
      .all(versionId) as JobApplicationRow[];

    return rows.map((row) => JSON.parse(row.data_json) as JobApplication);
  }

  save(application: JobApplication): void {
    const statement = this.database.prepare(`
      INSERT INTO job_applications (id, version_id, status, data_json, created_at, updated_at)
      VALUES (@id, @version_id, @status, @data_json, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        version_id = excluded.version_id,
        status = excluded.status,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `);

    statement.run({
      id: application.id,
      version_id: application.versionId,
      status: application.status,
      data_json: JSON.stringify(application),
      created_at: application.createdAt,
      updated_at: application.updatedAt
    });
  }

  delete(applicationId: string): boolean {
    const result = this.database
      .prepare("DELETE FROM job_applications WHERE id = ?")
      .run(applicationId);
    return result.changes > 0;
  }

  clearVersionLink(versionId: string): void {
    const linked = this.listByVersion(versionId);
    for (const application of linked) {
      this.save({ ...application, versionId: null, updatedAt: new Date().toISOString() });
    }
  }
}
