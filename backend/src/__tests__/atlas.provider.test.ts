import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasProviderError, generateAtlasImage } from "../providers/atlas.provider.js";

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

describe("atlas provider", () => {
  const originalFetch = global.fetch;
  const originalAtlasKey = process.env.ATLAS_API_KEY;

  beforeEach(() => {
    process.env.ATLAS_API_KEY = "atlas-test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.ATLAS_API_KEY = originalAtlasKey;
    vi.restoreAllMocks();
  });

  it("uses text-to-image model when no source image is provided", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ data: { id: "pred_123" } }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          status: "completed",
          outputs: ["https://example.com/image.jpg"]
        }
      }));
    global.fetch = fetchMock as typeof fetch;

    const result = await generateAtlasImage({
      prompt: "a happy fox"
    });

    expect(result.images[0]).toBe("https://example.com/image.jpg");
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining("/generateImage"), expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"model\":\"openai/gpt-image-2/text-to-image\"")
    }));
  });

  it("uses edit model when source images are provided", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ data: { id: "pred_456" } }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          status: "completed",
          outputs: ["https://example.com/edited.jpg"]
        }
      }));
    global.fetch = fetchMock as typeof fetch;

    await generateAtlasImage({
      prompt: "turn this into a poster",
      images: ["https://example.com/source.jpg"]
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
      body: expect.stringContaining("\"model\":\"openai/gpt-image-2/edit\"")
    }));
  });

  it("surfaces submission failures with phase and status code", async () => {
    global.fetch = vi.fn().mockResolvedValue(createJsonResponse({
      message: "Invalid bearer token"
    }, { status: 401 })) as typeof fetch;

    await expect(generateAtlasImage({ prompt: "a cat" })).rejects.toMatchObject({
      name: "AtlasProviderError",
      phase: "submit",
      statusCode: 401,
      message: "Invalid bearer token"
    });
  });

  it("surfaces prediction failed responses", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ data: { id: "pred_failed" } }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          status: "failed",
          error: "Content policy violation"
        }
      })) as typeof fetch;

    await expect(generateAtlasImage({ prompt: "a cat" })).rejects.toMatchObject({
      name: "AtlasProviderError",
      phase: "result",
      predictionId: "pred_failed",
      atlasStatus: "failed",
      message: "Content policy violation"
    });
  });

  it("surfaces completed responses with empty outputs", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ data: { id: "pred_empty" } }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          status: "completed",
          outputs: []
        }
      })) as typeof fetch;

    await expect(generateAtlasImage({ prompt: "a cat" })).rejects.toMatchObject({
      name: "AtlasProviderError",
      phase: "result",
      predictionId: "pred_empty",
      message: "Atlas generation completed but returned no outputs"
    });
  });

  it("surfaces polling network failures", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ data: { id: "pred_poll_network" } }))
      .mockRejectedValueOnce(new Error("connect ETIMEDOUT")) as typeof fetch;

    await expect(generateAtlasImage({ prompt: "a cat" })).rejects.toMatchObject({
      name: "AtlasProviderError",
      phase: "poll",
      predictionId: "pred_poll_network",
      message: "Atlas polling network error: connect ETIMEDOUT"
    });
  });

  it("throws config error when API key is missing", async () => {
    delete process.env.ATLAS_API_KEY;

    await expect(generateAtlasImage({ prompt: "a cat" })).rejects.toBeInstanceOf(AtlasProviderError);
    await expect(generateAtlasImage({ prompt: "a cat" })).rejects.toMatchObject({
      phase: "config",
      message: "Atlas API key is not configured"
    });
  });
});
