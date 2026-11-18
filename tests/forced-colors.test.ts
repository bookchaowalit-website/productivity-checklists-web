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
