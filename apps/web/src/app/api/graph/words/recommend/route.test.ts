import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("graph words recommend api", () => {
  it("returns 400 for missing wordId", async () => {
    const response = await GET(new Request("http://localhost/api/graph/words/recommend"));
    expect(response.status).toBe(400);
  });

  it("returns recommendations for valid wordId", async () => {
    const response = await GET(
      new Request("http://localhost/api/graph/words/recommend?wordId=cet4_0001&limit=3")
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });
});
