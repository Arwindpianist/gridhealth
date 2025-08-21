# Simple test script for GridHealth Agent signing
Write-Host "========================================" -ForegroundColor Green
Write-Host "GridHealth Agent - Signing Test" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "PowerShell version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
Write-Host ""

# Check if we can access the signing script
$scriptPath = ".\sign-installer.ps1"
Write-Host "Looking for: $scriptPath" -ForegroundColor Cyan

if (Test-Path $scriptPath) {
    Write-Host "✅ Found signing script!" -ForegroundColor Green
    Write-Host "File size: $((Get-Item $scriptPath).Length) bytes" -ForegroundColor Green
    
    # Try to read the first few lines
    try {
        $content = Get-Content $scriptPath -TotalCount 5
        Write-Host "✅ Script content preview:" -ForegroundColor Green
        $content | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } catch {
        Write-Host "❌ Error reading script: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Script not found!" -ForegroundColor Red
    Write-Host "Available .ps1 files:" -ForegroundColor Yellow
    Get-ChildItem -Filter "*.ps1" | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green
Read-Host "Press Enter to exit" 