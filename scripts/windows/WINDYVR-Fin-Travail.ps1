$ErrorActionPreference = "Stop"
$Branch = "dev-v1.2.0"
$RemoteRef = "refs/remotes/origin/$Branch"

function Invoke-Git {
    & git @args
    if ($LASTEXITCODE -ne 0) {
        throw "Echec Git : git $($args -join ' ') (code $LASTEXITCODE)."
    }
}

function Assert-Repository {
    $root = Invoke-Git rev-parse --show-toplevel
    if ((Resolve-Path -LiteralPath $root).Path -ne $Repo) {
        throw "Le dossier du script n'est pas la racine du depot attendu : $Repo."
    }
    $currentBranch = Invoke-Git branch --show-current
    if ($currentBranch -ne $Branch) {
        throw "Branche obligatoire : $Branch. Branche actuelle : '$currentBranch'. Aucun changement automatique."
    }
    foreach ($marker in @('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'REBASE_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer', 'BISECT_START')) {
        $path = Invoke-Git rev-parse --git-path $marker
        if (Test-Path -LiteralPath $path) {
            throw "Operation Git inachevee ($marker). La resoudre avant de relancer ce script."
        }
    }
    $origin = Invoke-Git remote get-url origin
    if ($origin -notin @('https://github.com/Ricou2956/windyvr-lsv-team.git', 'https://github.com/Ricou2956/windyvr-lsv-team', 'git@github.com:Ricou2956/windyvr-lsv-team.git')) {
        throw "Origin inattendu : $origin. Verifier le depot avant de continuer."
    }
}

function Get-SyncState {
    $counts = Invoke-Git rev-list --left-right --count "HEAD...$RemoteRef"
    if ($counts -notmatch '^\s*(\d+)\s+(\d+)\s*$') {
        throw "Impossible de determiner l'alignement avec origin/$Branch."
    }
    return @([long]$Matches[1], [long]$Matches[2])
}

try {
    $Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    Set-Location -LiteralPath $Repo
    Write-Host "WINDYVR - FIN TRAVAIL : $Repo ($Branch)" -ForegroundColor Cyan
    Assert-Repository
    $changes = Invoke-Git status --porcelain --untracked-files=all

    Invoke-Git fetch origin "refs/heads/${Branch}:$RemoteRef" | Out-Host
    $ahead, $behind = Get-SyncState
    if (($ahead -gt 0) -and ($behind -gt 0)) {
        throw "Divergence avec origin/$Branch. Resolution manuelle necessaire ; aucun rebase ni push force."
    }
    if ($behind -gt 0) {
        if ($changes) {
            throw "Branche en retard avec modifications locales. Resolution manuelle necessaire avant commit."
        }
        Invoke-Git merge --ff-only $RemoteRef | Out-Host
    }

    if ($changes -or ($ahead -gt 0)) {
        Invoke-Git status --short | Out-Host
        Write-Host "$ahead commit(s) local(aux) deja en attente d'envoi." -ForegroundColor Yellow
        $confirmation = Read-Host "Veux-tu enregistrer les modifications et envoyer les commits sur GitHub ? (O/N)"
        if ($confirmation -notmatch '^[OoYy]$') {
            Write-Host "Operation annulee. Synchronisation non confirmee." -ForegroundColor Yellow
            Read-Host "Appuie sur Entree pour fermer"
            exit 0
        }
        if ($changes) {
            $message = Read-Host "Message du commit"
            if ([string]::IsNullOrWhiteSpace($message)) {
                throw "Le message du commit ne peut pas etre vide."
            }
            Invoke-Git add . | Out-Host
            Invoke-Git commit -m $message | Out-Host
        }
    }

    Assert-Repository
    if (Invoke-Git status --porcelain --untracked-files=all) {
        throw "Modifications locales restantes. Synchronisation interrompue."
    }
    $ahead, $behind = Get-SyncState
    if ($behind -gt 0) {
        throw "Branche non alignee. Aucun push effectue."
    }
    if ($ahead -gt 0) {
        Invoke-Git push origin "refs/heads/${Branch}:refs/heads/$Branch" | Out-Host
    }

    # Relire la branche distante apres l'envoi, y compris si aucun commit n'etait necessaire.
    Invoke-Git fetch origin "refs/heads/${Branch}:$RemoteRef" | Out-Host
    Assert-Repository
    $ahead, $behind = Get-SyncState
    if (($ahead -ne 0) -or ($behind -ne 0) -or (Invoke-Git status --porcelain --untracked-files=all)) {
        throw "Verification finale echouee : depot non propre ou non aligne avec origin/$Branch. Ne pas passer sur l'autre PC."
    }
    Write-Host "WINDYVR est propre et aligne avec origin/$Branch. Tu peux passer sur l'autre PC." -ForegroundColor Green
    Read-Host "Appuie sur Entree pour fermer"
    exit 0
}
catch {
    Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Synchronisation non confirmee. Ne pas passer sur l'autre PC ; ne pas forcer le push." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}
