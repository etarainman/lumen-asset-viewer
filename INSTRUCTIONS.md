# Lumen Asset LCM - Development & Testing Guide

This document provides the specifications and testing instructions for the **Lumen Asset LCM** application, a 3D BIM-style viewer for Data Center asset lifecycle management.

## 1. Technical Stack
- **Framework**: React (ES6 Modules)
- **3D Engine**: Three.js (WebGL) + CSS2DRenderer for labels
- **2D Mapping**: Leaflet.js
- **Icons**: Lucide-React
- **Database/Cloud**: Supabase (via `supabase-js`)
- **AI Integration**: Google Gemini API (`@google/genai`)

## 2. Core Project Structure
- `App.tsx`: The main application controller, state management, and high-level UI.
- `types.ts`: TypeScript interfaces for the entire data model.
- `constants.ts`: Initial registry definitions (Buildings, Racks, Equipment) and color standards.
- `components/Viewer3D.tsx`: The primary 3D environment for building interiors.
- `components/SitePlanner2D.tsx`: The architectural layout planner for site footprints.
- `components/InventoryPanel.tsx`: The searchable, sortable ledger for assets.

## 3. Data Schema & Terminology
The application follows "PRO" terminology for asset localization:
- **CLLI**: City/Site identifier (e.g., `A0001`).
- **Building/Room**: 4-digit numeric label (e.g., `0002`).
- **Line Up**: 3-digit row identifier (e.g., `001`).
- **Bay No**: 3-digit rack position identifier (e.g., `005`).
- **RMU (Rack Mount Unit)**: The vertical position (U) of hardware within a rack.

### 4D Lifecycle Statuses
Assets are visualized using specific color codes:
- `RETAIN`: Gray (#94a3b8) - Existing equipment to keep.
- `REMOVE`: Red (#ef4444) - Decommissioning scheduled.
- `PROPOSED`: Green (#10b981) - New build design.
- `FUTURE`: Purple (#c084fc) - Long-term planning.
- `MODIFIED`: Amber (#f59e0b) - Changes to existing hardware.

## 4. Anti Gravity Testing Scenarios

### Scenario A: 3D Visualization
1. Navigate to a site from the global map.
2. Select a building and click **"VIEW 3D BIM MODEL"**.
3. **Verify**:
   - Orbit controls (rotate, zoom, pan).
   - Shell opacity slider (transparency of walls).
   - Rack labels and U-position indicators.
   - 4D Status filters (Toggle layers to hide/show specific asset types).

### Scenario B: Site Planning
1. Switch to **"DESIGN"** or **"EDIT"** mode at the Site level.
2. Open the **"+"** menu and select a building type.
3. **Verify**:
   - Ghost preview follows the cursor.
   - Grid snapping (50-unit increments).
   - Rotation via the 'R' key.
   - Persistence of placement after saving to cloud.

### Scenario C: Inventory Reconciliation
1. Open the **"Show Inventory"** panel.
2. Use the search filters to find a specific **PRO ID**.
3. **Verify**:
   - Sorting on "Line Up" and "Bay No" columns.
   - "Unsynced" status for items not yet verified.
   - Search highlighting for partial matches.

### Scenario D: AI Audit Intelligence
1. Open the **"Audit Review"** modal (if applicable).
2. Trigger the Gemini AI analysis.
3. **Verify**:
   - Successful connection to the Gemini API using `process.env.API_KEY`.
   - Generation of the "Executive Summary" based on current reconciliation statistics.

## 5. Deployment Notes
- Ensure the `metadata.json` includes `geolocation` permissions.
- The app expects a `workspaces` table in Supabase with `id` (text), `data` (jsonb), and `updated_at` (timestamptz) columns.
- The `index.html` uses an importmap for browser-native module resolution.
