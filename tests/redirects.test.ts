import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("next.config redirects", () => {
  it("sends the retired /more-projects page to the portfolio hub for good", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/more-projects", destination: "https://bookchaowalit.com/", permanent: true });
  });

  it("folds the old /checklists index into the home page", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/checklists", destination: "/", permanent: true });
  });
});
