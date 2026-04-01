import { describe, it, expect } from "vitest";
import { convertWorkbook } from "../index.js";
import { buildWorkbook, normalise } from "./helpers.js";

describe("paragraph rendering", () => {
  it("renders a single text cell as a paragraph", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["Hello, world!"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(normalise(markdown)).toBe("Hello, world!");
  });

  it("renders multiple text rows as separate paragraphs", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["First paragraph"], ["Second paragraph"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(normalise(markdown)).toContain("First paragraph");
    expect(normalise(markdown)).toContain("Second paragraph");
  });

  it("mixes text and table content in order", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["Introduction text"],
          [undefined],
          ["Name", "Score"],
          ["Alice", 95],
          ["Bob", 87],
          [undefined],
          ["Conclusion text"],
        ],
      },
    ]);
    const { sheets } = convertWorkbook(wb);
    const regions = sheets[0].regions;
    expect(regions[0].type).toBe("paragraph");
    expect(regions[1].type).toBe("table");
    expect(regions[2].type).toBe("paragraph");
  });
});
