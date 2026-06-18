# PowerShell script to create a daily Windows Task Scheduler task for Supabase Keep-Alive
# Run this script as Administrator to register the task

$TaskName = "SupabaseKeepAlive"
$ScriptPath = Join-Path $PSScriptRoot "keep_alive.cjs"
$WorkingDir = $PSScriptRoot

# Check if node is in PATH
if (!(Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found in PATH. Please install Node.js."
    exit 1
}

# Define the action: run node keep_alive.cjs
$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "keep_alive.cjs" -WorkingDirectory $WorkingDir

# Define the trigger: daily at 9:00 AM (or whenever the machine is likely on)
$Trigger = New-ScheduledTaskTrigger -Daily -At 9am

# Define task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Sends a daily heartbeat pulse to Supabase to keep the project active." -Force
    Write-Host "SUCCESS: Task '$TaskName' has been registered."
    Write-Host "It will run daily at 9:00 AM from $WorkingDir."
} catch {
    Write-Error "Failed to register task. Make sure you are running PowerShell as Administrator."
}
