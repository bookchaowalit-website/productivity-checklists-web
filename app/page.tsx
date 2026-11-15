import { getAllChecklists } from "@/lib/mdx";
import { ChecklistIndex } from "@/components/checklist-ui";
import { PageFrame } from "@/components/page-frame";

export default async function Home() {
  const checklists = await getAllChecklists();
  return (
    <PageFrame>
      <header className="as-intro">
        <h1>Checklists</h1>
        <p>Step-by-step checklists for launches, interviews and content work. Open one and tick it off as you go.</p>
      </header>
      <ChecklistIndex checklists={checklists} />
      <p className="as-note">Checklists are read from this site’s content; your progress stays in this browser.</p>
    </PageFrame>
  );
}
