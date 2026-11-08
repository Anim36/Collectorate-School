param(
  [string]$Url = "http://localhost:3111/design-system",
  [string]$Out = "E:\Narail Collectorate School\figma-tmp\design-system.png",
  [int]$Width = 1440,
  [int]$Height = 2400
)

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileDir = Join-Path $env:TEMP "chrome-shot-profile"

& $chrome `
  --headless=new `
  --disable-gpu `
  --hide-scrollbars `
  --force-device-scale-factor=1 `
  --window-size="$Width,$Height" `
  --user-data-dir="$profileDir" `
  --screenshot="$Out" `
  --virtual-time-budget=6000 `
  $Url 2>&1 | Out-Null

if (Test-Path $Out) {
  Write-Output "SAVED $Out ($((Get-Item $Out).Length) bytes)"
} else {
  Write-Output "FAILED"
}
