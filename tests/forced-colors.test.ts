import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Forced colors replace the blue fill of a ticked check but keep its white SVG tick, so the custom
// check must give way to the native checkbox there (Codex review, 2026-11-18).
describe("round checks in forced colors", () => {
  it("show the native checkbox and hide the custom circle", () => {
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    const start = css.indexOf("@media (forced-colors: active)");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("\n}\n", start));
    expect(block).toMatch(/\.as-check input \{[^}]*opacity: 1/);
    expect(block).toMatch(/\.as-check span \{[^}]*display: none/);
  });
});

describe("round check focus ring", () => {
  it("does not depend on :has() (a sibling rule draws it too)", () => {
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    // Its own rule, not in a list with :has() (an unsupported selector would drop the whole list).
    expect(css).toMatch(/\n\.as-check input:focus-visible \+ span \{ outline: 3px solid var\(--as-focus\)/);
  });
});

describe("progress bar in forced colors", () => {
  it("paints the track and the fill with different system colours, declared after the base rules", () => {
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    const baseTrack = css.indexOf("\n.as-progress {");
    const baseFill = css.indexOf("\n.as-progress span {");
    const forced = css.indexOf("@media (forced-colors: active)", Math.max(baseTrack, baseFill));
    expect(baseTrack).toBeGreaterThan(-1);
    expect(baseFill).toBeGreaterThan(-1);
    expect(forced).toBeGreaterThan(-1);
    const block = css.slice(forced, css.indexOf("\n}\n", forced));
    expect(block).toMatch(/\.as-progress \{[^}]*forced-color-adjust: none[^}]*background: Canvas[^}]*border: 1px solid CanvasText/);
    expect(block).toMatch(/\.as-progress span \{[^}]*background: Highlight/);
    // No later plain rule may set the progress backgrounds again.
    expect(css.slice(forced + block.length)).not.toMatch(/\n\.as-progress( span)? \{[^}]*background/);
  });
});

describe("empty state wrapping", () => {
  it("a long unbroken search term wraps inside the no-match box (the list clips overflow)", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    const at = css.indexOf(".as-empty {");
    expect(css.slice(at, css.indexOf("}", at))).toContain("overflow-wrap: anywhere");
  });
});
