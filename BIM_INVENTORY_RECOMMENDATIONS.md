# BIM Inventory Table Recommendations

Based on the review of `suites logic.txt` and `Pro Inventory Supplied CSV file.csv`, here are the recommended changes to the BIM Inventory Table (`InventoryPanel.tsx`) and data processing logic.

## 1. Data Parsing Enhancements
The CSV file contains rich location data in the `BAY NAME` column (e.g., `CSRKCOCF.001.0001..001.001`).
- **Current Parsing**: Extracts `LineUp` (Index 4) and `BayNo` (Index 5).
- **Recommendation**: Update the parser to extracting:
  - **Suite** (Index 2, e.g., `0001` or `0000`).
  - **Building/Floor** (Index 1, e.g., `001`).
  - **CLLI** (Index 0, e.g., `CSRKCOCF`).

## 2. Table Structure Updates
To support Site-Level reconciliation and the "Suites" logic, the Inventory Table should be expanded with new columns:

| Column | Source (BIM) | Source (PRO) | Purpose |
|--------|--------------|--------------|---------|
| **Building** | `Building.label` | Parsed from CSV or `CLLI` | Essential for Site-Wide views to distinguish assets in different buildings. |
| **Suite** | **Calculated** (Geometry check of Rack vs Suite Polygons) | Parsed from CSV (`0001`) | **Critical Source of Truth**. Allows detecting mismatches where PRO expects a suite that was removed on site. |
| **Line Up** | `Rack.lineUp` | Parsed (`001`) | Core location Match key. |
| **Bay No** | `Rack.bayNo` | Parsed (`001`) | Core location Match key. |

## 3. Visual Indicators & Logic
- **Suite Discrepancy**: Highlight rows where `BIM.Suite` !== `PRO.Suite`.
  - *Scenario*: PRO shows Suite `0001`, but BIM shows `No Suite` (or `Open Area`). This indicates the suite was removed on site, confirming the logic requirement.
- **Duplicate Warnings**:
  - If multiple PRO records map to the same `LineUp/Bay` (because they had different Suites in PRO, but ignoring Suite makes them collide in BIM), these rows should be flagged in **Red**.

## 4. Reconciliation Logic
- **Import Check**: As requested, upon import, run a check:
  - `IF (PRO.Suites exist) AND (BIM.Suites !exist or mismatch)`, prompt User:
    - **Cancel**: To go back and fix BIM Suites.
    - **Proceed**: Acknowledgement that BIM is correct (Suites removed).
- **Source of Truth Enforcement**:
  - Validated that `handleLinkInventory` now correctly respects BIM as Master for Location (Suite, LineUp, Bay) and PRO as Master for IDs/Names.

## Next Steps
- Implement the `Suite` parsing in `handleFileUpload`.
- calculate `Suite` for BIM items in `InventoryPanel`.
- Add columns to the table.
