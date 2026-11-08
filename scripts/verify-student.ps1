# Compares every student route at every breakpoint, in both themes.
$ErrorActionPreference = "Stop"

Set-Location "E:\Narail Collectorate School"

$routes = @(
  "/student/dashboard",
  "/student/profile",
  "/student/attendance",
  "/student/performance",
  "/student/result",
  "/student/fees",
  "/student/notice",
  "/student/gallery"
)
$widths = @(1440, 768, 375)

$failed = 0
$passed = 0

foreach ($route in $routes) {
    foreach ($width in $widths) {
        foreach ($theme in @("light", "dark")) {
            $args = @("scripts/compare-student.mjs", $route, $width)
            if ($theme -eq "dark") { $args += "--dark" }

            $output = node @args
            $text = $output -join "`n"

            if ($text -match "ALL WITHIN TOLERANCE") {
                $passed += 1
                Write-Output "PASS  $route @ ${width}px ($theme)"
            } else {
                $failed += 1
                Write-Output "FAIL  $route @ ${width}px ($theme)"
                $output | ForEach-Object { Write-Output "      $_" }
            }
        }
    }
}

Write-Output ""
Write-Output "$passed passed, $failed failed"
