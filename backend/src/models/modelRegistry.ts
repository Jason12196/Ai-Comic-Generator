export type ModelProvider = "openai" | "google" | "deepseek" | "atlas";
export type ModelCategory = "text" | "image";
export type ModelEndpointType =
  | "openai-responses"
  | "openai-images"
  | "gemini-generate-content"
  | "deepseek-chat"
  | "atlas-generate-image";

export interface AppModelConfig {
  key: string;
  displayName: string;
  provider: ModelProvider;
  category: ModelCategory;
  realModelId: string;
  endpointType: ModelEndpointType;
  supportsImages?: boolean;
  supportsImageEdit?: boolean;
  defaultParams?: Record<string, unknown>;
}

export const MODEL_REGISTRY: AppModelConfig[] = [
  { key: "google.gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash-Lite", provider: "google", category: "text", realModelId: "gemini-3.1-flash-lite-preview", endpointType: "gemini-generate-content", defaultParams: { temperature: 0.7 } },
  { key: "google.gemini-3.5-flash", displayName: "Gemini 3.5 Flash", provider: "google", category: "text", realModelId: "gemini-3.5-flash", endpointType: "gemini-generate-content", defaultParams: { temperature: 0.7 } },
  { key: "google.gemini-3.1-pro", displayName: "Gemini 3.1 Pro", provider: "google", category: "text", realModelId: "gemini-3.1-pro", endpointType: "gemini-generate-content", defaultParams: { temperature: 0.6 } },
  { key: "openai.gpt-5.5", displayName: "GPT-5.5", provider: "openai", category: "text", realModelId: "gpt-5.5", endpointType: "openai-responses", defaultParams: { temperature: 0.7 } },
  { key: "openai.gpt-5.4-high", displayName: "GPT-5.4 High", provider: "openai", category: "text", realModelId: "gpt-5.4", endpointType: "openai-responses", defaultParams: { reasoning_effort: "high" } },
  { key: "openai.gpt-5.4-medium", displayName: "GPT-5.4 Medium", provider: "openai", category: "text", realModelId: "gpt-5.4", endpointType: "openai-responses", defaultParams: { reasoning_effort: "medium" } },
  { key: "openai.gpt-5.4-low", displayName: "GPT-5.4 Low", provider: "openai", category: "text", realModelId: "gpt-5.4", endpointType: "openai-responses", defaultParams: { reasoning_effort: "low" } },
  { key: "openai.gpt-5.4-mini", displayName: "GPT-5.4 Mini", provider: "openai", category: "text", realModelId: "gpt-5.4-mini", endpointType: "openai-responses", defaultParams: { temperature: 0.7 } },
  { key: "deepseek.v4-flash", displayName: "DeepSeek V4 Flash", provider: "deepseek", category: "text", realModelId: "deepseek-v4-flash", endpointType: "deepseek-chat", defaultParams: { stream: false } },
  { key: "deepseek.v4-pro", displayName: "DeepSeek V4 Pro", provider: "deepseek", category: "text", realModelId: "deepseek-v4-pro", endpointType: "deepseek-chat", defaultParams: { stream: false, reasoning_effort: "high", thinking: { type: "enabled" } } },
  { key: "openai.gpt-image-2", displayName: "GPT Image 2", provider: "openai", category: "image", realModelId: "gpt-image-2", endpointType: "openai-images", supportsImages: true, supportsImageEdit: true, defaultParams: { size: "1024x1024", quality: "medium" } },
  { key: "google.gemini-3-pro-image-preview", displayName: "Nano Banana Pro", provider: "google", category: "image", realModelId: "gemini-3-pro-image-preview", endpointType: "gemini-generate-content", supportsImages: true, supportsImageEdit: true, defaultParams: { aspectRatio: "1:1", imageSize: "2K" } },
  { key: "google.gemini-3.1-flash-image-preview", displayName: "Nano Banana 2", provider: "google", category: "image", realModelId: "gemini-3.1-flash-image-preview", endpointType: "gemini-generate-content", supportsImages: true, supportsImageEdit: true, defaultParams: { aspectRatio: "1:1", imageSize: "2K" } },
  { key: "atlas.openai-gpt-image-2", displayName: "Atlas Cloud GPT Image 2", provider: "atlas", category: "image", realModelId: "openai/gpt-image-2/text-to-image", endpointType: "atlas-generate-image", supportsImages: true, supportsImageEdit: true, defaultParams: { size: "1024x1024", quality: "medium", output_format: "jpeg", enable_sync_mode: false, enable_base64_output: true } }
];

export function getModelByKey(key: string) {
  return MODEL_REGISTRY.find((model) => model.key === key);
}

export function listModelsByCategory(category: ModelCategory) {
  return MODEL_REGISTRY.filter((model) => model.category === category);
}
