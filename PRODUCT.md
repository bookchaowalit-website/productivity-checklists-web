# Checklists (Preflight desk) — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `checklists`, evidence Live→Prototype: template
> creation, one-click duplication, shareable links, subtasks and reordering were removed) on 2026-10-23.

## What it is

A read-only shelf of three MDX checklists with a per-browser tick runner.

## Who it is for

The owner running a repeatable procedure (launch, content, interview), and a portfolio visitor looking at the UI.

## What works today

1. Home lists the three procedures by priority (high first) with check counts and searches titles, categories,
   descriptions and single checks; the old `/checklists` index redirects (308) to it.
2. `/checklists/<slug>` shows phases and checks; ticks persist per checklist in `localStorage`, saved progress is
   restored only when it still matches the phases, the meter never reads 100% with open checks, and "Reset run" clears.
3. `/api/mcp` answers JSON-RPC with `list_checklists`, `get_checklist` (by slug; unknown or unsafe slugs are an error)
   and `search_checklists`, all over the same MDX files.
4. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No template creation, editing, duplication, reordering, subtasks or public share links; content changes need a commit.
- No account or sync; progress lives in one browser. It does not certify safety or readiness.

## Known limits

- **Held Enter on Reset/Undo:** keyboard Reset moves focus to Undo and Undo returns it to Reset, so holding Enter lets
  key repeat toggle between clearing and restoring the run; the final state depends on when the key is released
  (Codex review 2026-11-19, accepted).
- **Undo countdown while focus rests on Undo:** focus the app moves to Undo after a keyboard Reset does not pause the
  8-second countdown; only hover, focus the person moves there or a key pressed in the toast does (decided semantics,
  2026-11-19). A screen-reader user who only listens has 8 seconds.
- **Repeated Reset announcement:** after the toast expires or is closed, the status region keeps "Undo is available";
  a second Reset sets the same text, so some screen readers do not announce it again (Codex review P3, accepted).
- **Focus after Undo expires:** focus moves to the first check of the first phase; a checklist whose first phase has
  no checks would drop focus to the page instead (none of the published checklists has one; Codex review P3, accepted).

## Live URL and deploy state

- Live: https://checklists.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-checklists-frontend` is deployed by CLI only. Its Git link names the old repository
  (`bookchaowalit/bookchaowalit-checklists-frontend`), so a push to `main` does not deploy. The last production deploy
  is 2026-10-08 (CLI, commit 4fe7eb7): the CVE patch deploy did not run because Vercel's free plan hit its
  100-deployments/day limit on 2026-10-23. The coordinator deploys the latest green `main` after the quota resets;
  reconnecting Vercel Git to this repository is owner action D9.
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `productivity-checklists-web`, org
  `personal-yu0`); it takes effect on the next deploy.

## Boundaries

- Content is static MDX in the repository; the only server code is the read-only `/api/mcp` route.
