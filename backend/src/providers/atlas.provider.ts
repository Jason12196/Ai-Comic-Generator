import type { ImageGenerationResult } from "./types.js";

const ATLAS_POLL_INTERVAL_MS = 2000;
const ATLAS_MAX_POLL_ATTEMPTS = 90;

export class AtlasProviderError extends Error {
  readonly provider = "atlas";
  readonly phase: "config" | "submit" | "poll" | "result";
  readonly statusCode?: number;
  readonly predictionId?: string;
  readonly atlasStatus?: string;
  readonly details?: unknown;

  constructor(input: {
    message: string;
    phase: "config" | "submit" | "poll" | "result";
    statusCode?: number;
    predictionId?: string;
    atlasStatus?: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "AtlasProviderError";
    this.phase = input.phase;
    this.statusCode = input.statusCode;
    this.predictionId = input.predictionId;
    this.atlasStatus = input.atlasStatus;
    this.details = input.details;
  }

  toJSON() {
    return {
      provider: this.provider,
      phase: this.phase,
      statusCode: this.statusCode,
      predictionId: this.predictionId,
      atlasStatus: this.atlasStatus,
      details: this.details
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAtlasMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as {
    message?: unknown;
    error?: unknown;
    data?: { error?: unknown; status?: unknown };
  };

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }

  if (typeof candidate.data?.error === "string" && candidate.data.error.trim()) {
    return candidate.data.error;
  }

  if (typeof candidate.data?.status === "string" && candidate.data.status.trim()) {
    return `Atlas prediction status: ${candidate.data.status}`;
  }

  return fallback;
}

function normalizeAtlasOutputImage(output: string, params?: Record<string, unknown>) {
  if (!output || output.startsWith("http://") || output.startsWith("https://") || output.startsWith("data:")) {
    return output;
  }

  const outputFormat = typeof params?.output_format === "string" && params.output_format.trim()
    ? params.output_format
    : "jpeg";

  return `data:image/${outputFormat};base64,${output}`;
}

async function parseAtlasJson(response: Response) {
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

export async function generateAtlasImage(input: {
  apiKey?: string;
  prompt: string;
  images?: string[];
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  const apiKey = input.apiKey || process.env.ATLAS_API_KEY;
  if (!apiKey) {
    throw new AtlasProviderError({
      message: "Atlas API key is not configured",
      phase: "config"
    });
  }

  const isEdit = Array.isArray(input.images) && input.images.length > 0;

  return isEdit
    ? generateAtlasImageEdit({
      apiKey,
      prompt: input.prompt,
      images: input.images ?? [],
      params: input.params
    })
    : generateAtlasTextToImage({
      apiKey,
      prompt: input.prompt,
      params: input.params
    });
}

export async function generateAtlasTextToImage(input: {
  apiKey?: string;
  prompt: string;
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  const apiKey = input.apiKey || process.env.ATLAS_API_KEY;
  if (!apiKey) {
    throw new AtlasProviderError({
      message: "Atlas API key is not configured",
      phase: "config"
    });
  }

  return submitAtlasImageGeneration({
    apiKey,
    model: "openai/gpt-image-2/text-to-image",
    prompt: input.prompt,
    params: input.params
  });
}

export async function generateAtlasImageEdit(input: {
  apiKey?: string;
  prompt: string;
  images: string[];
  params?: Record<string, unknown>;
}): Promise<ImageGenerationResult> {
  const apiKey = input.apiKey || process.env.ATLAS_API_KEY;
  if (!apiKey) {
    throw new AtlasProviderError({
      message: "Atlas API key is not configured",
      phase: "config"
    });
  }

  return submitAtlasImageGeneration({
    apiKey,
    model: "openai/gpt-image-2/edit",
    prompt: input.prompt,
    images: input.images,
    params: input.params
  });
}

async function submitAtlasImageGeneration(input: {
  apiKey: string;
  model: string;
  prompt: string;
  images?: string[];
  params?: Record<string, unknown>;
}) {
  const baseUrl = process.env.ATLAS_BASE_URL || "https://api.atlascloud.ai";

  let submitRes: Response;
  try {
    submitRes = await fetch(`${baseUrl}/api/v1/model/generateImage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        ...(input.params ?? {}),
        ...(input.images?.length ? { images: input.images } : {})
      })
    });
  } catch (error) {
    throw new AtlasProviderError({
      message: `Atlas submission network error: ${error instanceof Error ? error.message : "Unknown fetch error"}`,
      phase: "submit"
    });
  }

  const submitJson = await parseAtlasJson(submitRes);
  const predictionId = (submitJson as { data?: { id?: string } } | null)?.data?.id;

  if (!submitRes.ok || !predictionId) {
    throw new AtlasProviderError({
      message: normalizeAtlasMessage(submitJson, "Atlas image generation submission failed"),
      phase: "submit",
      statusCode: submitRes.status,
      details: submitJson
    });
  }

  for (let index = 0; index < ATLAS_MAX_POLL_ATTEMPTS; index += 1) {
    await sleep(ATLAS_POLL_INTERVAL_MS);

    let pollRes: Response;
    try {
      pollRes = await fetch(`${baseUrl}/api/v1/model/prediction/${predictionId}`, {
        headers: { Authorization: `Bearer ${input.apiKey}` }
      });
    } catch (error) {
      throw new AtlasProviderError({
        message: `Atlas polling network error: ${error instanceof Error ? error.message : "Unknown fetch error"}`,
        phase: "poll",
        predictionId
      });
    }

    const pollJson = await parseAtlasJson(pollRes);
    const data = (pollJson as { data?: { status?: string; outputs?: string[]; error?: string } } | null)?.data;

    if (!pollRes.ok) {
      throw new AtlasProviderError({
        message: normalizeAtlasMessage(pollJson, "Atlas prediction polling failed"),
        phase: "poll",
        statusCode: pollRes.status,
        predictionId,
        atlasStatus: data?.status,
        details: pollJson
      });
    }

    if (data?.status === "completed" || data?.status === "succeeded") {
      if (!Array.isArray(data.outputs) || data.outputs.length === 0 || !data.outputs[0]) {
        throw new AtlasProviderError({
          message: "Atlas generation completed but returned no outputs",
          phase: "result",
          predictionId,
          atlasStatus: data.status,
          details: pollJson
        });
      }

      return {
        images: data.outputs.map((output) => normalizeAtlasOutputImage(output, input.params)),
        raw: pollJson
      };
    }

    if (data?.status === "failed") {
      throw new AtlasProviderError({
        message: normalizeAtlasMessage(pollJson, "Atlas generation failed"),
        phase: "result",
        predictionId,
        atlasStatus: data.status,
        details: pollJson
      });
    }
  }

  throw new AtlasProviderError({
    message: `Atlas generation timeout after ${ATLAS_POLL_INTERVAL_MS * ATLAS_MAX_POLL_ATTEMPTS / 1000} seconds`,
    phase: "poll",
    predictionId,
    atlasStatus: "processing"
  });
}
