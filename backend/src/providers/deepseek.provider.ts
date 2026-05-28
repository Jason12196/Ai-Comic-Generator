import OpenAI from "openai";

import type { ModelMessage, TextGenerationResult } from "./types.js";

export async function generateDeepSeekText(input: {
  apiKey?: string;
  modelId: string;
  messages: ModelMessage[];
  params?: Record<string, unknown>;
}): Promise<TextGenerationResult> {
  const apiKey = input.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DeepSeek API key is not configured");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
  });

  const completion = await client.chat.completions.create({
    model: input.modelId,
    messages: input.messages,
    stream: false,
    ...(input.params ?? {})
  });

  return {
    text: completion.choices?.[0]?.message?.content || "",
    raw: completion
  };
}
