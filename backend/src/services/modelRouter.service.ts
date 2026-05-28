import { getModelByKey, listModelsByCategory } from "../models/modelRegistry.js";
import { generateAtlasImage } from "../providers/atlas.provider.js";
import { generateDeepSeekText } from "../providers/deepseek.provider.js";
import { generateGeminiImage, generateGeminiText } from "../providers/google.provider.js";
import { generateOpenAIImage, generateOpenAIText } from "../providers/openai.provider.js";
import type { ImageGenerationResult, ImagePromptPart, ModelMessage, TextGenerationResult } from "../providers/types.js";

export class ModelRouterService {
  getDefaultModelKeys() {
    return {
      defaultTextModelKey: process.env.DEFAULT_TEXT_MODEL_KEY || "google.gemini-3.1-flash-lite",
      defaultImageModelKey: process.env.DEFAULT_IMAGE_MODEL_KEY || "google.gemini-3-pro-image-preview"
    };
  }

  listModels() {
    return {
      ...this.getDefaultModelKeys(),
      textModels: listModelsByCategory("text"),
      imageModels: listModelsByCategory("image")
    };
  }

  validateModelKey(modelKey: string, category: "text" | "image") {
    const model = getModelByKey(modelKey);
    if (!model || model.category !== category) {
      throw new Error(`Invalid ${category} model`);
    }

    return model;
  }

  async generateText(input: {
    modelKey: string;
    apiKey?: string;
    messages: ModelMessage[];
    params?: Record<string, unknown>;
  }): Promise<TextGenerationResult> {
    const model = this.validateModelKey(input.modelKey, "text");
    const params = { ...(model.defaultParams ?? {}), ...(input.params ?? {}) };

    if (model.provider === "openai") {
      return generateOpenAIText({ apiKey: input.apiKey, modelId: model.realModelId, messages: input.messages, params });
    }
    if (model.provider === "google") {
      return generateGeminiText({ apiKey: input.apiKey, modelId: model.realModelId, messages: input.messages, params });
    }
    if (model.provider === "deepseek") {
      return generateDeepSeekText({ apiKey: input.apiKey, modelId: model.realModelId, messages: input.messages, params });
    }

    throw new Error("Unsupported text provider");
  }

  async generateImage(input: {
    modelKey: string;
    apiKey?: string;
    prompt: string;
    images?: string[];
    promptParts?: ImagePromptPart[];
    params?: Record<string, unknown>;
  }): Promise<ImageGenerationResult> {
    const model = this.validateModelKey(input.modelKey, "image");
    const params = { ...(model.defaultParams ?? {}), ...(input.params ?? {}) };

    if (model.provider === "openai") {
      return generateOpenAIImage({ apiKey: input.apiKey, modelId: model.realModelId, prompt: input.prompt, params });
    }
    if (model.provider === "google") {
      return generateGeminiImage({ apiKey: input.apiKey, modelId: model.realModelId, prompt: input.prompt, promptParts: input.promptParts, params });
    }
    if (model.provider === "atlas") {
      return generateAtlasImage({ apiKey: input.apiKey, prompt: input.prompt, images: input.images, params });
    }

    throw new Error("Unsupported image provider");
  }
}

export const modelRouterService = new ModelRouterService();
