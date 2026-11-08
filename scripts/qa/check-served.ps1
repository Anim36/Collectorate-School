param([string]$Url = "http://localhost:3111/notice")

$r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
Write-Output "STATUS: $($r.StatusCode)  LENGTH: $($r.Content.Length)"

$patterns = @(
  'pt-7',
  'py-3 pl-3 pr-0',
  'border-spacing-y-4',
  'border-t-\[16px\]'
)

foreach ($pattern in $patterns) {
  $count = ([regex]::Matches($r.Content, [regex]::Escape($pattern))).Count
  Write-Output "$pattern => $count"
}
