# Removes the components that nothing imports: the shadcn primitives the app
# does not use and the placeholder dashboard body the real dashboards replaced.
#
# Usage: powershell -File scripts/qa/remove-unused-components.ps1

$ErrorActionPreference = "Stop"

$root = "E:\Narail Collectorate School\src\components"

$files = @(
  "ui\avatar.tsx",
  "ui\card.tsx",
  "ui\dialog.tsx",
  "ui\label.tsx",
  "ui\progress.tsx",
  "ui\separator.tsx",
  "ui\switch.tsx",
  "ui\tooltip.tsx",
  "layout\portal-placeholder.tsx"
)

foreach ($name in $files) {
  $path = Join-Path $root $name
  if (Test-Path $path) {
    Remove-Item -Force $path
    Write-Output "removed src/components/$name"
  }
}
