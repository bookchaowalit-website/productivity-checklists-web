"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pill } from "@/components/app-shell";
import { checksLabel, countChecks, progressPercent, restoreProgress, searchChecklists } from "@/lib/checklist";
import type { Checklist } from "@/lib/checklist";
import { PRIORITY_TONE } from "@/components/priority";
/** Ticks in either run, so undoing a Reset never drops a tick made after it. */
const mergeTicks = (earlier: boolean[][] | null, later: boolean[][]) => (earlier ? later.map((row, i) => row.map((value, j) => value || Boolean(earlier[i]?.[j]))) : later);
const label = (value: string) => value[0].toUpperCase() + value.slice(1);

/** One checklist as a list row: title, description, category · checks, priority pill, chevron. */
export function ChecklistRow({ checklist }: { checklist: Checklist }) {
  const count = countChecks(checklist);
  return (
    <li>
      <Link href={`/checklists/${checklist.slug}`} className="as-row as-row-link">
        <div>
          <h2>{checklist.title}</h2>
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
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchChecklists(checklists, query), [checklists, query]);

  // No checklists published at all: nothing to search, so say so instead of "nothing matches".
  if (!checklists.length) {
    return (
      <div className="as-list as-empty">
        <strong>No checklists yet</strong>
        Checklists are published with this site’s content. When one is added it shows up here, ready to run.
      </div>
    );
  }

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <>
      <div className="as-head">
        <p aria-live="polite">{results.length} of {checklists.length} {checklists.length === 1 ? "checklist" : "checklists"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
        <label className="as-search">
          <span className="as-sr">Search checklists</span>
          <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search checklists" autoComplete="off" />
        </label>
      </div>
      {results.length ? (
        <ul className="as-list as-list-links" aria-label="Checklists">
          {results.map((checklist) => <ChecklistRow checklist={checklist} key={checklist.slug} />)}
        </ul>
      ) : (
        <div className="as-list as-empty">
          <strong>Nothing matches</strong>
          No checklist mentions “{query.trim()}”. Try another word.
          <div style={{ marginTop: 8 }}><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
        </div>
      )}
    </>
  );
}

/** Run a checklist: round checks per phase, progress, and Reset with a few seconds of Undo. */
export function ChecklistRunner({ checklist }: { checklist: Checklist }) {
  const sections = useMemo(() => checklist.items.map((section) => section.slice(1)), [checklist.items]);
  const blank = useMemo(() => sections.map((section) => section.map(() => false)), [sections]);
  // The ticks and the Undo snapshot live in one state, so Reset and Undo each read and write both in a
  // single update (never a stale render copy).
  const [run, setRun] = useState<{ checked: boolean[][]; undo: boolean[][] | null }>({ checked: blank, undo: null });
  const { checked, undo } = run;
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // The countdown pauses only for the person: a pointer resting on the toast, or focus/keys they moved there
  // themselves. Focus the app moves to Undo after a keyboard Reset does not pause it.
  const [hovered, setHovered] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const focusUndoNext = useRef(false);
  const programmaticFocus = useRef(false);
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
          setRun((current) => ({ ...current, checked: restored }));
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

  // Only a keyboard Reset moves focus to Undo (the focused Reset button turns disabled); a click or tap leaves
  // focus alone, so the toast simply counts down.
  useEffect(() => {
    if (!undo || !focusUndoNext.current) return;
    focusUndoNext.current = false;
    programmaticFocus.current = true;
    undoRef.current?.focus();
    programmaticFocus.current = false;
  }, [undo]);
  // The toast closes after 8 s unless the person is using it (hover, or focus/keys of their own). If focus was
  // still inside when it closes, it moves to the first step so the keyboard user is not dropped on <body>.
  useEffect(() => {
    if (!undo || hovered || userFocused) return;
    const timer = window.setTimeout(() => {
      const hadFocus = toastRef.current?.contains(document.activeElement) ?? false;
      setRun((current) => ({ ...current, undo: null }));
      setHovered(false);
      if (hadFocus) firstCheck.current?.focus();
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [undo, hovered, userFocused]);

  useEffect(() => {
    if (!focusResetNext.current) return;
    focusResetNext.current = false;
    resetRef.current?.focus();
  }, [checked]);

  // While the toast shows, reserve its height (plus its 24px offset and a gap) at the bottom of the page and in
  // scroll-padding, so a link or check focused behind it (e.g. Source in the footer) scrolls clear of it.
  const toastShown = undo !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    const reserve = () => rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    reserve();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reserve) : null;
    observer?.observe(toast);
    return () => { observer?.disconnect(); rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);

  const total = sections.reduce((sum, section) => sum + section.length, 0);
  const complete = checked.reduce((sum, section) => sum + section.filter(Boolean).length, 0);
  const progress = progressPercent(complete, total);

  function toggle(sectionIndex: number, itemIndex: number) {
    setRun((current) => ({ ...current, checked: current.checked.map((row, rowIndex) => rowIndex === sectionIndex ? row.map((value, valueIndex) => valueIndex === itemIndex ? !value : value) : row) }));
  }
  function reset(viaKeyboard: boolean) {
    focusUndoNext.current = viaKeyboard;
    // A second Reset inside the Undo window keeps the first one's ticks in the snapshot too.
    setRun((current) => ({ checked: blank, undo: mergeTicks(current.undo, current.checked) }));
    setAnnouncement("Run reset. Undo is available for a few seconds.");
  }
  function restore() {
    // Undo only the Reset: bring the earlier ticks back and keep any ticks made since.
    setRun((current) => ({ checked: mergeTicks(current.undo, current.checked), undo: null }));
    setUserFocused(false);
    setHovered(false);
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
        <button ref={resetRef} type="button" className="as-plain" onClick={(event) => reset(event.detail === 0)} disabled={complete === 0}>Reset</button>
        <div className="as-progress" role="progressbar" aria-label={`${progress}% complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
      </div>
      {/* Right after Reset in the DOM (it is shown fixed at the bottom), so Tab from Undo goes on to
          the first check instead of jumping past the whole list. */}
      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {undo ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo reset"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => { if (!programmaticFocus.current) setUserFocused(true); }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setUserFocused(false); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setRun((current) => ({ ...current, undo: null })); setUserFocused(false); setHovered(false); firstCheck.current?.focus(); return; }
            // A key pressed in the toast is the person using it: hold the countdown.
            setUserFocused(true);
          }}
        >
          <span>Run reset</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={restore}>Undo</button>
        </div>
      ) : null}

      {sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="as-phase" aria-labelledby={`phase-${sectionIndex}`}>
          <h2 id={`phase-${sectionIndex}`}>
            {checklist.items[sectionIndex]?.[0] || `Phase ${sectionIndex + 1}`}
            {/* Per-phase progress stays in view as the reader scrolls past the top progress card. */}
            <span className="as-phase-count"> · {checked[sectionIndex]?.filter(Boolean).length ?? 0}/{section.length}<span className="as-sr"> done</span></span>
          </h2>
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

    </div>
  );
}
