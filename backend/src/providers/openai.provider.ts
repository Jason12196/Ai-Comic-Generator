import OpenAI, { toFile } from "openai";

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
  const { responseMimeType, ...restParams } = input.params ?? {};
  const response = await client.responses.create({
    model: input.modelId,
    input: input.messages,
    ...(restParams ?? {}),
    ...(responseMimeType === "application/json"
      ? { text: { format: { type: "json_object" } } }
      : {})
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
  images?: string[];
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  if (Array.isArray(input.images) && input.images.length > 0) {
    return generateOpenAIImageEdit(input);
  }

  return generateOpenAIImageFromPrompt(input);
}

export async function generateOpenAIImageFromPrompt(input: {
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

export async function generateOpenAIImageEdit(input: {
  apiKey?: string;
  modelId: string;
  prompt: string;
  images?: string[];
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  const client = createOpenAIClient(input.apiKey);
  const uploadables = await Promise.all((input.images ?? []).map((image, index) => dataUrlToFile(image, index)));
  if (uploadables.length === 0) {
    throw new Error("OpenAI image edit requires at least one source image");
  }

  const response = await client.images.edit({
    model: input.modelId,
    prompt: input.prompt,
    image: uploadables.length === 1 ? uploadables[0] : uploadables,
    ...(input.params ?? {})
  });

  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI image edit returned no image data");
  }

  return {
    images: [`data:image/png;base64,${imageBase64}`],
    raw: response
  };
}

async function dataUrlToFile(dataUrl: string, index: number) {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("OpenAI image edit requires base64 data URLs");
  }

  const [metadata, encoded] = dataUrl.split(",", 2);
  if (!metadata || !encoded) {
    throw new Error("Invalid data URL provided for OpenAI image edit");
  }

  const mimeType = metadata.split(":")[1]?.split(";")[0] || "image/png";
  const extension = mimeType.split("/")[1] || "png";
  const buffer = Buffer.from(encoded, "base64");

  return toFile(buffer, `reference-${index + 1}.${extension}`, { type: mimeType });
}
