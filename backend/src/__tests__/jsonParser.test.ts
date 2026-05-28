import { describe, expect, it } from "vitest";

import { extractFirstJsonObject, parseModelJson } from "../utils/jsonParser.js";

describe("jsonParser", () => {
  it("extracts json from fenced markdown", () => {
    const input = '```json\n{"title":"Cyber Cat","panels":[1,2]}\n```';

    expect(extractFirstJsonObject(input)).toBe('{"title":"Cyber Cat","panels":[1,2]}');
  });

  it("parses json when surrounded by extra model text", () => {
    const input = 'Here is the result:\n{"story":"A cat hero","panelCount":4}\nHave fun!';

    expect(parseModelJson<{ story: string; panelCount: number }>(input)).toEqual({
      story: "A cat hero",
      panelCount: 4
    });
  });
});
