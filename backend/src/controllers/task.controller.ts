import type { Request, Response } from "express";

import { taskQueueService } from "../services/taskQueue.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

export function getTaskById(request: Request, response: Response) {
  const taskId = Array.isArray(request.params.taskId) ? request.params.taskId[0] : request.params.taskId;
  const task = taskQueueService.getTask(taskId);

  if (!task) {
    return response.status(404).json(errorResponse("Task not found"));
  }

  return response.json(successResponse(task));
}
