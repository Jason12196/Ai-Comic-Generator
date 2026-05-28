import { beforeEach, describe, expect, it } from "vitest";

import { TaskQueueService } from "../services/taskQueue.service.js";

describe("TaskQueueService", () => {
  let service: TaskQueueService;

  beforeEach(() => {
    service = new TaskQueueService();
  });

  it("creates a pending task", () => {
    const task = service.createTask({
      userPrompt: "A cat becomes a hero",
      style: "manga",
      panelCount: 4,
      aspectRatio: "1:1",
      language: "en"
    });

    expect(task.status).toBe("pending");
    expect(task.progress).toBe(0);
    expect(task.id).toMatch(/^task_/);
  });

  it("updates task progress and status", () => {
    const task = service.createTask({
      userPrompt: "A cat becomes a hero",
      style: "manga",
      panelCount: 4,
      aspectRatio: "1:1",
      language: "en"
    });

    service.updateTask(task.id, {
      status: "processing",
      progress: 30
    });

    expect(service.getTask(task.id)?.status).toBe("processing");
    expect(service.getTask(task.id)?.progress).toBe(30);
  });

  it("returns undefined for unknown tasks", () => {
    expect(service.getTask("task_missing")).toBeUndefined();
  });
});
