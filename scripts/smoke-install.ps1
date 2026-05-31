$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$tempRoot = Join-Path $env:TEMP ("media-manager-smoke-" + [guid]::NewGuid().ToString("n"))
$tempWorkspace = Join-Path $tempRoot "workspace"
New-Item -ItemType Directory -Force -Path $tempWorkspace | Out-Null

Write-Host "== smoke: build monorepo ==" -ForegroundColor Cyan
npm install
npm run build
npm test

$globalInstalled = $false
try {
  Write-Host "== smoke: global install @dsmlll/media-manager-cli from local package ==" -ForegroundColor Cyan
  npm install -g (Join-Path $repoRoot "packages\cli")
  if ($LASTEXITCODE -ne 0) { throw "global install failed" }
  $globalInstalled = $true

  $env:MEDIA_MANAGER_SKIP_SETUP = "1"
  $env:MEDIA_WORKSPACE = $tempWorkspace

  Write-Host "== smoke: media setup (default workspace path) ==" -ForegroundColor Cyan
  media setup --workspace $tempWorkspace
  if ($LASTEXITCODE -ne 0) { throw "media setup failed" }

  Write-Host "== smoke: media doctor ==" -ForegroundColor Cyan
  media doctor
  if ($LASTEXITCODE -ne 0) { throw "media doctor fatal check failed" }

  Write-Host "== smoke: media news fetch --preview ==" -ForegroundColor Cyan
  media news fetch --preview --skip-dedup --hours 48
  if ($LASTEXITCODE -ne 0) { throw "media news fetch failed" }

  Write-Host "Smoke tests passed." -ForegroundColor Green
}
finally {
  if ($globalInstalled) {
    Write-Host "== smoke: cleanup global install ==" -ForegroundColor DarkGray
    npm uninstall -g @dsmlll/media-manager-cli 2>$null
  }
  if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  Remove-Item Env:MEDIA_MANAGER_SKIP_SETUP -ErrorAction SilentlyContinue
  Remove-Item Env:MEDIA_WORKSPACE -ErrorAction SilentlyContinue
}
