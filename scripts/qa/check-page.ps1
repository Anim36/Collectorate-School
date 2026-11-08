Start-Sleep -Seconds 6
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3111/design-system" -UseBasicParsing -TimeoutSec 30
  Write-Output "STATUS: $($r.StatusCode)"
  Write-Output "LENGTH: $($r.Content.Length)"
  foreach ($marker in @('Choose a payment method', 'Annual examination schedule published', 'You&rsquo;re all caught up', 'bg-tint', 'NoticeCard', '94.5%', 'Unpaid fees')) {
    if ($r.Content -match [regex]::Escape($marker)) {
      Write-Output "OK   $marker"
    } else {
      Write-Output "MISS $marker"
    }
  }
} catch {
  Write-Output "ERR: $_"
}
