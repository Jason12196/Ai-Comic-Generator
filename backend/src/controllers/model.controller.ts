import type { Request, Response } from "express";
import { z } from "zod";

import { modelRouterService } from "../services/modelRouter.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string()
});

const generateTextSchema = z.object({
  modelKey: z.string().min(1),
  apiKey: z.string().min(1).optional(),
  messages: z.array(messageSchema).min(1),
  params: z.record(z.string(), z.unknown()).optional()
});

const generateImageSchema = z.object({
  modelKey: z.string().min(1),
  apiKey: z.string().min(1).optional(),
  prompt: z.string().min(1),
  images: z.array(z.string()).optional(),
  params: z.record(z.string(), z.unknown()).optional()
});

export function getModels(_request: Request, response: Response) {
  response.json(successResponse(modelRouterService.listModels()));
}

export async function generateText(request: Request, response: Response) {
  const parsed = generateTextSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const result = await modelRouterService.generateText(parsed.data);
    return response.json(successResponse(result));
  } catch (error) {
    return response.status(400).json(errorResponse(error instanceof Error ? error.message : "Text generation failed"));
  }
}

export async function generateImageByModel(request: Request, response: Response) {
  const parsed = generateImageSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const result = await modelRouterService.generateImage(parsed.data);
    return response.json(successResponse(result));
  } catch (error) {
    return response.status(400).json(errorResponse(error instanceof Error ? error.message : "Image generation failed"));
  }
}
