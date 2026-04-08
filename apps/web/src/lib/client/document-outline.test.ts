// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { extractOutline, generateHeadingIdFromText } from "./document-outline";

describe("document-outline", () => {
  it("extracts headings directly from markdown content", () => {
    const outline = extractOutline(`# Draft Title\n\n## Live Section\n\n### Nested Topic\n\n## Second Section\n\n\`\`\`ts\n## Not a heading\n\`\`\``);

    expect(outline).toHaveLength(1);
    expect(outline[0]).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Draft Title", 0),
        level: 1,
        text: "Draft Title",
      })
    );
    expect(outline[0].children).toHaveLength(2);
    expect(outline[0].children[0]).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Live Section", 1),
        level: 2,
        text: "Live Section",
      })
    );
    expect(outline[0].children[0].children).toHaveLength(1);
    expect(outline[0].children[0].children[0]).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Nested Topic", 2),
        level: 3,
        text: "Nested Topic",
      })
    );
    expect(outline[0].children[1]).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Second Section", 3),
        level: 2,
        text: "Second Section",
      })
    );
  });

  it("generates deterministic unique ids for repeated markdown headings across h1 through h6", () => {
    const outline = extractOutline(`# Repeat\n\n## Repeat\n\n### Repeat\n\n#### Repeat\n\n##### Repeat\n\n###### Repeat`);

    expect(outline).toHaveLength(1);
    expect(outline[0]).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Repeat", 0),
        level: 1,
        text: "Repeat",
      })
    );

    const level2 = outline[0].children[0];
    const level3 = level2.children[0];
    const level4 = level3.children[0];
    const level5 = level4.children[0];
    const level6 = level5.children[0];

    expect(level2).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Repeat", 1),
        level: 2,
        text: "Repeat",
      })
    );
    expect(level3).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Repeat", 2),
        level: 3,
        text: "Repeat",
      })
    );
    expect(level4).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Repeat", 3),
        level: 4,
        text: "Repeat",
      })
    );
    expect(level5).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Repeat", 4),
        level: 5,
        text: "Repeat",
      })
    );
    expect(level6).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Repeat", 5),
        level: 6,
        text: "Repeat",
      })
    );
  });

  it("falls back to html headings when the content is already rendered", () => {
    const outline = extractOutline(`<article><h1 id="custom-id">Rendered Title</h1><h2>Rendered Child</h2></article>`);

    expect(outline).toEqual([
      expect.objectContaining({
        id: "custom-id",
        level: 1,
        text: "Rendered Title",
      }),
    ]);
    expect(outline[0].children[0]).toEqual(
      expect.objectContaining({
        id: generateHeadingIdFromText("Rendered Child", 1),
        level: 2,
        text: "Rendered Child",
      })
    );
  });
});
