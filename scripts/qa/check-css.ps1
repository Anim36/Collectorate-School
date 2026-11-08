$cssFiles = Get-ChildItem -LiteralPath "E:\Narail Collectorate School\.next\static\css" -Filter *.css
$content = ($cssFiles | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"

Write-Output "--- danger ---"
[regex]::Matches($content, '\.text-danger[^{]*\{[^}]*\}') | ForEach-Object { $_.Value }
Write-Output "--- micro ---"
[regex]::Matches($content, '\.text-micro[^{]*\{[^}]*\}') | ForEach-Object { $_.Value }
Write-Output "--- destructive ---"
[regex]::Matches($content, '\.text-destructive[^{]*\{[^}]*\}') | ForEach-Object { $_.Value }
