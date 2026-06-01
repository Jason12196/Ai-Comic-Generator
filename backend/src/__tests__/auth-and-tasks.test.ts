import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { resetDatabaseForTests } from "../db/database.js";

let databasePath: string;

beforeEach(() => {
  databasePath = path.join(os.tmpdir(), `ai-comic-test-${Date.now()}-${Math.random()}.db`);
  process.env.DATABASE_PATH = databasePath;
  process.env.JWT_SECRET = "test-secret";
  resetDatabaseForTests();
});

afterEach(() => {
  resetDatabaseForTests();
  if (databasePath && fs.existsSync(databasePath)) {
    fs.rmSync(databasePath, { force: true });
  }
});

describe("auth and task routes", () => {
  it("registers, logs in, and persists tasks per user", async () => {
    const agent = request.agent(createApp());

    const registerResponse = await agent
      .post("/api/auth/register")
      .send({ username: "jason", password: "secret123" });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.username).toBe("jason");

    const taskPayload = {
      id: "task-1",
      title: "校园恋爱",
      createdAt: new Date().toISOString(),
      originalStory: "测试故事",
      pages: "5",
      ratio: "3:4",
      style: "auto",
      characters: [],
      selectedCharacters: [],
      executions: [],
      hasGeneratedOnce: false
    };

    const saveResponse = await agent.post("/api/tasks").send({ task: taskPayload });
    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.data.task.id).toBe("task-1");

    const listResponse = await agent.get("/api/tasks");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.tasks).toHaveLength(1);
    expect(listResponse.body.data.tasks[0].payload.originalStory).toBe("测试故事");
  });

  it("does not allow unauthenticated task access", async () => {
    const response = await request(createApp()).get("/api/tasks");
    expect(response.status).toBe(401);
  });

  it("keeps tasks isolated between users", async () => {
    const firstAgent = request.agent(createApp());
    const secondAgent = request.agent(createApp());

    await firstAgent.post("/api/auth/register").send({ username: "alice", password: "secret123" });
    await secondAgent.post("/api/auth/register").send({ username: "bob", password: "secret123" });

    await firstAgent.post("/api/tasks").send({
      task: {
        id: "alice-task",
        title: "Alice",
        createdAt: new Date().toISOString()
      }
    });

    const secondUserTasks = await secondAgent.get("/api/tasks");
    expect(secondUserTasks.status).toBe(200);
    expect(secondUserTasks.body.data.tasks).toHaveLength(0);
  });
});
