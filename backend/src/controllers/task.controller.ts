import type { Request, Response } from "express";
import { z } from "zod";

import { taskService } from "../services/task.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

const taskPayloadSchema = z.object({
  task: z.record(z.string(), z.unknown())
});

export function listTasks(request: Request, response: Response) {
  const user = request.authUser;
  if (!user) {
    return response.status(401).json(errorResponse("Authentication required"));
  }

  const tasks = taskService.listTasksForUser(user.id);
  return response.json(successResponse({ tasks }));
}

export function upsertTask(request: Request, response: Response) {
  const user = request.authUser;
  if (!user) {
    return response.status(401).json(errorResponse("Authentication required"));
  }

  const parsed = taskPayloadSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const task = taskService.upsertTask(user.id, parsed.data.task);
    return response.json(successResponse({ task }));
  } catch (error) {
    return response.status(400).json(errorResponse(error instanceof Error ? error.message : "Could not save task"));
  }
}

export function deleteTask(request: Request, response: Response) {
  const user = request.authUser;
  if (!user) {
    return response.status(401).json(errorResponse("Authentication required"));
  }

  const taskIdValue = request.params.taskId;
  const taskId = typeof taskIdValue === "string" ? taskIdValue.trim() : "";
  if (!taskId) {
    return response.status(400).json(errorResponse("Task id is required"));
  }

  const deleted = taskService.deleteTask(user.id, taskId);
  if (!deleted) {
    return response.status(404).json(errorResponse("Task not found"));
  }

  return response.json(successResponse({ deleted: true }));
}

export function deleteAllTasks(request: Request, response: Response) {
  const user = request.authUser;
  if (!user) {
    return response.status(401).json(errorResponse("Authentication required"));
  }

  taskService.deleteAllTasksForUser(user.id);
  return response.json(successResponse({ deleted: true }));
}
