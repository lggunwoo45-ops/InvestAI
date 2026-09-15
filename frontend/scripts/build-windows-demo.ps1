param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\release')
)

$ErrorActionPreference = 'Stop'
$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
$systemTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stagingRoot = Join-Path $systemTempRoot ('InvestAI-v0.6.2-build-' + [Guid]::NewGuid().ToString('N'))
$siteArchive = Join-Path $stagingRoot 'site.zip'
$demoExe = Join-Path $outputRoot 'InvestAI_v0.6.2_demo.exe'
$portableRoot = Join-Path $stagingRoot 'InvestAI_v0.6.2_portable'
$portableZip = Join-Path $outputRoot 'InvestAI_v0.6.2_portable.zip'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'

if (-not (Test-Path -LiteralPath $compiler)) {
  throw 'The Windows C# compiler required for the demo launcher is unavailable.'
}

New-Item -ItemType Directory -Force -Path $stagingRoot, $outputRoot, $portableRoot | Out-Null

try {
  Push-Location $frontendRoot
  try { npm run build } finally { Pop-Location }

  Compress-Archive -Path (Join-Path $frontendRoot 'dist\*') -DestinationPath $siteArchive -CompressionLevel Optimal
  & $compiler /nologo /target:winexe /optimize+ /out:$demoExe /resource:"$siteArchive,InvestAI.Site" /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /reference:System.Windows.Forms.dll (Join-Path $frontendRoot 'desktop\Launcher.cs')
  if ($LASTEXITCODE -ne 0) { throw 'Windows demo compilation failed.' }

  Copy-Item -LiteralPath $demoExe -Destination (Join-Path $portableRoot 'InvestAI_v0.6.2_demo.exe')
  Copy-Item -LiteralPath (Join-Path $frontendRoot 'desktop\README.demo.txt') -Destination (Join-Path $portableRoot 'README.txt')
  Compress-Archive -Path (Join-Path $portableRoot '*') -DestinationPath $portableZip -CompressionLevel Optimal -Force

  Get-Item -LiteralPath $demoExe, $portableZip | Select-Object FullName, Length, LastWriteTime
}
finally {
  $resolvedStagingRoot = [IO.Path]::GetFullPath($stagingRoot)
  if ($resolvedStagingRoot.StartsWith($systemTempRoot, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedStagingRoot -Leaf).StartsWith('InvestAI-v0.6.2-build-') -and (Test-Path -LiteralPath $resolvedStagingRoot)) {
    Remove-Item -LiteralPath $resolvedStagingRoot -Recurse -Force
  }
}
