export function extractFirstJsonObject(input: string): string {
  const fencedMatch = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return input.slice(start, end + 1).trim();
}

export function parseModelJson<T>(input: string): T {
  const jsonText = extractFirstJsonObject(input);
  return JSON.parse(jsonText) as T;
}
