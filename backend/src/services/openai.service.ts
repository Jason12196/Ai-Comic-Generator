import OpenAI from "openai";

import type { GenerateComicRequest, StoryboardResult } from "../types/index.js";
import { parseModelJson } from "../utils/jsonParser.js";
import { buildPanelImagePrompt, buildStoryboardPrompt } from "../utils/promptBuilder.js";

const defaultTextModel = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";
const defaultImageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

function createClient(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL
  });
}

function buildFallbackStoryboard(input: GenerateComicRequest): StoryboardResult {
  return {
    title: "AI Comic Storyboard",
    summary: input.userPrompt,
    style: input.style,
    language: input.language,
    panelCount: input.panelCount,
    panels: Array.from({ length: input.panelCount }, (_, index) => ({
      panel_number: index + 1,
      title: `Panel ${index + 1}`,
      narration: `${input.userPrompt} - scene ${index + 1}`,
      image_prompt: `${input.userPrompt}, comic panel ${index + 1}, ${input.style} style`
    }))
  };
}

export class OpenAIService {
  async generateStoryboard(input: GenerateComicRequest): Promise<StoryboardResult> {
    if (!input.apiKey && !process.env.OPENAI_API_KEY) {
      return buildFallbackStoryboard(input);
    }

    const client = createClient(input.apiKey);
    const response = await client.responses.create({
      model: input.textModel ?? defaultTextModel,
      input: [
        {
          role: "system",
          content: "Generate a comic storyboard as strict JSON with title, summary, style, language, panelCount, and panels."
        },
        {
          role: "user",
          content: buildStoryboardPrompt(input)
        }
      ]
    });

    const outputText = response.output_text?.trim();

    if (!outputText) {
      throw new Error("Text model returned empty storyboard output");
    }

    return parseModelJson<StoryboardResult>(outputText);
  }

  async generateImage(panelPrompt: string, options?: { apiKey?: string; imageModel?: string }): Promise<string> {
    if (!options?.apiKey && !process.env.OPENAI_API_KEY) {
      return `data:text/plain;base64,${Buffer.from(panelPrompt).toString("base64")}`;
    }

    const client = createClient(options?.apiKey);
    const response = await client.images.generate({
      model: options?.imageModel ?? defaultImageModel,
      prompt: panelPrompt,
      size: "1024x1024"
    });

    const imageBase64 = response.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error("Image model returned no image data");
    }

    return `data:image/png;base64,${imageBase64}`;
  }

  buildPanelPrompt(storyboard: StoryboardResult, panelIndex: number, aspectRatio: string) {
    return buildPanelImagePrompt(storyboard.panels[panelIndex], storyboard.style, aspectRatio);
  }
}

export const openAIService = new OpenAIService();
