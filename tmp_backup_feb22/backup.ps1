# Ambiflo Backup Script
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$backupDir = ".\backups"
$backupFile = "$backupDir\ambiflo-backup-$timestamp.zip"

# Create backups directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

try {
    Write-Host "Creating backup: $backupFile" -ForegroundColor Cyan
    
    # Using explicit inclusion list for robustness against locked files in ignored folders
    
    # 1. Select specific top-level files
    $safeFiles = Get-ChildItem -Path . -File | Where-Object { 
        $_.Name -match "\.(tsx|ts|js|json|html|css|md|txt|jpeg|jpg|png|gitignore|env|ps1)$" -and
        $_.Name -ne "CSRKCOCF_CSV.csv" 
    }

    # 2. Select specific safe directories
    $safeDirs = @("components", "services", "utils", ".agent")
    $dirFiles = @()

    foreach ($dir in $safeDirs) {
        if (Test-Path $dir) {
            $dirFiles += Get-ChildItem -Path $dir -Recurse -File
        }
    }

    $allFilesToZip = $safeFiles + $dirFiles
    
    # Extract just the full paths
    $paths = $allFilesToZip | Select-Object -ExpandProperty FullName

    if ($paths.Count -eq 0) {
        Write-Error "No files found to backup."
    }
    else {
        # Compress-Archive with -Path will default to storing relative paths if possible, or flat.
        # To preserve structure somewhat, we should check.
        # Actually, Compress-Archive from a list of FullPaths often flattens or does weird things.
        # A safer way to preserve structure is to copy to a temp dir then zip.
        
        Write-Host "Staging files..." -ForegroundColor Gray
        $tempStage = Join-Path $env:TEMP "ambiflo_backup_stage_$timestamp"
        New-Item -ItemType Directory -Path $tempStage | Out-Null
        
        foreach ($file in $allFilesToZip) {
            # Calculate relative path
            $relPath = $file.FullName.Substring($PWD.Path.Length + 1)
            $destPath = Join-Path $tempStage $relPath
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path $file.FullName -Destination $destPath -Force
        }
        
        Write-Host "Compressing..." -ForegroundColor Gray
        Get-ChildItem -Path $tempStage | Compress-Archive -DestinationPath $backupFile -Force
        
        # Cleanup
        Remove-Item -Path $tempStage -Recurse -Force
        
        if (Test-Path $backupFile) {
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
        }
        else {
            Write-Error "Backup file was not created for unknown reasons."
        }
    }
}
catch {
    Write-Error "Backup FAILED: $_"
    exit 1
}
