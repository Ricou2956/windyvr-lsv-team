$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$Desktop = [Environment]::GetFolderPath("Desktop")
$PowerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

$DebutScript = Join-Path $Repo "scripts\windows\WINDYVR-Debut-Travail.ps1"
$FinScript   = Join-Path $Repo "scripts\windows\WINDYVR-Fin-Travail.ps1"

$Shell = New-Object -ComObject WScript.Shell

$Shortcut = $Shell.CreateShortcut((Join-Path $Desktop "WINDYVR - DEBUT TRAVAIL.lnk"))
$Shortcut.TargetPath = $PowerShell
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$DebutScript`""
$Shortcut.WorkingDirectory = $Repo
$Shortcut.Save()

$Shortcut = $Shell.CreateShortcut((Join-Path $Desktop "WINDYVR - FIN TRAVAIL.lnk"))
$Shortcut.TargetPath = $PowerShell
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$FinScript`""
$Shortcut.WorkingDirectory = $Repo
$Shortcut.Save()

Write-Host ""
Write-Host "Raccourcis WINDYVR crees sur le Bureau :" -ForegroundColor Green
Write-Host ""
Write-Host " - WINDYVR - DEBUT TRAVAIL"
Write-Host " - WINDYVR - FIN TRAVAIL"
Write-Host ""
