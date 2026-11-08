Add-Type -AssemblyName System.Drawing
Get-ChildItem -LiteralPath "E:\Narail Collectorate School\public\images" | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  Write-Output ("{0} {1}x{2}" -f $_.Name, $img.Width, $img.Height)
  $img.Dispose()
}
