$pidFile = "E:\Narail Collectorate School\.tmp-cdp.pid"
if (Test-Path $pidFile) {
  $cdpPid = Get-Content -Raw -LiteralPath $pidFile
  Stop-Process -Id ([int]$cdpPid) -Force -ErrorAction SilentlyContinue
}
Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -like "*chrome-cdp-profile*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Output "cdp stopped"
