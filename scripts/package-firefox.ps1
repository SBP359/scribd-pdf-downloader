$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("scribd-downloader-firefox-" + [guid]::NewGuid().ToString("N"))
$xpiPath = Join-Path $dist "scribd-downloader-zen.xpi"

New-Item -ItemType Directory -Path $dist -Force | Out-Null
New-Item -ItemType Directory -Path $stage | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $root "manifest.json"), (Join-Path $root "constants.js"), (Join-Path $root "content.js"), (Join-Path $root "LICENSE") -Destination $stage
  Copy-Item -LiteralPath (Join-Path $root "popup") -Destination $stage -Recurse
  Copy-Item -LiteralPath (Join-Path $root "icons") -Destination $stage -Recurse

  $manifestPath = Join-Path $stage "manifest.json"
  $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
  if (-not $manifest.browser_specific_settings.gecko) {
    throw "The manifest is missing Firefox-specific metadata."
  }

  $manifest.PSObject.Properties.Remove("key")
  $manifest.PSObject.Properties.Remove("update_url")
  $manifestJson = $manifest | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $xpiPath) {
    Remove-Item -LiteralPath $xpiPath -Force
  }
  $archive = [System.IO.Compression.ZipFile]::Open(
    $xpiPath,
    [System.IO.Compression.ZipArchiveMode]::Create
  )
  try {
    Get-ChildItem -LiteralPath $stage -File -Recurse | ForEach-Object {
      $relativePath = $_.FullName.Substring($stage.Length).TrimStart([char[]]@("\", "/")).Replace("\", "/")
      $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
      $inputStream = [System.IO.File]::OpenRead($_.FullName)
      $outputStream = $entry.Open()
      try {
        $inputStream.CopyTo($outputStream)
      } finally {
        $outputStream.Dispose()
        $inputStream.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }

  Write-Output "Created Firefox-compatible add-on package: $xpiPath"
} finally {
  if (Test-Path -LiteralPath $stage) {
    Remove-Item -LiteralPath $stage -Recurse -Force
  }
}
