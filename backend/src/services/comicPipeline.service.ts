import type { GenerateComicRequest, GeneratedPanel, StoryboardResult } from "../types/index.js";

import { AtlasProviderError } from "../providers/atlas.provider.js";
import { GoogleProviderError } from "../providers/google.provider.js";
import { modelRouterService } from "./modelRouter.service.js";
import { taskQueueService } from "./taskQueue.service.js";
import { parseModelJson } from "../utils/jsonParser.js";
import { buildPanelImageParts, buildPanelImagePrompt, buildStoryboardPrompt, buildStoryboardSystemPrompt } from "../utils/promptBuilder.js";

function extractInlineData(raw: unknown) {
  const parts = (raw as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> } | null)
    ?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data && part.inlineData.mimeType);
  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    return null;
  }

  return {
    mimeType: imagePart.inlineData.mimeType,
    data: imagePart.inlineData.data
  };
}

export class ComicPipelineService {
  async run(taskId: string, input: GenerateComicRequest): Promise<void> {
    taskQueueService.updateTask(taskId, {
      status: "processing",
      progress: 10
    });

    try {
      const storyboard: StoryboardResult = parseModelJson<StoryboardResult>(await modelRouterService.generateText({
        modelKey: input.textModelKey!,
        apiKey: input.textApiKey ?? input.apiKey,
        messages: [
          {
            role: "system",
            content: buildStoryboardSystemPrompt()
          },
          {
            role: "user",
            content: buildStoryboardPrompt(input)
          }
        ]
      }).then((result) => result.text));
      taskQueueService.updateTask(taskId, {
        status: "processing",
        progress: 30,
        storyboard
      });

      const panels: GeneratedPanel[] = [];
      let previousPanelData: { mimeType: string; data: string } | null = null;

      for (let index = 0; index < storyboard.panels.length; index += 1) {
        const panel = storyboard.panels[index];
        const prompt = buildPanelImagePrompt(storyboard.panels[index], storyboard.style, input.aspectRatio);
        const promptParts = buildPanelImageParts({
          request: input,
          panel,
          style: storyboard.style,
          previousPanelData
        });
        const imageResult = await modelRouterService.generateImage({
          modelKey: input.imageModelKey!,
          apiKey: input.imageApiKey ?? input.apiKey,
          prompt,
          promptParts,
          params: { aspectRatio: input.aspectRatio }
        });
        const imageUrl = imageResult.images[0];
        if (!imageUrl) {
          throw new Error("Image generation returned no image");
        }

        previousPanelData = extractInlineData(imageResult.raw);

        panels.push({
          ...panel,
          imageUrl,
          ...(previousPanelData ? { rawData: previousPanelData } : {})
        });

        const progress = Math.min(90, 40 + Math.round(((index + 1) / storyboard.panels.length) * 50));
        taskQueueService.updateTask(taskId, {
          status: "processing",
          progress,
          panels: [...panels]
        });
      }

      taskQueueService.updateTask(taskId, {
        status: "completed",
        progress: 100,
        panels
      });
    } catch (error) {
      taskQueueService.updateTask(taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown pipeline error",
        errorDetails: error instanceof AtlasProviderError || error instanceof GoogleProviderError
          ? error.toJSON()
          : error instanceof Error
            ? {
                provider: "unknown",
                phase: "unknown",
                details: {
                  name: error.name,
                  message: error.message
                }
              }
            : {
                provider: "unknown",
                phase: "unknown",
                details: error
              }
      });
    }
  }
}

export const comicPipelineService = new ComicPipelineService();
