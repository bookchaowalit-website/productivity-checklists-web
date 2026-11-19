import { notFound } from "next/navigation";
import { getAllChecklists, getChecklistBySlug } from "@/lib/mdx";
import { ChecklistRunner } from "@/components/checklist-ui";
import { PRIORITY_TONE } from "@/components/priority";
import { Pill } from "@/components/app-shell";
import { PageFrame } from "@/components/page-frame";
import { countChecks } from "@/lib/checklist";
import type { Metadata } from "next";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const checklist = await getChecklistBySlug(slug);
  if (!checklist) return {};
  return {
    title: `${checklist.title} — Checklist`,
    description: checklist.description,
    alternates: { canonical: `/checklists/${checklist.slug}` },
    openGraph: { title: checklist.title, description: checklist.description, url: `/checklists/${checklist.slug}` },
  };
}

export async function generateStaticParams() { const checklists = await getAllChecklists(); return checklists.map((checklist) => ({ slug: checklist.slug })); }

export default async function ChecklistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const checklist = await getChecklistBySlug(slug);
  if (!checklist) notFound();
  const count = countChecks(checklist);
  const label = (value: string) => value[0].toUpperCase() + value.slice(1);
  return (
    <PageFrame back={{ href: "/", label: "All checklists" }}>
      <header className="as-intro">
        <p className="as-eyebrow">{label(checklist.category)} · {count} {count === 1 ? "check" : "checks"} in {checklist.items.length} {checklist.items.length === 1 ? "phase" : "phases"}</p>
        <h1>{checklist.title}</h1>
        <p>{checklist.description}</p>
        <Pill tone={PRIORITY_TONE[checklist.priority]}>{label(checklist.priority)} priority</Pill>
      </header>
      <ChecklistRunner checklist={checklist} />
      <p className="as-note">A personal working aid. It does not certify safety, readiness, or completion outside this browser.</p>
    </PageFrame>
  );
}
