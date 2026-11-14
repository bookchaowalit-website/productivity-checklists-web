// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChecklistIndex, ChecklistRunner } from "@/components/checklist-ui";
import type { Checklist } from "@/lib/checklist";

// Mounted tests for the App-shell checklist index (search) and runner (ticks, progress, reset + undo).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const sample = (slug: string, title: string, priority: Checklist["priority"], items: string[][]): Checklist => ({ id: slug, slug, title, category: "work", description: `${title} steps`, priority, items });
const launch = sample("launch", "Project Launch", "high", [["Prepare", "Write notes", "Book room"], ["Ship", "Deploy"]]);
const interview = sample("interview", "Job Interview", "medium", [["Research", "Read the posting"]]);

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
function mount(node: React.ReactNode) { act(() => root.render(node)); }
function type(el: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const tick = (label: string) => act(() => { $<HTMLInputElement>(`input[aria-label="${label}"]`)!.click(); });

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("ChecklistIndex", () => {
  it("lists every checklist with a priority pill and filters by search, with a no-match state", () => {
    mount(<ChecklistIndex checklists={[launch, interview]} />);
    expect([...host.querySelectorAll(".as-row h3")].map((h) => h.textContent)).toEqual(["Project Launch", "Job Interview"]);
    expect($('a[href="/checklists/launch"] .as-pill')!.textContent).toBe("High");
    type($<HTMLInputElement>("input[type=search]")!, "posting");
    expect([...host.querySelectorAll(".as-row h3")].map((h) => h.textContent)).toEqual(["Job Interview"]);
    expect(host.textContent).toContain("1 of 2 checklists matching “posting”");
    type($<HTMLInputElement>("input[type=search]")!, "zzz");
    expect(host.textContent).toContain("Nothing matches");
  });
});

describe("ChecklistRunner", () => {
  it("ticks steps, shows progress and saves the run", () => {
    mount(<ChecklistRunner checklist={launch} />);
    expect($("[role=progressbar]")!.getAttribute("aria-valuenow")).toBe("0");
    expect($<HTMLButtonElement>(".as-progress-card button")!.disabled).toBe(true);
    tick("Write notes");
    tick("Deploy");
    expect(host.textContent).toContain("2 of 3 checks clear");
    expect($("[role=progressbar]")!.getAttribute("aria-valuenow")).toBe("66");
    expect(JSON.parse(localStorage.getItem("checklist-progress-v2-launch")!)).toEqual([[true, false], [true]]);
  });

  it("restores a saved run and drops a saved run of the wrong shape", () => {
    localStorage.setItem("checklist-progress-v2-launch", JSON.stringify([[true, true], [true]]));
    mount(<ChecklistRunner checklist={launch} />);
    expect(host.textContent).toContain("3 of 3 checks clear");
    act(() => root.unmount());
    root = createRoot(host);
    localStorage.setItem("checklist-progress-v2-interview", JSON.stringify([[true, true]]));
    mount(<ChecklistRunner checklist={interview} />);
    expect(host.textContent).toContain("0 of 1 check clear");
  });

  it("Reset clears the run, focuses Undo, and Undo brings the ticks back and returns focus to Reset", () => {
    mount(<ChecklistRunner checklist={launch} />);
    tick("Write notes");
    act(() => { $<HTMLButtonElement>(".as-progress-card button")!.click(); });
    expect(host.textContent).toContain("0 of 3 checks clear");
    expect(document.activeElement?.textContent).toBe("Undo");
    act(() => { $<HTMLButtonElement>(".as-toast button")!.click(); });
    expect(host.textContent).toContain("1 of 3 checks clear");
    expect(document.activeElement?.textContent).toBe("Reset");
  });

  it("Escape closes the undo toast; it also goes away after eight seconds", () => {
    mount(<ChecklistRunner checklist={launch} />);
    tick("Deploy");
    act(() => { $<HTMLButtonElement>(".as-progress-card button")!.click(); });
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
    expect(host.textContent).toContain("0 of 3 checks clear");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Write notes");

    vi.useFakeTimers();
    tick("Deploy");
    act(() => { $<HTMLButtonElement>(".as-progress-card button")!.click(); });
    act(() => { vi.advanceTimersByTime(8000); });
    expect($(".as-toast")).toBeNull();
  });
});
