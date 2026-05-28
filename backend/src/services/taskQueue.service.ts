import type { ComicTask, GenerateComicRequest, TaskUpdate } from "../types/index.js";

function nowIso() {
  return new Date().toISOString();
}

function createTaskId() {
  return `task_${Math.random().toString(36).slice(2, 10)}`;
}

export class TaskQueueService {
  private readonly tasks = new Map<string, ComicTask>();

  createTask(request: GenerateComicRequest): ComicTask {
    const task: ComicTask = {
      id: createTaskId(),
      status: "pending",
      progress: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      request,
      panels: []
    };

    this.tasks.set(task.id, task);
    return task;
  }

  getTask(taskId: string): ComicTask | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, update: TaskUpdate): ComicTask | undefined {
    const existing = this.tasks.get(taskId);

    if (!existing) {
      return undefined;
    }

    const nextTask: ComicTask = {
      ...existing,
      ...update,
      updatedAt: nowIso()
    };

    this.tasks.set(taskId, nextTask);
    return nextTask;
  }
}

export const taskQueueService = new TaskQueueService();
