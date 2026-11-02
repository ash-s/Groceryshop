# Builds the whole shop into ONE desktop program.
#
#   Result: grocery-backend/target/backend-1.0.0.jar
#
#   That single file contains the API, the database migrations, AND the web app.
#   The client double-clicks a launcher and everything runs locally — no Node,
#   no separate servers, no internet.
#
# Usage:  powershell -ExecutionPolicy Bypass -File build-desktop.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$fe   = Join-Path $root 'grocery-frontend'
$be   = Join-Path $root 'grocery-backend'
$static = Join-Path $be 'src\main\resources\static'

# 1) Java for the backend build
$javaHome = Get-ChildItem 'D:\Development Tools\sts-*\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_*\jre' -Directory -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $javaHome) { throw 'Java runtime not found.' }
$env:JAVA_HOME = $javaHome
Write-Output "JAVA_HOME = $env:JAVA_HOME"

# 2) Maven
$mavenHome = Join-Path $env:LOCALAPPDATA 'Temp\opencode\maven\apache-maven-3.9.9'
if (-not (Test-Path (Join-Path $mavenHome 'bin\mvn.cmd'))) { throw "Maven not found at $mavenHome" }
$mvn = Join-Path $mavenHome 'bin\mvn.cmd'

# 3) Frontend -> static folder served by the backend
Write-Output '--- building frontend ---'
Push-Location $fe
& npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
Pop-Location

if (Test-Path $static) { Remove-Item $static -Recurse -Force }
New-Item -ItemType Directory -Path $static -Force | Out-Null
Copy-Item -Path (Join-Path $fe 'dist\*') -Destination $static -Recurse -Force
Write-Output ("frontend copied into backend static (" + (Get-ChildItem $static -Recurse -File).Count + " files)")

# 4) Backend jar (migrations + API + web app in one file)
Write-Output '--- building backend ---'
Push-Location $be
& $mvn -B -ntp -DskipTests package
$code = $LASTEXITCODE
Pop-Location

$jar = Join-Path $be 'target\backend-1.0.0.jar'
if (Test-Path $jar) {
    $mb = [math]::Round((Get-Item $jar).Length / 1MB, 1)
    Write-Output "READY: $jar  ($mb MB)"
} else {
    throw "Jar not produced (mvn exit $code)."
}
