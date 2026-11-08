# Restarts the production server on port 3111 so a fresh build is served.
# The listening process is the `next start` child, not the npx wrapper, so the
# port owner is looked up and stopped directly.
$ErrorActionPreference = "Stop"

Set-Location "E:\Narail Collectorate School"

$pidFile = "E:\Narail Collectorate School\.tmp-server.pid"

function Get-PortOwner {
    $line = netstat -ano | Select-String ":3111\s+.*LISTENING" | Select-Object -First 1
    if (-not $line) { return $null }
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    return [int]$parts[-1]
}

$owner = Get-PortOwner
if ($owner) {
    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if (Test-Path $pidFile) {
    $old = [int](Get-Content $pidFile)
    Stop-Process -Id $old -Force -ErrorAction SilentlyContinue
}

$proc = Start-Process -FilePath "npx.cmd" -ArgumentList "next", "start", "-p", "3111" -WorkingDirectory "E:\Narail Collectorate School" -PassThru -WindowStyle Hidden
$proc.Id | Out-File -FilePath $pidFile -Encoding ascii

Write-Output "stopped: $owner"
Write-Output "PID: $($proc.Id)"
