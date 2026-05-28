export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export type AllowedPanelCount = 1 | 2 | 4 | 6 | 8;

export interface GenerateComicRequest {
  userPrompt: string;
  style: string;
  panelCount: AllowedPanelCount;
  aspectRatio: string;
  language: string;
  characters?: Array<Record<string, unknown>>;
  selectedCharacters?: Array<Record<string, unknown>>;
  customStyleImageBase64?: string;
  customStyleImageMimeType?: string;
  apiKey?: string;
  textApiKey?: string;
  imageApiKey?: string;
  textModel?: string;
  imageModel?: string;
  textModelKey?: string;
  imageModelKey?: string;
}

export interface StoryPanel {
  panel_number: number;
  title: string;
  narration: string;
  image_prompt: string;
}

export interface StoryboardResult {
  title: string;
  summary: string;
  style: string;
  language: string;
  panelCount: number;
  panels: StoryPanel[];
}

export interface GeneratedPanel extends StoryPanel {
  imageUrl: string;
  rawData?: {
    mimeType: string;
    data: string;
  };
}

export interface ComicTask {
  id: string;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  request: GenerateComicRequest;
  storyboard?: StoryboardResult;
  panels: GeneratedPanel[];
  error?: string;
  errorDetails?: unknown;
}

export interface TaskUpdate {
  status?: TaskStatus;
  progress?: number;
  storyboard?: StoryboardResult;
  panels?: GeneratedPanel[];
  error?: string;
  errorDetails?: unknown;
}
