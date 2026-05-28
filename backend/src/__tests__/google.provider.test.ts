import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleProviderError, generateGeminiText } from "../providers/google.provider.js";

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

describe("google provider", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
    vi.restoreAllMocks();
  });

  it("returns text from fetch path", async () => {
    process.env.GEMINI_API_KEY = "gemini-test";
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({
      candidates: [
        {
          content: {
            parts: [{ text: "{\"ok\":true}" }]
          }
        }
      ]
    }));
    global.fetch = fetchMock as typeof fetch;

    const result = await generateGeminiText({
      modelId: "gemini-3.1-flash-lite-preview",
      messages: [
        { role: "system", content: "Return JSON only" },
        { role: "user", content: "hello" }
      ]
    });

    expect(result.text).toBe("{\"ok\":true}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(String(requestInit?.body));
    expect(requestBody).toMatchObject({
      systemInstruction: {
        parts: [{ text: "Return JSON only" }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: "hello" }]
        }
      ],
      generationConfig: {}
    });
  });

  it("passes responseMimeType only when explicitly requested", async () => {
    process.env.GEMINI_API_KEY = "gemini-test";
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({
      candidates: [
        {
          content: {
            parts: [{ text: "{\"pages\":[]}" }]
          }
        }
      ]
    }));
    global.fetch = fetchMock as typeof fetch;

    await generateGeminiText({
      modelId: "gemini-3.1-flash-lite-preview",
      messages: [
        { role: "system", content: "Return storyboard JSON only" },
        { role: "user", content: "Story: hello" }
      ],
      params: {
        responseMimeType: "application/json"
      }
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(String(requestInit?.body));
    expect(requestBody.generationConfig).toEqual({
      responseMimeType: "application/json"
    });
  });

  it("throws config error when api key is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(generateGeminiText({
      modelId: "gemini-3.1-flash-lite-preview",
      messages: [{ role: "user", content: "hello" }]
    })).rejects.toBeInstanceOf(GoogleProviderError);
    await expect(generateGeminiText({
      modelId: "gemini-3.1-flash-lite-preview",
      messages: [{ role: "user", content: "hello" }]
    })).rejects.toMatchObject({
      phase: "config",
      operation: "text",
      message: "Gemini API key is not configured"
    });
  });
});
