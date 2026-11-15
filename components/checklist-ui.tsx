"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pill } from "@/components/app-shell";
import { checksLabel, countChecks, progressPercent, restoreProgress, searchChecklists } from "@/lib/checklist";
import type { Checklist } from "@/lib/checklist";
import { PRIORITY_TONE } from "@/components/priority";
const label = (value: string) => value[0].toUpperCase() + value.slice(1);

/** One checklist as a list row: title, description, category · checks, priority pill, chevron. */
export function ChecklistRow({ checklist }: { checklist: Checklist }) {
  const count = countChecks(checklist);
  return (
    <li>
      <Link href={`/checklists/${checklist.slug}`} className="as-row as-row-link">
        <div>
          <h3>{checklist.title}</h3>
          <p>{checklist.description}</p>
          <p className="as-row-meta">{label(checklist.category)} · {count} {count === 1 ? "check" : "checks"}</p>
        </div>
        <Pill tone={PRIORITY_TONE[checklist.priority]}>{label(checklist.priority)}</Pill>
        <span className="as-chevron" aria-hidden="true">›</span>
      </Link>
    </li>
  );
}

export function ChecklistIndex({ checklists }: { checklists: Checklist[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchChecklists(checklists, query), [checklists, query]);

  return (
    <>
      <div className="as-head">
        <p aria-live="polite">{results.length} of {checklists.length} {checklists.length === 1 ? "checklist" : "checklists"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
        <label className="as-search">
          <span className="as-sr">Search checklists</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search checklists" autoComplete="off" />
        </label>
      </div>
      {results.length ? (
        <ul className="as-list as-list-links" aria-label="Checklists">
          {results.map((checklist) => <ChecklistRow checklist={checklist} key={checklist.slug} />)}
        </ul>
      ) : (
        <div className="as-list as-empty"><strong>Nothing matches</strong>No checklist mentions “{query.trim()}”. Try another word.</div>
      )}
    </>
  );
}

/** Run a checklist: round checks per phase, progress, and Reset with a few seconds of Undo. */
export function ChecklistRunner({ checklist }: { checklist: Checklist }) {
  const sections = useMemo(() => checklist.items.map((section) => section.slice(1)), [checklist.items]);
  const blank = useMemo(() => sections.map((section) => section.map(() => false)), [sections]);
  const [checked, setChecked] = useState<boolean[][]>(blank);
  const [ready, setReady] = useState(false);
  const [undo, setUndo] = useState<boolean[][] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [toastFocused, setToastFocused] = useState(false);
  const undoRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  // Reset is disabled until the restored ticks render, so focus it after that render, not inline.
  const focusResetNext = useRef(false);
  // After dismissing the toast the run stays cleared and Reset is disabled, so focus the first step.
  const firstCheck = useRef<HTMLInputElement>(null);
  const storageKey = `checklist-progress-v2-${checklist.slug}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        // Hydrate a saved run after the server-rendered empty checklist.
        const restored = restoreProgress(JSON.parse(saved) as unknown, sections.map((section) => section.length));
        if (restored) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setChecked(restored);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch { /* A fresh run is a valid fallback. */ }
    setReady(true);
  }, [sections, storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch { /* Storage can be full or blocked; the run still works in memory. */ }
  }, [checked, ready, storageKey]);

  useEffect(() => { if (undo) undoRef.current?.focus(); }, [undo]);
  // The toast closes after 8 s, but never while it holds focus (it would drop the keyboard user).
  useEffect(() => {
    if (!undo || toastFocused) return;
    const timer = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undo, toastFocused]);

  useEffect(() => {
    if (!focusResetNext.current) return;
    focusResetNext.current = false;
    resetRef.current?.focus();
  }, [checked]);

  const total = sections.reduce((sum, section) => sum + section.length, 0);
  const complete = checked.reduce((sum, section) => sum + section.filter(Boolean).length, 0);
  const progress = progressPercent(complete, total);

  function toggle(sectionIndex: number, itemIndex: number) {
    setChecked((current) => current.map((row, rowIndex) => rowIndex === sectionIndex ? row.map((value, valueIndex) => valueIndex === itemIndex ? !value : value) : row));
  }
  function reset() {
    setUndo(checked);
    setChecked(blank);
    setAnnouncement("Run reset. Undo is available for a few seconds.");
  }
  function restore() {
    if (undo) setChecked(undo);
    setUndo(null);
    setToastFocused(false);
    setAnnouncement("Run restored.");
    focusResetNext.current = true;
  }

  return (
    <div className="as-run">
      <div className="as-progress-card">
        <div className="as-progress-text">
          <strong>{progress}%</strong>
          <span aria-live="polite">{checksLabel(complete, total)}</span>
        </div>
        <button ref={resetRef} type="button" className="as-plain" onClick={reset} disabled={complete === 0}>Reset</button>
        <div className="as-progress" role="progressbar" aria-label={`${progress}% complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
      </div>

      {sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="as-phase" aria-labelledby={`phase-${sectionIndex}`}>
          <h2 id={`phase-${sectionIndex}`}>{checklist.items[sectionIndex]?.[0] || `Phase ${sectionIndex + 1}`}</h2>
          <ul className="as-list">
            {section.map((item, itemIndex) => {
              const done = checked[sectionIndex]?.[itemIndex] ?? false;
              return (
                <li className="as-row as-row-step" key={`${itemIndex}-${item}`} data-done={done ? "true" : undefined}>
                  {/* The whole row is the label, so tapping the step text ticks it too. */}
                  <label className="as-step-label">
                    <span className="as-check">
                      <input ref={sectionIndex === 0 && itemIndex === 0 ? firstCheck : undefined} type="checkbox" checked={done} onChange={() => toggle(sectionIndex, itemIndex)} />
                      <span aria-hidden="true" />
                    </span>
                    <span className="as-step-text">{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {undo ? (
        <div
          className="as-toast"
          role="group"
          aria-label="Undo reset"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { setUndo(null); setToastFocused(false); firstCheck.current?.focus(); } }}
        >
          <span>Run reset</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={restore}>Undo</button>
        </div>
      ) : null}
    </div>
  );
}
