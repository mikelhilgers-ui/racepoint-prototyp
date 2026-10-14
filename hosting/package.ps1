$ErrorActionPreference = 'Stop'
$racepointRoot = Split-Path -Parent $PSScriptRoot
$racepointMetaPath = Join-Path $racepointRoot '.build/latest.json'
$racepointMeta = Get-Content -LiteralPath $racepointMetaPath -Raw -Encoding UTF8 | ConvertFrom-Json
$racepointStage = (Resolve-Path -LiteralPath $racepointMeta.stage).Path
$racepointZipPath = $racepointStage + '-linux-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '.zip'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$racepointArchive = [IO.Compression.ZipFile]::Open($racepointZipPath, [IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $racepointStage -File -Recurse | ForEach-Object {
        $racepointEntryName = $_.FullName.Substring($racepointStage.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($racepointArchive, $_.FullName, $racepointEntryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $racepointArchive.Dispose() }
$racepointCheck = [IO.Compression.ZipFile]::OpenRead($racepointZipPath)
try {
    if (@($racepointCheck.Entries | Where-Object { $_.FullName.Contains('\') }).Count) { throw 'ZIP enthält Windows-Pfadtrenner.' }
    if (-not $racepointCheck.GetEntry('hosting/http.mjs')) { throw 'Serverdatei fehlt im ZIP.' }
} finally { $racepointCheck.Dispose() }
$racepointMeta | Add-Member -NotePropertyName zip -NotePropertyValue $racepointZipPath -Force
[IO.File]::WriteAllText($racepointMetaPath, ($racepointMeta | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
Write-Output $racepointZipPath
