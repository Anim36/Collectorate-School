$pidFile = "E:\Narail Collectorate School\.tmp-server.pid"
if (Test-Path $pidFile) {
  $serverPid = Get-Content -Raw -LiteralPath $pidFile
  Stop-Process -Id ([int]$serverPid) -Force -ErrorAction SilentlyContinue
}
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Output "stopped"
