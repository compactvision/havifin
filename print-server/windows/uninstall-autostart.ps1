# Removes the scheduled task created by install-autostart.ps1.
#
#   powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1

$ErrorActionPreference = 'Stop'

$taskName = 'HavifinPrintBridge'

if (-not (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) {
    Write-Host "No scheduled task named '$taskName' - nothing to remove."
    return
}

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false

Write-Host "Removed scheduled task '$taskName'."
