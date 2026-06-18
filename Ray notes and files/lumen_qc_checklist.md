# Lumen Asset LCM — Quality Control Checklist
**Scope:** Site Visit → Digital Capture → CAD Update → Inventory Correction
**Prepared by:** [Your Company]
**Version:** 1.0 | February 2026

---

## Phase 1 — Field Data Capture

> [!IMPORTANT]
> All field checks must be completed and signed off before the site team departs the facility.

### 1.1 Site Access & Safety
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 1.1.1 | Site access authorisation confirmed (escort, badge, permit) | | |
| 1.1.2 | ESD, PPE and safety requirements met for data centre environment | | |
| 1.1.3 | Work order / MOP approved and on file | | |

### 1.2 Photography
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 1.2.1 | Every room / suite covered with full-aisle front and rear shots | | |
| 1.2.2 | Every rack face photographed (front & rear where accessible) | | |
| 1.2.3 | Rack ID labels clearly visible and legible in at least one photo | | |
| 1.2.4 | Close-up shots captured for equipment without clear ID labels | | |
| 1.2.5 | Floor plan reference markers (column IDs, room signs) photographed | | |
| 1.2.6 | Images reviewed on-site for focus, exposure and coverage gaps | | |
| 1.2.7 | Photos geo-tagged or labelled by suite / lineup / bay | | |

### 1.3 360° VR Tour
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 1.3.1 | All modelled suites / rooms have at least one 360 capture point | | |
| 1.3.2 | Capture points positioned to provide unobstructed aisle views | | |
| 1.3.3 | VR tour stitched and reviewed for gaps or distortion before leaving site | | |
| 1.3.4 | VR tour provides navigable path through every modelled area | | |
| 1.3.5 | VR capture metadata (date, suite, operator) recorded | | |

### 1.4 Physical Inventory Verification
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 1.4.1 | Rack count per suite matches the PRO Inventory CSV | | |
| 1.4.2 | Rack Line Up and Bay No labels verified against physical labels | | |
| 1.4.3 | Equipment occupancy spot-checked (≥ 20% of racks audited for U-count) | | |
| 1.4.4 | Rack orientation (front-facing direction) recorded for each lineup | | |
| 1.4.5 | Any racks present on-site but absent from PRO Inventory flagged | | |
| 1.4.6 | Any racks in PRO Inventory but absent on-site flagged | | |

---

## Phase 2 — CAD Floor Plan Update

> [!NOTE]
> CAD checks are performed against the site photography and the 3D BIM model in the Lumen Asset LCM viewer.

### 2.1 Spatial Accuracy
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 2.1.1 | Floor plan scale validated against known reference dimensions (column grid, room perimeter) | | |
| 2.1.2 | All structural columns, walls and raised-floor boundaries updated to reflect site reality | | |
| 2.1.3 | Room / suite boundaries updated where changes observed on-site | | |
| 2.1.4 | Aisle widths consistent with site photographs | | |

### 2.2 Rack Layout
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 2.2.1 | All rack positions plotted in CAD match on-site photograph evidence | | |
| 2.2.2 | Rack lineup numbering in CAD matches physical signage | | |
| 2.2.3 | Rack bay numbering in CAD matches physical labels | | |
| 2.2.4 | Rack orientation arrows (front-face direction) correct in BIM 3D viewer | | |
| 2.2.5 | Racks added to CAD where present on-site but previously missing | | |
| 2.2.6 | Racks removed from CAD where confirmed decommissioned on-site | | |

### 2.3  3D BIM Model Consistency
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 2.3.1 | 3D model rack dimensions match rack definition (W × D × H in BIM viewer) | | |
| 2.3.2 | Building / suite assignments in BIM model match CAD floor plan | | |
| 2.3.3 | No duplicate rack addresses (Line Up + Bay) exist in the Alerts panel | | |
| 2.3.4 | Stakeholder (Lumen / Customer) assignments verified against site evidence | | |
| 2.3.5 | Floor plan PDF overlay aligns with 3D rack positions in BIM viewer | | |

---

## Phase 3 — Inventory Reconciliation (PRO System)

> [!IMPORTANT]
> All reconciliation is performed through the **Lumen Asset LCM — PRO Inventory Explorer** and the **Process Inventory Instructions** workflow.

### 3.1 CSV Import & Linkage
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 3.1.1 | Latest PRO Inventory CSV imported and "CSV ATTACHED" confirmed in toolbar | | |
| 3.1.2 | CSV record count matches expected PRO inventory total | | |
| 3.1.3 | All PRO rack rows linked (dragged) to corresponding BIM racks | | |
| 3.1.4 | Zero unlinked PRO rows remain for the active building (use "Hide Linked" to verify) | | |
| 3.1.5 | No `[MISSING]` BIM rows remain that should have a PRO ID | | |

### 3.2 Attribute Reconciliation
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 3.2.1 | **UPDATE ATTRIBUTES** count in Process Instructions is reviewed and understood | | |
| 3.2.2 | All amber-highlighted **Line Up** mismatches confirmed and corrected in PRO system | | |
| 3.2.3 | All amber-highlighted **Bay No** mismatches confirmed and corrected in PRO system | | |
| 3.2.4 | RMU mismatches for equipment reviewed and resolved | | |
| 3.2.5 | No spurious attribute changes remain after reconciliation | | |

### 3.3 Creates & Deletes
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 3.3.1 | **CREATE NEW** list reviewed — each entry verified as genuinely absent from PRO | | |
| 3.3.2 | New racks confirmed present in site photography before PRO create instruction issued | | |
| 3.3.3 | **DELETE / MISSING** list reviewed — each entry verified as genuinely absent on-site | | |
| 3.3.4 | Unmodelled buildings resolved (IGNORE or PURGE) before report download | | |
| 3.3.5 | Total Operations count reviewed and approved by team lead | | |

### 3.4 Output & Delivery
| # | Check | Pass / Fail | Notes |
|---|-------|-------------|-------|
| 3.4.1 | Reconciliation Report (TXT) downloaded and archived | | |
| 3.4.2 | Instructions JSON downloaded and filed | | |
| 3.4.3 | Workspace saved to cloud ("Test & Sync Now" green) | | |
| 3.4.4 | Completed checklist (this document) signed and submitted with deliverables | | |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Field Lead | | | |
| CAD Technician | | | |
| Inventory Analyst | | | |
| QC Reviewer | | | |

---
*Lumen Asset LCM — Internal QC Reference | Confidential*
