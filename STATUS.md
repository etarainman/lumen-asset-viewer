# STATUS — Lumen Asset Viewer

_Last updated: 2026-07-17 by Claude Code_

## In progress
- Viewer-only **light/dark theme toggle** (Codex): theme context + persistence, platform
  tokens, a header toggle, and light mode for Viewer3D (scene.background, grid lines, CSS2D
  labels) + DefinitionPreview3D. Dark mode preserved exactly.

## DONE (2026-07-19, Claude Code) — Login gate + dataset separation
- **Login screen** (`components/LoginScreen.tsx`): password gate (`cloud`, or `VITE_APP_PASSWORD`)
  + Demo/Lumen dataset picker. App is gated behind it in `App.tsx` (`authed`/`customer` state);
  chosen dataset is **locked for the session** (reload returns to login — no in-app switch).
- **Dataset separation:** removed the old on-map customer selector AND the "Demo Sites On/Off"
  overlay toggle from `SiteMapView.tsx`. It now takes `overlayCustomer` as a prop. Each dataset
  is fully separate: DEMO = 787 demo pins only; LUMEN = the 3 real sites only, never mixed.
- Verified live on :3001 — wrong password rejected; Lumen → 3 real pins; Demo → 787; reload
  re-gates. Deployed via wrangler (see below).
- **Password is a soft client-side gate** (readable in JS) — not real auth. Fine for a demo
  gate; use Supabase auth if genuine access control is ever needed.

## Next up
- Verify the toggle in preview (http://localhost:3001) — check contrast/readability both modes.
- Later pass: extend light mode globally (header, panels, modals, map popups, admin screens).
- Parked: remove the committed backup-folder clutter (`tmp_backup_*`, `tmp_restore_*`,
  `restore_point_jan`, `backups`) from git + add to `.gitignore` — do as its own commit
  AFTER the theme work is committed.

## Notes / gotchas
- Ownership is **Ambiflo**, not EnergyPro (see AGENTS.md).
- Branch: `feat/dcv-demo-layer`.
- Platform palette: AGENTS.md + `C:\Users\RayHenry\Documents\DDS\docs\design-system.md`.

---
_How to use this file: whoever (Claude or Codex) picks up work here reads this first, and
updates it when finishing or pausing — what you did, what's next, any gotchas + date/who._
