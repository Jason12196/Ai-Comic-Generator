import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

describe("generate endpoints", () => {
  it("returns model registry for frontend dropdowns", async () => {
    const response = await request(createApp()).get("/api/models");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.textModels)).toBe(true);
    expect(Array.isArray(response.body.data.imageModels)).toBe(true);
    expect(response.body.data.textModels[0]).toHaveProperty("key");
    expect(response.body.data.imageModels[0]).toHaveProperty("displayName");
  });

  it("rejects unsupported panelCount", async () => {
    const response = await request(createApp()).post("/api/generate/comic").send({
      userPrompt: "A cat becomes a superhero in a cyberpunk city",
      style: "manga",
      panelCount: 3,
      aspectRatio: "1:1",
      language: "en"
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("creates a comic generation task", async () => {
    const response = await request(createApp()).post("/api/generate/comic").send({
      userPrompt: "A cat becomes a superhero in a cyberpunk city",
      style: "manga",
      panelCount: 4,
      aspectRatio: "1:1",
      language: "en",
      textModelKey: "openai.gpt-5.5",
      imageModelKey: "openai.gpt-image-2"
    });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.data.taskId).toMatch(/^task_/);
    expect(response.body.data.status).toBe("pending");
  });

  it("returns 404 for missing task", async () => {
    const response = await request(createApp()).get("/api/tasks/task_missing");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it("rejects unknown model keys", async () => {
    const response = await request(createApp()).post("/api/generate/comic").send({
      userPrompt: "A cat becomes a superhero in a cyberpunk city",
      style: "manga",
      panelCount: 4,
      aspectRatio: "1:1",
      language: "en",
      textModelKey: "invalid.text",
      imageModelKey: "invalid.image"
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
