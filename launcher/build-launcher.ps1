# Compiles GroceryShop.exe (the click-to-run desktop launcher) with csc.exe.
# Result:  launcher\bin\GroceryShop.exe   (+ GroceryShop.ico if built)
#
# Usage:  powershell -ExecutionPolicy Bypass -File launcher\build-launcher.ps1
#
# Requires nothing but Windows (.NET Framework 4.x is already on every client PC).

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo   = Split-Path -Parent $root
$cs     = Join-Path $root 'GroceryShopLauncher.cs'
$outDir = Join-Path $root 'bin'
$outExe = Join-Path $outDir 'GroceryShop.exe'

if (-not (Test-Path $cs)) { throw "launcher source not found: $cs" }

# Icon: optional but makes the app look like a real program.
$ico = Join-Path $root 'GroceryShop.ico'
$iconArg = ''
if (-not (Test-Path $ico)) {
    $makeIcon = Join-Path $root 'make-icon.ps1'
    if (Test-Path $makeIcon) {
        & $makeIcon
    }
}
if (Test-Path $ico) { $iconArg = '/win32icon:"' + $ico + '"' }

# .NET Framework 4.x csc.exe (present on every Windows machine).
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { throw 'csc.exe not found (.NET Framework missing?)' }

Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$cmdFormat = '"{0}" /nologo /target:winexe /langversion:Default /out:"{1}" {2} ' +
             '/reference:System.dll,System.Core.dll,System.Windows.Forms.dll,System.Drawing.dll,System.Net.Http.dll ' +
             '"{3}"'
$cmd = $cmdFormat -f $csc, $outExe, $iconArg, $cs

& cmd /c $cmd
if ($LASTEXITCODE -ne 0) { throw 'csc.exe failed (exit ' + $LASTEXITCODE + ')' }

$mb = [math]::Round((Get-Item $outExe).Length / 1KB, 1)
Write-Output "BUILT: $outExe  ($mb KB)"
