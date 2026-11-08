param(
  [string]$Url = "http://localhost:3111/design-system",
  [int]$Port = 9222
)

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileDir = Join-Path $env:TEMP "chrome-cdp-profile"

$proc = Start-Process -FilePath $chrome -ArgumentList @(
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=$Port",
  "--window-size=1440,2400",
  "--user-data-dir=$profileDir",
  $Url
) -PassThru -WindowStyle Hidden

$proc.Id | Out-File -FilePath "E:\Narail Collectorate School\.tmp-cdp.pid" -Encoding ascii
Write-Output "CDP PID: $($proc.Id)"
