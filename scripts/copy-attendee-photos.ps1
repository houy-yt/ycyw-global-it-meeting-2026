$src = 'D:\YCYW Other Work\2026 Global IT Meeting\参会人员照片'
$dst = 'd:\TFS\AI\YCYW 2026 Global IT Meeting\frontend\public\attendees'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Get-ChildItem -Recurse -File $src | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dst $_.Name) -Force
}
Get-ChildItem $dst | Select-Object -ExpandProperty Name
