import { getAllChecklists } from "@/lib/mdx";
import { ChecklistIndex } from "@/components/checklist-ui";
import { PageFrame } from "@/components/page-frame";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All checklists",
  description: "Search every checklist and open one to run it.",
  alternates: { canonical: "/checklists" },
};

export default async function ChecklistsPage() {
  const checklists = await getAllChecklists();
  return (
    <PageFrame back={{ href: "/", label: "Home" }}>
      <header className="as-intro">
        <h1>All checklists</h1>
        <p>Every checklist, highest priority first.</p>
      </header>
      <ChecklistIndex checklists={checklists} />
      <p className="as-note">Your progress stays in this browser.</p>
    </PageFrame>
  );
}
