# Daily Operations & Backup Strategy

To ensure zero data loss and simple "point-in-time" recovery, follow these steps daily. These scripts interact directly with Supabase and your local filesystem, bypassing the need for complex forensic repairs.

## 1. Start of Session (Auto-Snapshot)
Before you make any changes, run this command to create a "Safety Save" of the current cloud state:
```powershell
node create_snapshot.cjs
```
This saves a dated JSON file to: `backups/snapshot-[timestamp].json`.

## 2. End of Day / Milestone Backup
When you reach a stable point (e.g., all buildings positioned, import complete), run the same command:
```powershell
node create_snapshot.cjs
```

## 3. How to Restore a specific Point-in-Time
If the application becomes "a mess" or you want to undo a series of changes:
1. Go to your `backups` folder and find the filename you want to go back to.
2. Run this command:
```powershell
node restore_snapshot.cjs [YOUR_FILENAME.json]
```
*Example: `node restore_snapshot.cjs snapshot-2026-03-04T07-00-00.json`*

## 4. Emergency "Latest Stable" Recovery
I always keep a copy of the very last snapshot in a fixed filename for quick recovery:
```powershell
node restore_snapshot.cjs LATEST_STABLE_BACKUP.json
```

---

### Important Rules
- **Supabase is the "Live" state**: The application always reads from and writes to the cloud.
- **Backups are "Frozen" state**: These JSON files are your insurance policy.
- **PDFs vs Photos**: I have cleared all photo floor plans. Please use the application's built-in "Settings > Import Floor Plan" button to link your PDFs. These links will then be preserved in all future snapshots.
