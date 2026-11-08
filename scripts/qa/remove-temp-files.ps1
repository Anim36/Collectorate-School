# Removes the scratch files the verification scripts leave behind.
#
# Usage: powershell -File scripts/qa/remove-temp-files.ps1

$ErrorActionPreference = "Stop"

$root = "E:\Narail Collectorate School"

# The scratch files at the project root.
Get-ChildItem -LiteralPath $root -File -Filter ".tmp-*" | ForEach-Object {
  Remove-Item -Force $_.FullName
  Write-Output "removed $($_.Name)"
}

# The pid files of the server and the browser.
foreach ($name in @(".tmp-server.pid", ".tmp-cdp.pid")) {
  $path = Join-Path $root $name
  if (Test-Path $path) {
    Remove-Item -Force $path
    Write-Output "removed $name"
  }
}
