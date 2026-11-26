# Sadece sarkilari indirir (her ulkeye 5). Kullanim: irm https://raw.githubusercontent.com/KDRKYA/beratinoyun/main/sarki-indir.ps1 | iex
Set-Location (Join-Path $env:USERPROFILE 'Desktop\tiktok oyun')
$sarkilar = [ordered]@{
  'turkiye/1-olurum-turkiyem-remix'      = 'https://youtu.be/8mIFWRadck4'
  'turkiye/2-ceddin-deden-remix'         = 'ytsearch1:ceddin deden remix'
  'turkiye/3-gaza-getiren-tulum'         = 'https://youtu.be/AWMCBDU9fgk'
  'turkiye/4-olurum-turkiyem'            = 'https://youtu.be/4P2kbm76REw'
  'kurdistan/1-delilo-aylin-demir'       = 'https://youtu.be/tTTDFRJXBCE'
  'kurdistan/2-ka-bidin-zarokatiye'      = 'https://youtu.be/uJkJBBHoDt4'
  'kurdistan/3-lexe-2-trap-remix'        = 'https://youtu.be/imqkAsEHaK0'
  'kurdistan/4-kurdish-halay-remix'      = 'ytsearch1:kurdish halay remix'
  'suriye/1-dabka-tiktok-trend'          = 'https://youtu.be/-sH3O_T1MIE'
  'suriye/2-cennet-cennet'               = 'https://youtu.be/TeK13YNzoRw'
  'suriye/3-syrian-dabke-remix'          = 'ytsearch1:syrian dabke remix'
  'suriye/4-syrian-wedding-dabke'        = 'ytsearch1:syrian wedding dabke'
  'afghanistan/1-homayun-mast-mix'       = 'https://youtu.be/2T8yPRKSuJs'
  'afghanistan/2-sorosh-moheb-attan'     = 'https://youtu.be/OivMaH-YcYI'
  'afghanistan/3-jannan-pashto-fast'     = 'https://youtu.be/MV2gpWF2MtA'
  'afghanistan/4-afghan-attan-remix'     = 'ytsearch1:afghan attan remix'
  'azerbaycan/1-azeri-remix'             = 'https://youtu.be/epzpl4k2Kq8'
  'azerbaycan/2-getme-remix'             = 'https://youtu.be/ypbopjISWPw'
  'azerbaycan/3-qarabag'                 = 'https://youtu.be/UukQT_ngHD0'
  'azerbaycan/4-karabakh-trap-remix'     = 'https://youtu.be/A4UcdW5xEns'
}
foreach ($s in $sarkilar.GetEnumerator()) {
  $hedef = "public\muzik\$($s.Key)"
  if (-not (Test-Path "$hedef.mp3")) {
    # 15 dakikadan uzun videolar (saatlik mix) atlanir: oyunu yavaslatmasin
    yt-dlp --no-playlist -x --audio-format mp3 --audio-quality 5 --match-filter 'duration<900' -o "$hedef.%(ext)s" $s.Value
  }
}
# Pixabay sarkilari kenara (her ulkede tam 5 sarki kalsin). Silinmez, ulke klasorundeki "eski" klasorune gider.
Get-ChildItem 'public\muzik' -Recurse -Filter 'pix-*.mp3' | Where-Object { $_.Directory.Name -ne 'eski' } | ForEach-Object {
  $e = Join-Path $_.DirectoryName 'eski'; New-Item -ItemType Directory -Force $e | Out-Null; Move-Item $_.FullName $e -Force
}
Write-Host 'Sarkilar hazir. Oyun 30 sn icinde kendisi gorur.' -ForegroundColor Green
