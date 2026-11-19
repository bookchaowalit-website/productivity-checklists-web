import type { Tone } from "@/components/app-shell";
import type { Priority } from "@/lib/checklist";

/**
 * Priority pill colours, shared by server pages and the client list (not in a "use client" file).
 * Red means error/Down in the sibling apps, so High is amber and Medium/Low are grey; the text names the level.
 */
export const PRIORITY_TONE: Record<Priority, Tone> = { high: "amber", medium: "grey", low: "grey" };
