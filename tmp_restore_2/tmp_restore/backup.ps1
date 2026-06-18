# Ambiflo Backup Script
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$backupDir = ".\backups"
$backupFile = "$backupDir\ambiflo-backup-$timestamp.zip"

# Create backups directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Create backup (exclude node_modules, dist, and backups folder)
Write-Host "Creating backup: $backupFile" -ForegroundColor Cyan
Get-ChildItem -Path . -Exclude backups, node_modules, dist, .git | Compress-Archive -DestinationPath $backupFile -Force

Write-Host "[OK] Backup created successfully!" -ForegroundColor Green
Write-Host "Location: $backupFile" -ForegroundColor Yellow

# Keep only last 10 backups
$backups = Get-ChildItem $backupDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt 10) {
    $toDelete = $backups | Select-Object -Skip 10
    $toDelete | Remove-Item
    Write-Host "[OK] Cleaned up $($toDelete.Count) old backup(s) (keeping last 10)" -ForegroundColor Gray
}

Write-Host "`nBackup Summary:" -ForegroundColor Cyan
Write-Host "  Total backups: $($backups.Count)" -ForegroundColor White
Write-Host "  Latest: $($backups[0].Name)" -ForegroundColor White
Write-Host "  Size: $([math]::Round($backups[0].Length / 1MB, 2)) MB" -ForegroundColor White
