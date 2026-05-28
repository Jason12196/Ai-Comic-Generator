import type { GenerateComicRequest, StoryPanel } from "../types/index.js";
import type { ImagePromptPart } from "../providers/types.js";

function getCharacterSource(input: GenerateComicRequest) {
  if (Array.isArray(input.selectedCharacters) && input.selectedCharacters.length > 0) {
    return input.selectedCharacters;
  }

  if (Array.isArray(input.characters) && input.characters.length > 0) {
    return input.characters;
  }

  return [];
}

function buildCharacterContext(input: GenerateComicRequest) {
  const characters = getCharacterSource(input);
  if (characters.length === 0) {
    return null;
  }

  const summaries = characters.map((character, index) => {
    const name = typeof character.name === "string" ? character.name : `Character ${index + 1}`;
    const role = typeof character.role === "string" ? character.role : "unknown role";
    const species = typeof character.species === "string" ? character.species : "unknown species";
    const visualEnergy = typeof character.visual_energy_profile === "string" ? character.visual_energy_profile : "";
    const traits = Array.isArray(character.distinct_physical_traits)
      ? character.distinct_physical_traits.filter((item): item is string => typeof item === "string")
      : [];

    return [
      `Name: ${name}`,
      `Role: ${role}`,
      `Species: ${species}`,
      traits.length > 0 ? `Traits: ${traits.join(", ")}` : null,
      visualEnergy ? `Visual energy: ${visualEnergy}` : null
    ].filter(Boolean).join(" | ");
  });

  return `Characters:\n${summaries.map((line) => `- ${line}`).join("\n")}`;
}

function buildCharacterReferenceBlock(input: GenerateComicRequest) {
  const characters = getCharacterSource(input);
  if (characters.length === 0) {
    return "";
  }

  const lines = characters.slice(0, 5).map((character, index) => {
    const name = typeof character.name === "string" ? character.name : `Character ${index + 1}`;
    return `- Character Name: "${name}". This is Reference Image ${index + 1}. You MUST strictly copy their exact facial features, hair, clothing, etc.`;
  });

  return `CRITICAL CHARACTER REFERENCES:\n${lines.join("\n")}`;
}

function getInlineDataFromCharacter(character: Record<string, unknown>) {
  const candidate = typeof character.avatar === "string" && character.avatar.startsWith("data:")
    ? character.avatar
    : typeof character.designSheet === "string" && character.designSheet.startsWith("data:")
      ? character.designSheet
      : null;

  if (!candidate) {
    return null;
  }

  const [metadata, data] = candidate.split(",", 2);
  const mimeType = metadata?.split(":")[1]?.split(";")[0];
  if (!mimeType || !data) {
    return null;
  }

  return { mimeType, data };
}

export function buildStoryboardPrompt(input: GenerateComicRequest): string {
  const characterContext = buildCharacterContext(input);

  return [
    "You are a comic storyboard writer.",
    "Return valid JSON only.",
    `Story: ${input.userPrompt}`,
    `Style: ${input.style}`,
    `Panel count: ${input.panelCount}`,
    `Aspect ratio: ${input.aspectRatio}`,
    `Language: ${input.language}`,
    characterContext
  ].filter(Boolean).join("\n");
}

export function buildPanelImagePrompt(panel: StoryPanel, style: string, aspectRatio: string): string {
  return [
    `Create a comic panel in ${style} style.`,
    `Aspect ratio: ${aspectRatio}.`,
    `Panel title: ${panel.title}.`,
    `Narration: ${panel.narration}.`,
    `Scene: ${panel.image_prompt}.`
  ].join(" ");
}

export function buildPanelImageParts(input: {
  request: GenerateComicRequest;
  panel: StoryPanel;
  style: string;
  previousPanelData?: { mimeType: string; data: string } | null;
}): ImagePromptPart[] {
  const characterReferenceBlock = buildCharacterReferenceBlock(input.request);
  const parts: ImagePromptPart[] = [{
    text: [
      "[CHARACTER REFERENCES]",
      characterReferenceBlock || "No character reference images provided.",
      "[ART STYLE OVERRIDE]",
      `Render in style: ${input.style}.`,
      "NO WATERMARKS, NO SIGNATURES, NO LOGOS.",
      "[PAGE INSTRUCTIONS]",
      `Page ${input.panel.panel_number}.`,
      `Action & Environment: ${input.panel.narration}`,
      `Dialogue (draw speech bubbles): "${input.panel.title || "None"}"`,
      "Panel Count: 1",
      `Layout Logic: ${input.panel.image_prompt}`
    ].join("\n")
  }];

  if (input.request.customStyleImageBase64 && input.request.customStyleImageMimeType) {
    parts.push({
      text: "Use the following image as a STRICT GLOBAL ART STYLE AND COLOR REFERENCE. Do NOT copy the action, ONLY art style and rendering technique:"
    });
    parts.push({
      inlineData: {
        mimeType: input.request.customStyleImageMimeType,
        data: input.request.customStyleImageBase64
      }
    });
  }

  if (input.previousPanelData?.data && input.previousPanelData.mimeType) {
    parts.push({
      text: "Use the following image as a STRICT STYLE AND ATMOSPHERE REFERENCE for continuity. Do NOT copy the action, ONLY art style:"
    });
    parts.push({
      inlineData: input.previousPanelData
    });
  }

  getCharacterSource(input.request)
    .slice(0, 5)
    .map(getInlineDataFromCharacter)
    .filter((item): item is { mimeType: string; data: string } => Boolean(item))
    .forEach((inlineData) => {
      parts.push({ inlineData });
    });

  return parts;
}

export function buildStoryboardSystemPrompt() {
  return "Generate a comic storyboard as strict JSON with title, summary, style, language, panelCount, and panels.";
}
