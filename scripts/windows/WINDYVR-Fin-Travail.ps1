$ErrorActionPreference = "Stop"

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Branch = "dev-v1.2.0"

Set-Location $Repo

Clear-Host
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "        WINDYVR LSV - FIN TRAVAIL" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Projet  : $Repo"
Write-Host "Branche : $Branch"
Write-Host ""

$currentBranch = git branch --show-current

if ($currentBranch -ne $Branch) {
    Write-Host "SECURITE : tu n'es pas sur $Branch." -ForegroundColor Red
    Write-Host "Branche actuelle : $currentBranch" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Aucun commit et aucun push ne seront effectues." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

$changes = git status --porcelain

if (-not $changes) {
    Write-Host "Aucune modification locale a enregistrer." -ForegroundColor Green
    Write-Host ""
    Write-Host "Verification de GitHub..." -ForegroundColor Cyan

    git pull --rebase origin $Branch

    Write-Host ""
    git status
    Write-Host ""
    Read-Host "Appuie sur Entree pour fermer"
    exit 0
}

Write-Host "Fichiers modifies :" -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""

$confirmation = Read-Host "Veux-tu enregistrer et envoyer ces modifications sur GitHub ? (O/N)"

if ($confirmation -notmatch '^[OoYy]$') {
    Write-Host ""
    Write-Host "Operation annulee. Aucun fichier n'a ete envoye." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour fermer"
    exit 0
}

$message = Read-Host "Message du commit"

if ([string]::IsNullOrWhiteSpace($message)) {
    Write-Host ""
    Write-Host "Le message du commit ne peut pas etre vide." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
Write-Host "Ajout des modifications..." -ForegroundColor Cyan
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR pendant git add." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
git status --short
Write-Host ""

Write-Host "Creation du commit..." -ForegroundColor Cyan
git commit -m "$message"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR pendant le commit." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
Write-Host "Verification des modifications distantes..." -ForegroundColor Cyan
git pull --rebase origin $Branch

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERREUR pendant le rebase." -ForegroundColor Red
    Write-Host "NE PAS forcer le Push." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
Write-Host "Envoi vers GitHub..." -ForegroundColor Cyan
git push origin $Branch

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERREUR pendant le Push." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
git status

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "    TRAVAIL WINDYVR ENREGISTRE SUR GITHUB" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu peux maintenant passer sur l'autre PC." -ForegroundColor Green
Write-Host ""

Read-Host "Appuie sur Entree pour fermer"
