# enable-tcp.ps1 — เปิด TCP/IP สำหรับ SQL Server Express (ต้องรันแบบ Admin)
# รันโดย: คลิกขวาที่ไฟล์นี้ → "Run with PowerShell" → กด Yes ที่ UAC

$ErrorActionPreference = 'Stop'

Write-Host "กำลังเปิด TCP/IP สำหรับ SQL Server Express..." -ForegroundColor Cyan

$base = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp"

# เปิด TCP
Set-ItemProperty -Path $base -Name "Enabled" -Value 1 -Type DWord
Write-Host "  [OK] TCP/IP Enabled"

# ตั้ง port 1434 (ล้าง dynamic port)
$ipAll = "$base\IPAll"
Set-ItemProperty -Path $ipAll -Name "TcpPort"         -Value "1434" -Type String
Set-ItemProperty -Path $ipAll -Name "TcpDynamicPorts" -Value ""     -Type String
Write-Host "  [OK] Port 1434 set"

# เปิด SQL Browser
Set-Service    SQLBrowser -StartupType Automatic
Start-Service  SQLBrowser
Write-Host "  [OK] SQL Browser started"

# Restart SQL Server
Restart-Service "MSSQL`$SQLEXPRESS" -Force
Write-Host "  [OK] SQL Server restarted"

Write-Host ""
Write-Host "เสร็จแล้ว! รัน npm start ได้เลยครับ" -ForegroundColor Green
Read-Host "กด Enter เพื่อปิด"
