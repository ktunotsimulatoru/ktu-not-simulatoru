$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'release'))
if ([IO.Path]::GetDirectoryName($outputRoot) -ne $projectRoot) { throw 'Geçersiz paket klasörü' }
if (Test-Path -LiteralPath $outputRoot) {
    if ((Get-Item -LiteralPath $outputRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Paket klasörü bağlantı olamaz' }
} else { New-Item -ItemType Directory -Path $outputRoot | Out-Null }
function Write-Package([string]$name, [string]$sourceRoot, [array]$files) {
    $zipPath = [IO.Path]::GetFullPath((Join-Path $outputRoot $name))
    if ([IO.Path]::GetDirectoryName($zipPath) -ne $outputRoot -or $name -notin @('site.zip','worker.zip')) { throw 'Geçersiz paket yolu' }
    $stream = [IO.File]::Open($zipPath, [IO.FileMode]::Create)
    $zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Dosya bağlantı olamaz: $($file.FullName)" }
            $entry = [IO.Path]::GetRelativePath($sourceRoot, $file.FullName).Replace('\','/')
            if ($entry.StartsWith('../') -or [IO.Path]::IsPathRooted($entry)) { throw 'Paket dışında dosya' }
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $zip.Dispose(); $stream.Dispose() }
    Write-Host "Paket hazır: $zipPath"
}
$siteRoot = Join-Path $projectRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $siteRoot '.build-output'))) { throw 'Önce npm run check çalıştırın.' }
$siteFiles = @(Get-ChildItem -LiteralPath $siteRoot -File -Recurse -Force | Where-Object Name -ne '.build-output')
Write-Package 'site.zip' $siteRoot $siteFiles
$workerRoot = Join-Path $projectRoot 'worker'
$workerFiles = @((Get-Item -LiteralPath (Join-Path $workerRoot 'worker.js')), (Get-Item -LiteralPath (Join-Path $workerRoot 'wrangler.toml')))
Write-Package 'worker.zip' $workerRoot $workerFiles
