# PokerTrainer - Setup initial (a lancer une seule fois)

Write-Host "`n  PokerTrainer - Setup" -ForegroundColor Green

# Verifie Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "`n  Node.js non trouve !" -ForegroundColor Red
    Write-Host "  1. Va sur https://nodejs.org et installe la version LTS" -ForegroundColor Yellow
    Write-Host "  2. Relance ce script apres installation" -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

Write-Host "  Node.js: $(node --version)" -ForegroundColor Green
Write-Host "  npm:     $(npm --version)" -ForegroundColor Green

# Backend
Write-Host "`n  Backend - Installation des dependances..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Erreur npm install backend" -ForegroundColor Red
    exit 1
}

Write-Host "`n  Initialisation SQLite..." -ForegroundColor Cyan
npm run db:push:dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Erreur Prisma db push" -ForegroundColor Red
    exit 1
}

Write-Host "  Base de donnees creee: backend/prisma/dev.db" -ForegroundColor Green

# Frontend
Write-Host "`n  Frontend - Installation des dependances..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Erreur npm install frontend" -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot

Write-Host "`n  Setup termine avec succes !" -ForegroundColor Green
Write-Host ""
Write-Host "  Pour lancer :" -ForegroundColor White
Write-Host "    .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Ou manuellement (2 terminaux) :" -ForegroundColor White
Write-Host "    Terminal 1 :  cd backend  ; npm run dev" -ForegroundColor Gray
Write-Host "    Terminal 2 :  cd frontend ; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Puis ouvre : http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
