import https from "node:https";
import { URL } from "node:url";

import type { ImageGenerationResult, ImagePromptPart, ModelMessage, TextGenerationResult } from "./types.js";

type GeminiPhase = "config" | "network" | "submit" | "result";
type GeminiOperation = "text" | "image";

export class GoogleProviderError extends Error {
  readonly provider = "google";
  readonly phase: GeminiPhase;
  readonly operation: GeminiOperation;
  readonly statusCode?: number;
  readonly transport?: "fetch" | "https";
  readonly details?: unknown;

  constructor(input: {
    message: string;
    phase: GeminiPhase;
    operation: GeminiOperation;
    statusCode?: number;
    transport?: "fetch" | "https";
    details?: unknown;
  }) {
    super(input.message);
    this.name = "GoogleProviderError";
    this.phase = input.phase;
    this.operation = input.operation;
    this.statusCode = input.statusCode;
    this.transport = input.transport;
    this.details = input.details;
  }

  toJSON() {
    return {
      provider: this.provider,
      phase: this.phase,
      operation: this.operation,
      statusCode: this.statusCode,
      transport: this.transport,
      details: this.details
    };
  }
}

function resolveGeminiApiKey(apiKey?: string) {
  const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!resolvedApiKey) {
    throw new GoogleProviderError({
      message: "Gemini API key is not configured",
      phase: "config",
      operation: "text"
    });
  }

  return resolvedApiKey;
}

function buildSystemInstruction(messages: ModelMessage[]) {
  const systemMessages = messages.filter((message) => message.role === "system");
  if (systemMessages.length === 0) {
    return undefined;
  }

  return {
    parts: [{ text: systemMessages.map((message) => message.content).join("\n\n") }]
  };
}

function buildUserContents(messages: ModelMessage[]) {
  const nonSystemMessages = messages.filter((message) => message.role !== "system");
  const sourceMessages = nonSystemMessages.length > 0 ? nonSystemMessages : messages;

  return sourceMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
}

async function parseGeminiJsonResponse(response: Response) {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return { rawText };
  }
}

function parseGeminiBodyText(rawText: string) {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return { rawText };
  }
}

function getGeminiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as {
    error?: { message?: unknown };
    candidates?: Array<{ finishReason?: unknown }>;
    rawText?: unknown;
  };

  if (typeof candidate.error?.message === "string" && candidate.error.message.trim()) {
    return candidate.error.message;
  }

  if (typeof candidate.candidates?.[0]?.finishReason === "string" && candidate.candidates[0].finishReason.trim()) {
    return `Gemini finish reason: ${candidate.candidates[0].finishReason}`;
  }

  if (typeof candidate.rawText === "string" && candidate.rawText.trim()) {
    return candidate.rawText;
  }

  return fallback;
}

async function requestWithHttps(urlString: string, body: unknown) {
  const url = new URL(urlString);
  const payload = JSON.stringify(body);

  return new Promise<{ statusCode: number; bodyText: string }>((resolve, reject) => {
    const request = https.request({
      protocol: url.protocol,
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: "POST",
      port: url.port || 443,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      },
      family: 4,
      timeout: 20000
    }, (response) => {
      let chunks = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        chunks += chunk;
      });
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          bodyText: chunks
        });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("HTTPS fallback timeout"));
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.write(payload);
    request.end();
  });
}

async function requestGemini(input: {
  operation: GeminiOperation;
  url: string;
  body: unknown;
}) {
  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.body)
    });
    return {
      statusCode: response.status,
      json: await parseGeminiJsonResponse(response),
      transport: "fetch" as const
    };
  } catch (fetchError) {
    try {
      const fallback = await requestWithHttps(input.url, input.body);
      return {
        statusCode: fallback.statusCode,
        json: parseGeminiBodyText(fallback.bodyText),
        transport: "https" as const
      };
    } catch (httpsError) {
      throw new GoogleProviderError({
        message: `Gemini ${input.operation} request failed before reaching API: ${fetchError instanceof Error ? fetchError.message : "Unknown fetch error"}; https fallback: ${httpsError instanceof Error ? httpsError.message : "Unknown https error"}`,
        phase: "network",
        operation: input.operation,
        details: {
          fetchError: fetchError instanceof Error ? {
            name: fetchError.name,
            message: fetchError.message,
            cause: fetchError.cause
          } : fetchError,
          httpsError: httpsError instanceof Error ? {
            name: httpsError.name,
            message: httpsError.message
          } : httpsError
        }
      });
    }
  }
}

export async function generateGeminiText(input: {
  apiKey?: string;
  modelId: string;
  messages: ModelMessage[];
  params?: Record<string, unknown>;
}): Promise<TextGenerationResult> {
  const apiKey = resolveGeminiApiKey(input.apiKey);
  const body = {
    systemInstruction: buildSystemInstruction(input.messages),
    contents: buildUserContents(input.messages),
    generationConfig: input.params ?? {}
  };
  const result = await requestGemini({
    operation: "text",
    url: `https://generativelanguage.googleapis.com/v1beta/models/${input.modelId}:generateContent?key=${apiKey}`,
    body
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new GoogleProviderError({
      message: getGeminiErrorMessage(result.json, "Gemini text generation failed"),
      phase: "submit",
      operation: "text",
      statusCode: result.statusCode,
      transport: result.transport,
      details: result.json
    });
  }

  const text = (result.json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null)
    ?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new GoogleProviderError({
      message: getGeminiErrorMessage(result.json, "Gemini text generation returned no text"),
      phase: "result",
      operation: "text",
      transport: result.transport,
      details: result.json
    });
  }

  return { text, raw: result.json };
}

export async function generateGeminiImage(input: {
  apiKey?: string;
  modelId: string;
  prompt: string;
  promptParts?: ImagePromptPart[];
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  const apiKey = resolveGeminiApiKey(input.apiKey);
  const aspectRatio = typeof input.params?.aspectRatio === "string" ? input.params.aspectRatio : undefined;
  const requestParts = Array.isArray(input.promptParts) && input.promptParts.length > 0
    ? input.promptParts
    : [{ text: input.prompt }];

  const result = await requestGemini({
    operation: "image",
    url: `https://generativelanguage.googleapis.com/v1beta/models/${input.modelId}:generateContent?key=${apiKey}`,
    body: {
      contents: [{ parts: requestParts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        ...(aspectRatio ? { imageConfig: { aspectRatio } } : {})
      }
    }
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new GoogleProviderError({
      message: getGeminiErrorMessage(result.json, "Gemini image generation failed"),
      phase: "submit",
      operation: "image",
      statusCode: result.statusCode,
      transport: result.transport,
      details: result.json
    });
  }

  const responseParts = (result.json as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> } | null)
    ?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = responseParts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    throw new GoogleProviderError({
      message: getGeminiErrorMessage(result.json, "Gemini image generation returned no image data"),
      phase: "result",
      operation: "image",
      transport: result.transport,
      details: result.json
    });
  }

  return {
    images: [`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`],
    raw: result.json
  };
}
