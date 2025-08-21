# GridHealth Agent Code Signing Script
# This script creates a self-signed certificate and signs the installer

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GridHealth Agent Code Signing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click on PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Certificate details
$certName = "GridHealth Code Signing Certificate"
$certSubject = "CN=GridHealth,O=GridHealth,C=US"
$certStore = "Cert:\CurrentUser\My"

Write-Host "Creating self-signed certificate..." -ForegroundColor Green

try {
    # Create self-signed certificate for code signing
    $cert = New-SelfSignedCertificate -Subject $certSubject -Type CodeSigningCert -KeyUsage DigitalSignature -FriendlyName $certName -CertStoreLocation $certStore -KeyLength 2048

    Write-Host "✅ Certificate created successfully" -ForegroundColor Green
    Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow
    Write-Host ""

    # Export certificate to install in Trusted Publishers
    $certPath = ".\GridHealth-CodeSigning.cer"
    Export-Certificate -Cert $cert -FilePath $certPath -Type CERT | Out-Null
    
    Write-Host "Installing certificate in Trusted Publishers..." -ForegroundColor Green
    
    # Import to Trusted Publishers store
    Import-Certificate -FilePath $certPath -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" | Out-Null
    Import-Certificate -FilePath $certPath -CertStoreLocation "Cert:\LocalMachine\Root" | Out-Null
    
    Write-Host "✅ Certificate installed in Trusted Publishers" -ForegroundColor Green
    Write-Host ""

    # Sign the installer batch file
    $installerPath = ".\install.bat"
    if (Test-Path $installerPath) {
        Write-Host "Signing installer: $installerPath" -ForegroundColor Green
        
        # Use Set-AuthenticodeSignature to sign the batch file
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
    Write-Host "Code Signing Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The installer is now signed with a self-signed certificate." -ForegroundColor Yellow
    Write-Host "Users will see 'GridHealth' as the publisher instead of 'Unknown Publisher'." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For production, consider purchasing a commercial code signing certificate from:" -ForegroundColor Cyan
    Write-Host "- DigiCert, Comodo, GlobalSign, or other trusted CAs" -ForegroundColor Cyan
    Write-Host ""

    # Clean up certificate file
    Remove-Item $certPath -Force -ErrorAction SilentlyContinue

} catch {
    Write-Host "❌ Error during code signing: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press Enter to exit" 