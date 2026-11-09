# Restarts the production server on port 3111 and keeps its output in a file,
# so a failing request can be read back.
$ErrorActionPreference = "Stop"

Set-Location "E:\Narail Collectorate School"

$line = netstat -ano | Select-String ":3111\s+.*LISTENING" | Select-Object -First 1
if ($line) {
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    Stop-Process -Id ([int]$parts[-1]) -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$out = "E:\Narail Collectorate School\.tmp-server.log"
$err = "E:\Narail Collectorate School\.tmp-server.err.log"

Start-Process -FilePath "npx.cmd" `
    -ArgumentList "next", "start", "-p", "3111" `
    -WorkingDirectory "E:\Narail Collectorate School" `
    -WindowStyle Hidden `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err

Start-Sleep -Seconds 6
Write-Output "ready"
