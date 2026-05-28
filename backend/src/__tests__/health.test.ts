import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("returns backend health status", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("AI Comic Generator backend is running");
    expect(response.body.timestamp).toBeTypeOf("string");
  });
});
