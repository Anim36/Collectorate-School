# Rebuilds the app and restarts the production server so the compare scripts
# measure the current source.
$ErrorActionPreference = "Stop"

Set-Location "E:\Narail Collectorate School"

Write-Output "building..."
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { throw "build failed" }

& "E:\Narail Collectorate School\scripts\restart-server.ps1"

Start-Sleep -Seconds 6
Write-Output "ready"
