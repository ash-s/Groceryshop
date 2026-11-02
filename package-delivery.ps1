# Assembles the folder you hand to your client.
#
#   Result:  deliver\GroceryShop\
#              GroceryShop.lnk      <- double-click icon
#              GroceryShop.exe      <- native launcher (no console window)
#              GroceryShop.ico
#              app\backend-1.0.0.jar
#              app\jre\             <- bundled Java runtime
#              app\mariadb\         <- portable MariaDB (if found on this PC)
#              data\                <- every bill and product lives here
#              README.txt
#
# The whole shop is one folder. Copy it to the client's PC, double-click
# "GroceryShop.lnk", and it runs. No Node, no internet, no IP to type.
#
# Usage:  powershell -ExecutionPolicy Bypass -File package-delivery.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root 'deliver\GroceryShop'

# ------------------------------------------------------------------ build pieces

# 1) Frontend + backend into one jar.
& "$root\build-desktop.ps1" | Out-String | Write-Output

# 2) Native launcher (csc.exe, no console window).
& "$root\launcher\build-launcher.ps1" | Out-String | Write-Output

$jar  = Join-Path $root 'grocery-backend\target\backend-1.0.0.jar'
$exe  = Join-Path $root 'launcher\bin\GroceryShop.exe'
$ico  = Join-Path $root 'launcher\GroceryShop.ico'

if (-not (Test-Path $jar)) { throw "Backend jar not found: $jar" }
if (-not (Test-Path $exe)) { throw "Launcher exe not found: $exe" }

# ------------------------------------------------------------------ assemble

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $out 'app') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out 'data\logs') -Force | Out-Null

Copy-Item $jar  (Join-Path $out 'app\backend-1.0.0.jar') -Force
Copy-Item $exe  (Join-Path $out 'GroceryShop.exe') -Force
Copy-Item $ico  (Join-Path $out 'GroceryShop.ico') -Force

# Ship a Java runtime so the client does not need Java installed.
$jre = Get-ChildItem 'D:\Development Tools\sts-*\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_*\jre' -Directory -ErrorAction SilentlyContinue |
       Sort-Object FullName -Descending | Select-Object -First 1
if ($jre) {
    Copy-Item $jre.FullName (Join-Path $out 'app\jre') -Recurse -Force
    Write-Output 'bundled Java runtime'
} else {
    Write-Output 'WARNING: no Java runtime found - client must install Java'
}

# Portable MariaDB (optional: bundled when present on this machine).
$mariadbRoots = @(
    'C:\Program Files\MariaDB*',
    'C:\Program Files (x86)\MariaDB*',
    'C:\mariadb*',
    'D:\mariadb*'
)
$maria = $null
foreach ($pattern in $mariadbRoots) {
    $maria = Get-ChildItem $pattern -Directory -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending | Select-Object -First 1
    if ($maria) { break }
}
if ($maria -and (Test-Path (Join-Path $maria.FullName 'bin\mysqld.exe'))) {
    Copy-Item $maria.FullName (Join-Path $out 'app\mariadb') -Recurse -Force
    Write-Output "bundled MariaDB: $($maria.FullName)"
} else {
    Write-Output 'no portable MariaDB found locally - the launcher will use an existing localhost:3306 database'
}

# ------------------------------------------------------------------ shortcut

$shortcut = Join-Path $out 'GroceryShop.lnk'
$targetExe = Join-Path $out 'GroceryShop.exe'

# WScript.Shell creates a working .lnk on every Windows machine.
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($shortcut)
$lnk.TargetPath = $targetExe
$lnk.WorkingDirectory = $out
$lnk.IconLocation = $ico
$lnk.Description = 'GroceryShop'
$lnk.Save()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($lnk) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null
Write-Output 'created shortcut'

# ------------------------------------------------------------------ readme

$mariaNote = if (Test-Path (Join-Path $out 'app\mariadb\bin\mysqld.exe')) {
    'The database is included in app\mariadb and starts automatically.'
} else {
    'The shop expects a MariaDB/MySQL on this computer at localhost:3306 (root / Admin@123).'
}

@'
GroceryShop - how to run
========================

1. Copy this whole folder onto the shop computer.
2. Double-click  GroceryShop.lnk   (or GroceryShop.exe)
3. The shop opens in its own browser window by itself - no address bar,
   no "localhost" to type, no terminal window.

The laptop stays on; it is the server. Everything - the program, the
database, and every bill - runs on this computer. Nothing goes to the
cloud and there is no monthly cost.

Using your phone as a scanner
-----------------------------
1. In the app, open the Phone panel (shown on the Billing screen).
2. Join the same Wi-Fi as the shop computer on your phone.
3. Open the phone camera and point it at the QR code shown.
4. Tap the link. The shop opens on the phone.
   Scans show on the laptop bill immediately; you can also bill entirely
   on the phone and the laptop mirrors it.

First time only: the phone shows a security notice. Tap
"Advanced", then "Proceed". This is normal for a shop that runs entirely
on its own computer with no internet.

{0}

To back up, copy the "data" folder somewhere safe.
'@ -f $mariaNote | Set-Content (Join-Path $out 'README.txt') -Encoding utf8

# ------------------------------------------------------------------ size

$mb = [math]::Round((Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Output "READY: $out  ($mb MB total)"
