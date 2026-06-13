# PokerTrainer - Script de demarrage

Write-Host "`n  PokerTrainer - Demarrage..." -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "`n  Node.js non trouve !" -ForegroundColor Red
    Write-Host "  Installe Node.js depuis : https://nodejs.org (version LTS)" -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

Write-Host "  Node.js $(node --version) detecte" -ForegroundColor Green

# Installe les deps si pas encore fait
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installation backend..." -ForegroundColor Cyan
    npm install
    npm run db:push:dev
}

Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installation frontend..." -ForegroundColor Cyan
    npm install
}

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  Backend  -> http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Ctrl+C pour arreter. Ferme les fenetres CMD pour stopper les serveurs." -ForegroundColor Gray
Write-Host ""

# Lance backend et frontend dans des fenetres CMD separees
Start-Process "cmd" -ArgumentList "/k cd /d `"$PSScriptRoot\backend`" && npm run dev"
Start-Sleep -Seconds 3
Start-Process "cmd" -ArgumentList "/k cd /d `"$PSScriptRoot\frontend`" && npm run dev"

Write-Host "  Ouverture du navigateur dans 5 secondes..." -ForegroundColor Gray
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host "  App lancee ! http://localhost:5173" -ForegroundColor Green
Write-Host ""
