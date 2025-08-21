# Simple Code Signing for GridHealth Agent
# This script creates a basic self-signed certificate for local use

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GridHealth Agent - Simple Code Signing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Create self-signed certificate for code signing
    Write-Host "Creating self-signed certificate..." -ForegroundColor Green
    
    $cert = New-SelfSignedCertificate -Subject "CN=GridHealth,O=GridHealth,C=US" -Type CodeSigningCert -KeyUsage DigitalSignature -FriendlyName "GridHealth Code Signing Certificate" -CertStoreLocation "Cert:\CurrentUser\My" -KeyLength 2048

    Write-Host "✅ Certificate created successfully" -ForegroundColor Green
    Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow
    Write-Host ""

    # Sign the installer batch file
    $installerPath = ".\install.bat"
    if (Test-Path $installerPath) {
        Write-Host "Signing installer: $installerPath" -ForegroundColor Green
        
        $signature = Set-AuthenticodeSignature -FilePath $installerPath -Certificate $cert
        
        if ($signature.Status -eq "Valid") {
            Write-Host "✅ Installer signed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to sign installer: $($signature.StatusMessage)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Installer not found: $installerPath" -ForegroundColor Red
    }

    # Sign the executable if it exists
    $exePath = ".\GridHealth.Agent.exe"
    if (Test-Path $exePath) {
        Write-Host "Signing executable: $exePath" -ForegroundColor Green
        
        $signature = Set-AuthenticodeSignature -FilePath $exePath -Certificate $cert
        
        if ($signature.Status -eq "Valid") {
            Write-Host "✅ Executable signed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to sign executable: $($signature.StatusMessage)" -ForegroundColor Red
        }
    }

    # Check if release files exist and sign them
    $releaseDir = ".\release\GridHealth-Agent-v1.0.0"
    if (Test-Path $releaseDir) {
        Write-Host ""
        Write-Host "Signing release files..." -ForegroundColor Green
        
        # Sign installer in release directory
        $releaseInstaller = "$releaseDir\install.bat"
        if (Test-Path $releaseInstaller) {
            $signature = Set-AuthenticodeSignature -FilePath $releaseInstaller -Certificate $cert
            if ($signature.Status -eq "Valid") {
                Write-Host "✅ Release installer signed" -ForegroundColor Green
            }
        }
        
        # Sign executable in release directory
        $releaseExe = "$releaseDir\GridHealth.Agent.exe"
        if (Test-Path $releaseExe) {
            $signature = Set-AuthenticodeSignature -FilePath $releaseExe -Certificate $cert
            if ($signature.Status -eq "Valid") {
                Write-Host "✅ Release executable signed" -ForegroundColor Green
            }
        }
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Simple Code Signing Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: This is a self-signed certificate for local use." -ForegroundColor Yellow
    Write-Host "Users will see 'GridHealth' as publisher instead of 'Unknown Publisher'." -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host "❌ Error during code signing: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press Enter to exit" 