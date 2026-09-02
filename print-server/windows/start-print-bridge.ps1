# Starts the Havifin print bridge and appends its output to print-bridge.log.
#
# The scheduled task created by install-autostart.ps1 runs this script, but it
# is also worth running by hand once: the checks below name exactly what is
# missing, whereas the scheduled task fails silently in the background.
#
#   powershell -ExecutionPolicy Bypass -File .\start-print-bridge.ps1

$ErrorActionPreference = 'Stop'

$bridgeRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is not on PATH. Install it from https://nodejs.org, then open a new terminal.'
}

# server.js is started with --env-file, which Node only understands from 20.6.
$nodeVersion = (& node --version).TrimStart('v')
$parsedVersion = [Version]($nodeVersion -split '-')[0]
if ($parsedVersion -lt [Version]'20.6.0') {
    throw "Node $nodeVersion is too old: --env-file needs Node 20.6 or later. Install a current LTS from https://nodejs.org."
}

$envFile = Join-Path $bridgeRoot '.env'
if (-not (Test-Path -Path $envFile)) {
    throw "Missing $envFile. Copy .env.example to .env and set PRINT_SERVER_TOKEN to the same value as VITE_PRINT_SERVER_TOKEN in the application's .env, otherwise every print is rejected with 401."
}

if (-not (Test-Path -Path (Join-Path $bridgeRoot 'node_modules'))) {
    throw "Dependencies are missing. Run 'npm install' in $bridgeRoot first."
}

Set-Location -Path $bridgeRoot

$logFile = Join-Path $bridgeRoot 'print-bridge.log'
"[$(Get-Date -Format o)] starting print bridge" | Out-File -FilePath $logFile -Append -Encoding utf8

# Keep stdout and stderr in one file: a printer error is only diagnosable next
# to the request log line that preceded it.
& node --env-file=.env server.js *>> $logFile
