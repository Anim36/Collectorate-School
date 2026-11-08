# Checks that every 9C route renders and lists the expected markers.
$ErrorActionPreference = "Stop"

Set-Location "E:\Narail Collectorate School"

$routes = @(
  @{ path = "/student/notice"; markers = @("Notice", "Search", "Category", "From date", "To date", "Annual examination schedule published") },
  @{ path = "/student/notice/annual-examination-schedule"; markers = @("ANNUAL EXAMINATION / 2026", "Attachments", "Back to notices") },
  @{ path = "/student/notice/class-9-continuous-assessment-plan"; markers = @("CONTINUOUS ASSESSMENT / 2026", "Continuous assessment plan 2026") },
  @{ path = "/student/gallery"; markers = @("Science fair 2026", "Annual sports day", "Our campus", "School memories") },
  @{ path = "/student/gallery/science-fair-2026"; markers = @("Science fair 2026", "Back to gallery") },
  @{ path = "/student/gallery/our-campus"; markers = @("Our campus", "Back to gallery") }
)

$failed = 0

foreach ($route in $routes) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3111$($route.path)" -UseBasicParsing -TimeoutSec 30
    $missing = @()

    foreach ($marker in $route.markers) {
      if (-not $r.Content.Contains($marker)) { $missing += $marker }
    }

    if ($r.StatusCode -eq 200 -and $missing.Count -eq 0) {
      Write-Output "PASS  $($route.path)  ($($r.Content.Length) bytes)"
    } else {
      $failed += 1
      Write-Output "FAIL  $($route.path)  status=$($r.StatusCode) missing=$($missing -join ', ')"
    }
  } catch {
    $failed += 1
    Write-Output "ERR   $($route.path)  $($_.Exception.Message)"
  }
}

Write-Output ""
Write-Output "$($routes.Count - $failed) passed, $failed failed"
