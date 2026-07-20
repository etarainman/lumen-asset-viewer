# Lumen Asset Viewer — agent guide

## Ownership & branding — IMPORTANT
This project belongs to **Ambiflo**. It is **NOT an EnergyPro project.** The signed-in
account email (`ray.henry@energypro.ie`) and the account org "Energypro" are Ray's
separate day-job identity and are **incidental** — do not treat them as this project's
owner, client, or brand, and never reference EnergyPro in code, copy, commits, or docs.
When ownership/brand is relevant, it is Ambiflo.

## What this is
A React + TypeScript (Vite) PWA for viewing data-centre / infrastructure assets — 2D site
planner, 3D BIM viewer, 360° panorama, and a documents centre. It is an **app inside the
wider platform** (alongside ACC and Data Centre Viewer), so it should look and feel
consistent with the platform, not like a standalone product.

- Repo: `github.com/etarainman/lumen-asset-viewer`
- Hosting: Cloudflare Pages (config in `.wrangler`), Supabase backend
- Entry UI: `src/App.tsx`; feature code under `src/components`, `src/services`

## Run it locally
```
npm install      # first time only
npm run dev      # dev server on http://localhost:3001
```
Open http://localhost:3001 in a browser to preview. HMR reloads on save.

## Design system — FOLLOW THIS
This app uses the **platform palette** (light, clean, information-dense; Tailwind
slate + sky). Master reference: `C:\Users\RayHenry\Documents\DDS\docs\design-system.md`.

Core tokens:
```css
--accent:        #0ea5e9;   /* primary accent / active */
--accent-text:   #0369a1;   /* accent text on light blue */
--accent-tint:   #e0f2fe;   /* active surface tint */
--text-title:    #1e293b;
--text-body:     #475569;
--text-muted:    #94a3b8;
--text-faint:    #cbd5e1;
--border:        #e2e8f0;
--border-subtle: #f1f5f9;
--success:       #16a34a;   /* bright #22c55e, tint #f0fdf4, border #86efac */
--warning:       #f97316;
--danger:        #dc2626;
```
Do NOT use the Beyond Legacy Software brand colours here — that palette is for the
marketing site only.

## House rules
- **No block capitals anywhere** — Title Case only. (Fixed codes like site refs stay as stored.)
- Keep the existing dark 3D-viewer mode working when adding a light variant — prefer a toggle over a hard switch.
- Match the platform's type/spacing conventions: `C:\Users\RayHenry\Documents\DDS\projects\acc\pwa-workflow\docs\ui-style-conventions.md`.

## Working style
- For anything non-trivial, explain what you found and propose a plan BEFORE editing.
- Make the smallest change that achieves the goal; tell me how to preview it.
- After code changes, list the files you touched.

## Session handoff — STATUS.md
Read `STATUS.md` in this folder at the start of a session to see what's in progress and what's
next. When you finish or pause, update STATUS.md (what you did, what's next, any gotchas) with
the date + who. STATUS.md is the shared handoff point between Codex and Claude Code — keep it
current so either tool can pick up where the other left off.
