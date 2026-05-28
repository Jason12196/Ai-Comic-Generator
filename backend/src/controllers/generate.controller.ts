import type { Request, Response } from "express";
import { z } from "zod";

import { comicPipelineService } from "../services/comicPipeline.service.js";
import { modelRouterService } from "../services/modelRouter.service.js";
import { taskQueueService } from "../services/taskQueue.service.js";
import { parseModelJson } from "../utils/jsonParser.js";
import { buildStoryboardSystemPrompt } from "../utils/promptBuilder.js";
import { errorResponse, successResponse } from "../utils/response.js";

const panelCountSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(6),
  z.literal(8)
]);

const comicRequestSchema = z.object({
  userPrompt: z.string().min(1),
  style: z.string().min(1),
  panelCount: panelCountSchema,
  aspectRatio: z.string().min(1),
  language: z.string().min(1),
  characters: z.array(z.record(z.string(), z.unknown())).optional(),
  selectedCharacters: z.array(z.record(z.string(), z.unknown())).optional(),
  customStyleImageBase64: z.string().min(1).optional(),
  customStyleImageMimeType: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  textApiKey: z.string().min(1).optional(),
  imageApiKey: z.string().min(1).optional(),
  textModel: z.string().min(1).optional(),
  imageModel: z.string().min(1).optional(),
  textModelKey: z.string().min(1).optional(),
  imageModelKey: z.string().min(1).optional()
});

const imageRequestSchema = z.object({
  imagePrompt: z.string().min(1),
  style: z.string().min(1).default("manga"),
  aspectRatio: z.string().min(1).default("1:1"),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  imageApiKey: z.string().min(1).optional(),
  modelKey: z.string().min(1).optional(),
  promptParts: z.array(z.object({
    text: z.string().optional(),
    inlineData: z.object({
      mimeType: z.string().min(1),
      data: z.string().min(1)
    }).optional()
  })).optional()
});

export async function generateStory(request: Request, response: Response) {
  const parsed = comicRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const defaults = modelRouterService.getDefaultModelKeys();
    const modelKey = parsed.data.textModelKey || defaults.defaultTextModelKey;
    modelRouterService.validateModelKey(modelKey, "text");
    const result = await modelRouterService.generateText({
      modelKey,
      apiKey: parsed.data.textApiKey ?? parsed.data.apiKey,
      messages: [
        {
          role: "system",
          content: buildStoryboardSystemPrompt()
        },
        {
          role: "user",
          content: `Story: ${parsed.data.userPrompt}\nStyle: ${parsed.data.style}\nPanel count: ${parsed.data.panelCount}\nAspect ratio: ${parsed.data.aspectRatio}\nLanguage: ${parsed.data.language}`
        }
      ]
    });
    const storyboard = parseModelJson(result.text);
    return response.json(successResponse(storyboard));
  } catch (error) {
    return response.status(500).json(errorResponse(error instanceof Error ? error.message : "Story generation failed"));
  }
}

export async function generateImage(request: Request, response: Response) {
  const parsed = imageRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const defaults = modelRouterService.getDefaultModelKeys();
    const modelKey = parsed.data.modelKey || defaults.defaultImageModelKey;
        const imageUrl = parsed.data.modelKey
      ? (await modelRouterService.generateImage({
          modelKey,
          apiKey: parsed.data.imageApiKey ?? parsed.data.apiKey,
          prompt: parsed.data.imagePrompt,
          promptParts: parsed.data.promptParts,
          params: { aspectRatio: parsed.data.aspectRatio }
        })).images[0]
      : (await modelRouterService.generateImage({
          modelKey,
          apiKey: parsed.data.imageApiKey ?? parsed.data.apiKey,
          prompt: parsed.data.imagePrompt,
          promptParts: parsed.data.promptParts,
          params: { aspectRatio: parsed.data.aspectRatio }
        })).images[0];
    return response.json(successResponse({ imageUrl }));
  } catch (error) {
    return response.status(500).json(errorResponse(error instanceof Error ? error.message : "Image generation failed"));
  }
}

export function generateComic(request: Request, response: Response) {
  const parsed = comicRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  const defaults = modelRouterService.getDefaultModelKeys();
  const requestData = {
    ...parsed.data,
    textModelKey: parsed.data.textModelKey || defaults.defaultTextModelKey,
    imageModelKey: parsed.data.imageModelKey || defaults.defaultImageModelKey
  };

  try {
    modelRouterService.validateModelKey(requestData.textModelKey, "text");
    modelRouterService.validateModelKey(requestData.imageModelKey, "image");
  } catch (error) {
    return response.status(400).json(errorResponse(error instanceof Error ? error.message : "Invalid model selection"));
  }

  const task = taskQueueService.createTask(requestData);
  void comicPipelineService.run(task.id, requestData);

  return response.status(202).json(successResponse({
    taskId: task.id,
    status: task.status
  }));
}
