$ErrorActionPreference = "Stop"

$manifestPath = Join-Path $env:LOCALAPPDATA 'PManager\PManager\p_manager_host_chrome.json'
Write-Host "Manifest path: $manifestPath"

# PowerShell方式（これだけでも基本OK）
New-Item -Path 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\p_manager_host_chrome' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\p_manager_host_chrome' -Name '(default)' -Value $manifestPath

# reg.exe方式（WOW6432Nodeも）
& reg.exe add "HKCU\Software\Google\Chrome\NativeMessagingHosts\p_manager_host_chrome" /ve /t REG_SZ /d "$manifestPath" /f
& reg.exe add "HKCU\Software\WOW6432Node\Google\Chrome\NativeMessagingHosts\p_manager_host_chrome" /ve /t REG_SZ /d "$manifestPath" /f

Write-Host "`n=== Confirm ==="
Get-ItemProperty 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\p_manager_host_chrome'
Get-ItemProperty 'HKCU:\Software\WOW6432Node\Google\Chrome\NativeMessagingHosts\p_manager_host_chrome'