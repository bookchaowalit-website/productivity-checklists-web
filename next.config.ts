import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The MCP route reads checklist MDX at request time; ship the files with it.
  outputFileTracingIncludes: {
    "/api/mcp": ["./content/checklists/**/*"],
  },
  // The old portfolio link page now lives on the main site.
  async redirects() {
    return [
      { source: "/more-projects", destination: "https://bookchaowalit.com/", permanent: true },
      // The home page is the one checklist index; /checklists showed the same list.
      { source: "/checklists", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
