Stop-Process -Id (Get-NetTCPConnection -LocalPort 3111 -State Listen -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
npm run build *> .tmp-build.log
Write-Output "BUILD EXIT: $LASTEXITCODE"
if ($LASTEXITCODE -ne 0) {
  Get-Content .tmp-build.log -Tail 40
  exit 1
}
powershell -ExecutionPolicy Bypass -File scripts/start-server.ps1
