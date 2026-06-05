import type { Request, Response } from "express";
import { z } from "zod";

import { imageRequestCacheService } from "../services/imageRequestCache.service.js";
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
  requestKey: z.string().min(1).optional(),
  prompt: z.string().min(1),
  images: z.array(z.string()).optional(),
  promptParts: z.array(z.object({
    text: z.string().optional(),
    inlineData: z.object({
      mimeType: z.string().min(1),
      data: z.string().min(1)
    }).optional()
  })).optional(),
  params: z.record(z.string(), z.unknown()).optional()
});

const imageRequestStatusSchema = z.object({
  requestKey: z.string().min(1)
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
    if (parsed.data.requestKey) {
      const { result, cacheStatus } = await imageRequestCacheService.getOrCreate(
        parsed.data.requestKey,
        () => modelRouterService.generateImage(parsed.data)
      );

      return response.json(successResponse({
        ...result,
        meta: {
          requestCacheStatus: cacheStatus
        }
      }));
    }

    const result = await modelRouterService.generateImage(parsed.data);
    return response.json(successResponse({
      ...result,
      meta: {
        requestCacheStatus: "miss"
      }
    }));
  } catch (error) {
    return response.status(400).json(errorResponse(error instanceof Error ? error.message : "Image generation failed"));
  }
}

export function getImageRequestStatus(request: Request, response: Response) {
  const parsed = imageRequestStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  const lookup = imageRequestCacheService.lookup(parsed.data.requestKey);
  return response.json(successResponse({
    requestStatus: lookup.status,
    result: lookup.result
  }));
}
