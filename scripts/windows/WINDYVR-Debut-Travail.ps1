$ErrorActionPreference = "Stop"

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Branch = "dev-v1.2.0"

Set-Location $Repo

Clear-Host
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "       WINDYVR LSV - DEBUT TRAVAIL" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Projet  : $Repo"
Write-Host "Branche : $Branch"
Write-Host ""

$currentBranch = git branch --show-current

if ($currentBranch -ne $Branch) {
    Write-Host "Branche actuelle : $currentBranch" -ForegroundColor Yellow
    Write-Host "Passage sur $Branch..." -ForegroundColor Cyan

    git switch $Branch

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERREUR : impossible de passer sur $Branch." -ForegroundColor Red
        Read-Host "Appuie sur Entree pour fermer"
        exit 1
    }
}

$changes = git status --porcelain

if ($changes) {
    Write-Host ""
    Write-Host "ATTENTION : des modifications locales sont presentes." -ForegroundColor Yellow
    Write-Host ""
    git status
    Write-Host ""
    Write-Host "Aucun pull n'est effectue pour eviter un conflit." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host "Recuperation des dernieres modifications GitHub..." -ForegroundColor Cyan

git pull --rebase origin $Branch

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERREUR pendant le Git Pull." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
git status

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   WINDYVR EST A JOUR - TU PEUX TRAVAILLER" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Branche de travail : $Branch" -ForegroundColor Green
Write-Host ""

Read-Host "Appuie sur Entree pour fermer"
