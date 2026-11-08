Set-Location "E:\Narail Collectorate School"
$proc = Start-Process -FilePath "npx.cmd" -ArgumentList "next","start","-p","3111" -PassThru -WindowStyle Hidden
$proc.Id | Out-File -FilePath "E:\Narail Collectorate School\.tmp-server.pid" -Encoding ascii
Write-Output "PID: $($proc.Id)"
