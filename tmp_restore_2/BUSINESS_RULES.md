# Lumen Asset LCM - Business Rules & Logic Inventory

This document outlines the business rules, validation logic, and behavioral definitions implemented in the Lumen Asset LCM application.

## 1. Rack Management Rules

### 1.1. Naming & Identification
*   **Standard Naming Convention**: `[LineUp].[BayNo]` (e.g., `001.001`).
*   **Full Location String**: `[SiteId].[Floor].[BuildingLabel].[Suite].[LineUp].[BayNo]`.
    *   Example: `CSRKCOCF.001.0010.0001.001.005`
*   **Default Values on Creation**:
    *   **ID**: `TEMP-[Increment]` (e.g., `TEMP-001`).
    *   **Line Up**: Defaults to `001`.
    *   **Bay Number**: Auto-increments based on the count of racks in the building, padded to 3 digits (e.g., `001` → `002`).

### 1.2. Array Cloning Logic
*   **Smart Labeling**: The cloner parses the visible label of the seed rack.
    *   If the label ends in a number (e.g., `RowA.005`), it increments that number (`RowA.006`) while preserving zero-padding.
    *   If no number is found, it appends `.001`.
*   **Spatial Placement**:
    *   Clones are placed perpendicular to the rack's facing direction.
    *   **Direction**: "Left" or "Right" is relative to the rack's front face.
    *   **Spacing**: User-defined in Feet + Inches (e.g., 2 ft 0 in).

### 1.3. Validation
*   **Required Fields**: `Line Up` and `Bay No` are mandatory.
*   **Duplicate Detection**: The system flags a rack as a **"DUP"** (Duplicate) if another rack in the same `Suite` has the same `Bay No`.
    *   Visual Indicator: Red border and "DUP" badge in the edit panel.

### 1.4. Dimensions & Movement
*   **Rack Dimensions**: Defined in `Admin Panel`. Stored internally in **Feet**.
*   **Nudge Controls**:
    *   Standard Nudge: **0.25 ft** (3 inches).
    *   Fast Nudge (Shift + Click): **1.0 ft** (12 inches).
*   **Rotation**: Constrained to **90-degree** increments (0°, 90°, 180°, 270°).

---

## 2. Asset & Equipment Rules

### 2.1. Equipment Placement
*   **U-Positioning**: Equipment is placed at a specific **RMU** (Rack Mount Unit) height (1-42).
*   **Validation**: Equipment cannot be placed outside the rack's total U-height (e.g., RMU 45 in a 42U rack).
*   **Dimensions**: Equipment depth is defined in inches but rendered to scale within the rack.

## 3. Inventory & Reconciliation (Data Logic)

### 3.1. CSV Processing Rules
*   **Header Detection**: The system automatically detects Granite vs. Generic CSVs by scanning headers for keywords:
    *   Granite: `BAY NAME`, `EQUIPMENT NAME`, `RACK ID`, `EQPT ID`.
    *   Generic: `ID`, `NAME`, `LOCATION`.
*   **Location Parsing**: The specific column `BAY NAME` is parsed to extract hierarchy:
    *   Format: `[Site].[Floor].[Building].[Suite].[LineUp].[BayNo]`
    *   Logic: Used to automatically permit "Smart Linking" to BIM objects.

### 3.2. Automated Reconciliation
*   **Suite Detection**: Racks do **not** rely on manual Suite entry. The system geometrically calculates which Suite (Polygon) a rack is physically inside.
    *   Rule: If a rack moves into a new Suite polygon, its `Suite` property and `Location` string update automatically.
*   **Linking Logic**:
    *   **BIM-Master**: The 3D Model (BIM) is the "Source of Truth" for physical location (X, Y, Z, Suite).
    *   **Pro-Inventory Master**: The CSV (Granite) is the "Source of Truth" for Asset IDs, Names, and Financial Status.
    *   **Sync Status**:
        *   **Verified**: BIM Item is explicitly linked to a Pro-Inventory ID.
        *   **Unsynced**: BIM Item exists physically but has no record in the Inventory system.

---

## 4. Visual & 4D Rules

### 4.1. Lifecycle States (4D)
Every asset has a lifecycle status that determines its color and visibility:
1.  **PROPOSED (Blue)**: Planned new installs.
2.  **RETAIN (Green)**: Existing assets to remain.
3.  **INSTALL (Cyan)**: Active installation phase.
4.  **DECOM (Red)**: Assets marked for removal.

### 4.2. View Modes & Camera
*   **Site Plan Grid**: Buildings snap to a **0.5 ft** grid to ensure alignment.
*   **Elevation Views**:
    *   **Filtered Scope**: When viewing an Elevation, the camera only renders racks belonging to the specific **Line Up** selected (e.g., "001").
    *   **Occlusion**: Assets from other lineups are hidden to prevent visual clutter.
    *   **Perspective**: Camera locks to a true orthographic-style projection facing the lineup.

---

## 5. System & Storage

### 5.1. Data Persistence
*   **Cloud Sync**: Changes are auto-saved to Supabase.
    *   Trigger: Any change to `sites`, `buildings`, or `racks` sets `isDirty = true`.
*   **Local Backup**:
    *   The application maintains a local storage mirror key `AMBIFLO_WORKSPACE_STABLE_V1`.
    *   **Legacy Unit Migration**: On load, if coordinates are detected in Millimeters (old format, >500 value), they are auto-converted to Feet (x 0.00328).

### 5.2. Safety Mechanisms
*   **Navigation Guard**: If a user tries to leave the page or switch sites while `Unsaved Changes` exist, a "Leave Confirmation" modal intercepts the action.
