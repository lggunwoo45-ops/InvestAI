param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\release')
)

$ErrorActionPreference = 'Stop'
$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
$systemTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stagingRoot = Join-Path $systemTempRoot ('InvestAI-v0.6.0-build-' + [Guid]::NewGuid().ToString('N'))
$siteArchive = Join-Path $stagingRoot 'site.zip'
$demoExe = Join-Path $outputRoot 'InvestAI_v0.6.0_demo.exe'
$portableRoot = Join-Path $stagingRoot 'InvestAI_v0.6.0_portable'
$portableZip = Join-Path $outputRoot 'InvestAI_v0.6.0_portable.zip'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'

if (-not (Test-Path -LiteralPath $compiler)) {
  throw 'The Windows C# compiler required for the demo launcher is unavailable.'
}

New-Item -ItemType Directory -Force -Path $stagingRoot, $outputRoot, $portableRoot | Out-Null

try {
  Push-Location $frontendRoot
  try { npm run build } finally { Pop-Location }

  Compress-Archive -Path (Join-Path $frontendRoot 'dist\*') -DestinationPath $siteArchive -CompressionLevel Optimal
  & $compiler /nologo /target:winexe /optimize+ /out:$demoExe /resource:"$siteArchive,InvestAI.Site" /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll (Join-Path $frontendRoot 'desktop\Launcher.cs')
  if ($LASTEXITCODE -ne 0) { throw 'Windows demo compilation failed.' }

  Copy-Item -LiteralPath $demoExe -Destination (Join-Path $portableRoot 'InvestAI_v0.6.0_demo.exe')
  @(
    'InvestAI v0.6.0 Portable Demo'
    ''
    'Run InvestAI_v0.6.0_demo.exe. The demo starts a private local web server and opens InvestAI in your default browser.'
    'Close the InvestAI demo process from Task Manager when finished.'
    'LIVE market data requires an internet connection. MOCK mode remains available offline.'
  ) | Set-Content -LiteralPath (Join-Path $portableRoot 'README.txt') -Encoding UTF8
  Compress-Archive -Path (Join-Path $portableRoot '*') -DestinationPath $portableZip -CompressionLevel Optimal -Force

  Get-Item -LiteralPath $demoExe, $portableZip | Select-Object FullName, Length, LastWriteTime
}
finally {
  $resolvedStagingRoot = [IO.Path]::GetFullPath($stagingRoot)
  if ($resolvedStagingRoot.StartsWith($systemTempRoot, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedStagingRoot -Leaf).StartsWith('InvestAI-v0.6.0-build-') -and (Test-Path -LiteralPath $resolvedStagingRoot)) {
    Remove-Item -LiteralPath $resolvedStagingRoot -Recurse -Force
  }
}
