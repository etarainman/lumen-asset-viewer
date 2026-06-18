# Ambiflo Asset LCM - Backup & Restore Guide

## Quick Backup Methods

### Method 1: Application Export (Easiest)
1. Open the application at http://localhost:3001/
2. Click the **Settings** icon (⚙️) in the top right
3. In the Admin Panel, look for an **Export** button
4. Save the JSON file with a descriptive name (e.g., `backup-2026-01-12.json`)

### Method 2: Browser Console Export
1. Open the application at http://localhost:3001/
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Run this command:
```javascript
const data = localStorage.getItem('AMBIFLO_WORKSPACE_STABLE_V1');
const blob = new Blob([data], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `ambiflo-backup-${new Date().toISOString().split('T')[0]}.json`;
a.click();
```

### Method 3: Full Project Backup (Recommended for Developers)
Run this PowerShell command from the project directory:
```powershell
Compress-Archive -Path * -DestinationPath "..\lumen-asset-viewer-backup-$(Get-Date -Format yyyy-MM-dd-HHmmss).zip" -Force
```

## Restore Methods

### Restore from Application Import
1. Open the application
2. Click **Settings** icon
3. In the Admin Panel, click **Import**
4. Select your backup JSON file

### Restore from Browser Console
1. Open the application at http://localhost:3001/
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Run this command (replace `YOUR_BACKUP_DATA` with the actual JSON content):
```javascript
localStorage.setItem('AMBIFLO_WORKSPACE_STABLE_V1', 'YOUR_BACKUP_DATA');
location.reload();
```

### Restore Full Project
1. Extract the backup ZIP file
2. Replace the current project directory with the extracted files
3. Run `npm install` to ensure dependencies are installed
4. Run `npm run dev` to start the application

## Automated Backup Script

Create a file called `backup.ps1` in the project directory:

```powershell
# Ambiflo Backup Script
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$backupDir = ".\backups"
$backupFile = "$backupDir\ambiflo-backup-$timestamp.zip"

# Create backups directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Create backup
Write-Host "Creating backup: $backupFile"
Compress-Archive -Path * -DestinationPath $backupFile -Force -Exclude backups,node_modules,dist

Write-Host "Backup created successfully!"
Write-Host "Location: $backupFile"

# Keep only last 10 backups
$backups = Get-ChildItem $backupDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt 10) {
    $backups | Select-Object -Skip 10 | Remove-Item
    Write-Host "Cleaned up old backups (keeping last 10)"
}
```

Run it with: `powershell -ExecutionPolicy Bypass -File backup.ps1`

## Cloud Sync Feature

The application has built-in Supabase cloud sync:
- Click the **"Sync to Cloud"** button when you see "Unsaved Changes"
- Your data is automatically backed up to the cloud
- The green **"SYNCED"** indicator shows when your data is safe

## Best Practices

1. **Export data regularly** using the application's export feature
2. **Before major changes**, create a backup
3. **Use Git** for version control of the codebase (not data)
4. **Test restores** periodically to ensure backups work
5. **Keep multiple backup versions** (don't overwrite old backups immediately)

## Emergency Recovery

If you lose data:
1. Check browser LocalStorage (F12 → Application → Local Storage)
2. Look for the `AMBIFLO_WORKSPACE_STABLE_V1` key
3. Check the cloud sync (if configured)
4. Check any exported JSON files
5. Check the `backups` folder if you've been using the automated script
