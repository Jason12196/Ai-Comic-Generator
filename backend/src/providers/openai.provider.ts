import OpenAI from "openai";

import type { ImageGenerationResult, ModelMessage, TextGenerationResult } from "./types.js";

function createOpenAIClient(apiKey?: string) {
  const resolvedApiKey = apiKey || process.env.OPENAI_API_KEY;
  if (!resolvedApiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  return new OpenAI({
    apiKey: resolvedApiKey,
    baseURL: process.env.OPENAI_BASE_URL
  });
}

export async function generateOpenAIText(input: {
  apiKey?: string;
  modelId: string;
  messages: ModelMessage[];
  params?: Record<string, unknown>;
}): Promise<TextGenerationResult> {
  const client = createOpenAIClient(input.apiKey);
  const response = await client.responses.create({
    model: input.modelId,
    input: input.messages,
    ...(input.params ?? {})
  });

  return {
    text: response.output_text ?? "",
    raw: response
  };
}

export async function generateOpenAIImage(input: {
  apiKey?: string;
  modelId: string;
  prompt: string;
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  const client = createOpenAIClient(input.apiKey);
  const response = await client.images.generate({
    model: input.modelId,
    prompt: input.prompt,
    ...(input.params ?? {})
  });

  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI image generation returned no image data");
  }

  return {
    images: [`data:image/png;base64,${imageBase64}`],
    raw: response
  };
}
