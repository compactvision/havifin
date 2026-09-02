#Requires -Version 5.1
#
# Registers the print bridge as a scheduled task that starts at logon.
# Run once on the kiosk machine, from this folder:
#
#   powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
#
# The task runs as the logged-in user rather than SYSTEM: libusb reaches the
# printer through the interactive session, and a kiosk logs in automatically
# anyway.

$ErrorActionPreference = 'Stop'

$taskName = 'HavifinPrintBridge'
$launcher = Join-Path $PSScriptRoot 'start-print-bridge.ps1'

if (-not (Test-Path -Path $launcher)) {
    throw "Cannot find $launcher - run this script from the print-server\windows folder."
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

# It is a long-running server, so no execution time limit, and bring it back
# if it ever exits (printer unplugged, crash, ...).
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "Registered scheduled task '$taskName' - it will start at each logon."
Write-Host ''
Write-Host 'Start it now without logging out:'
Write-Host "  Start-ScheduledTask -TaskName $taskName"
Write-Host ''
Write-Host 'Then confirm the bridge is listening:'
Write-Host '  curl.exe http://127.0.0.1:3001/print'
Write-Host '  (401 Unauthorized is the expected answer - it means the bridge is up.)'
