import { getDatabase } from "../db/database.js";
import type { TaskRecord } from "../types/index.js";

type TaskRow = {
  id: string;
  title: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

function sanitizeTaskPayload(payload: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: JSON.parse(row.payload_json)
  };
}

export const taskService = {
  listTasksForUser(userId: number) {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT id, title, payload_json, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY datetime(updated_at) DESC")
      .all(userId) as TaskRow[];

    return rows.map(mapTask);
  },

  upsertTask(userId: number, taskPayload: Record<string, unknown>) {
    const db = getDatabase();
    const id = String(taskPayload.id || "").trim();
    if (!id) {
      throw new Error("Task id is required");
    }

    const createdAt = String(taskPayload.createdAt || new Date().toISOString());
    const updatedAt = new Date().toISOString();
    const title = String(taskPayload.title || "Draft Task");
    const payload = sanitizeTaskPayload({
      ...taskPayload,
      id,
      title,
      createdAt
    });

    db.prepare(`
      INSERT INTO tasks (id, user_id, title, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, user_id) DO UPDATE SET
        title = excluded.title,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `).run(id, userId, title, JSON.stringify(payload), createdAt, updatedAt);

    const row = db
      .prepare("SELECT id, title, payload_json, created_at, updated_at FROM tasks WHERE id = ? AND user_id = ?")
      .get(id, userId) as TaskRow;

    return mapTask(row);
  },

  deleteTask(userId: number, taskId: string) {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(taskId, userId);
    return result.changes > 0;
  },

  deleteAllTasksForUser(userId: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(userId);
  }
};
