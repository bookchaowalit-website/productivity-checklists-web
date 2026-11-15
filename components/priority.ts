import type { Tone } from "@/components/app-shell";
import type { Priority } from "@/lib/checklist";

/** Priority pill colours, shared by server pages and the client list (not in a "use client" file). */
export const PRIORITY_TONE: Record<Priority, Tone> = { high: "red", medium: "amber", low: "grey" };
