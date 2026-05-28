export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ImagePromptPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface TextGenerationResult {
  text: string;
  raw: unknown;
}

export interface ImageGenerationResult {
  images: string[];
  raw: unknown;
}
