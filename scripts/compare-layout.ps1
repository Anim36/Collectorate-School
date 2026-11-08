param(
  [Parameter(Mandatory = $true)][string]$Image,
  [double]$FrameWidth = 1440
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile($Image)
$scale = $img.Width / $FrameWidth
Write-Output ("image {0}x{1} scale={2:N4}" -f $img.Width, $img.Height, $scale)

function Get-ColorAt([double]$frameX, [double]$frameY) {
  $sx = [int]($frameX * $script:scale)
  $sy = [int]($frameY * $script:scale)
  if ($sx -lt 0 -or $sx -ge $script:img.Width -or $sy -lt 0 -or $sy -ge $script:img.Height) { return $null }
  return $script:img.GetPixel($sx, $sy)
}

# Detect horizontal band boundaries by scanning a column strip for colour changes.
$probeX = [int]($img.Width / 2)
$previous = $null
$boundaries = @()
for ($y = 0; $y -lt $img.Height; $y += 1) {
  $c = $img.GetPixel($probeX, $y)
  $key = "$($c.R),$($c.G),$($c.B)"
  if ($null -ne $previous -and $key -ne $previous) {
    $boundaries += $y
  }
  $previous = $key
}

Write-Output ("total colour-change boundaries on centre column: {0}" -f $boundaries.Count)

# Report the y position of each major section by looking for the known band colours.
$navy = @(17, 39, 89)
$background = @(248, 250, 252)
$surface = @(255, 255, 255)

function Find-Band([int[]]$target, [int]$tolerance, [string]$label) {
  $inBand = $false
  $start = 0
  $runs = @()
  for ($y = 0; $y -lt $script:img.Height; $y++) {
    $c = $script:img.GetPixel($script:probeX, $y)
    $match = [Math]::Abs($c.R - $target[0]) -le $tolerance -and [Math]::Abs($c.G - $target[1]) -le $tolerance -and [Math]::Abs($c.B - $target[2]) -le $tolerance
    if ($match -and -not $inBand) { $inBand = $true; $start = $y }
    elseif (-not $match -and $inBand) {
      $inBand = $false
      if (($y - $start) -gt 8) { $runs += ("{0}:{1}-{2}" -f $label, [int]($start / $script:scale), [int]($y / $script:scale)) }
    }
  }
  if ($inBand -and (($script:img.Height - $start)) -gt 8) { $runs += ("{0}:{1}-{2}" -f $label, [int]($start / $script:scale), [int](($script:img.Height) / $script:scale)) }
  return $runs
}

$runs = @()
$runs += Find-Band $navy 6 "navy"
$runs += Find-Band $background 3 "bg"
$runs += Find-Band $surface 2 "surface"
Write-Output ($runs -join "  ")

$img.Dispose()
