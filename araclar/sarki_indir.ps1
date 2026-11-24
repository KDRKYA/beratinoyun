# Her ulke icin 5 sarki: klasordeki "0-..." sarki (senin sectigin) kalir + 4 yeni sarki indirilir.
# Eski "pix-..." sarkilari silinmez, ulke klasorundeki "eski" klasorune tasinir.
# Ayrica public\muzik.js GitHub'dan guncellenir (sarkilar 40 sn calip siradakine gecsin diye).
# Calistir: powershell -ExecutionPolicy Bypass -File araclar\sarki_indir.ps1
$ErrorActionPreference = 'Continue'
$kok = Split-Path $PSScriptRoot -Parent
$muzik = Join-Path $kok 'public\muzik'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command yt-dlp -ErrorAction SilentlyContinue)) { Write-Host 'yt-dlp bulunamadi. Once: winget install yt-dlp.yt-dlp' -ForegroundColor Red; exit 1 }
$ffmpeg = [bool](Get-Command ffmpeg -ErrorAction SilentlyContinue)
if ($ffmpeg) { $bicim = @('-x', '--audio-format', 'mp3', '--audio-quality', '2') } else { $bicim = @('-f', 'ba[ext=m4a]/ba') }

# 1) Yeni muzik.js
$js = Join-Path $kok 'public\muzik.js'
try {
  Copy-Item $js "$js.yedek" -Force -ErrorAction SilentlyContinue
  Invoke-WebRequest 'https://raw.githubusercontent.com/KDRKYA/tiktok-oyun/lazer-cubugu-esle/public/muzik.js' -OutFile $js -UseBasicParsing
  Write-Host 'muzik.js guncellendi' -ForegroundColor Green
} catch { Write-Host "muzik.js indirilemedi: $_" -ForegroundColor Red }

# 2) Sarki listesi: [dosya adi, YouTube linki ya da "ara:" ile arama]
$liste = [ordered]@{
  'turkiye' = @(
    @('1-olurum-turkiyem-remix', 'https://youtu.be/8mIFWRadck4'),
    @('2-ceddin-deden-remix',    'ara:Ceddin Deden mehter remix'),
    @('3-gaza-getiren-tulum',    'https://youtu.be/AWMCBDU9fgk'),
    @('4-olurum-turkiyem',       'https://youtu.be/4P2kbm76REw'))
  'kurdistan' = @(
    @('1-delilo-aylin-demir',    'https://youtu.be/tTTDFRJXBCE'),
    @('2-ka-bidin-zarokatiye',   'https://youtu.be/uJkJBBHoDt4'),
    @('3-lexe-2-trap-remix',     'https://youtu.be/imqkAsEHaK0'),
    @('4-kurdish-halay-remix',   'ara:Kurdish halay remix 2025'))
  'suriye' = @(
    @('1-dabke-tiktok-trend',    'https://youtu.be/-sH3O_T1MIE'),
    @('2-cennet-cennet',         'https://youtu.be/TeK13YNzoRw'),
    @('3-syrian-dabke-remix',    'ara:Syrian dabke remix'),
    @('4-syrian-wedding-dabke',  'ara:Syrian wedding dabke'))
  'afghanistan' = @(
    @('1-homayun-mast-mix',      'ara:Homayun Sahebzai mast pashto song'),
    @('2-sorosh-moheb-attan',    'https://youtu.be/OivMaH-YcYI'),
    @('3-jannan-pashto-fast',    'https://youtu.be/MV2gpWF2MtA'),
    @('4-afghan-attan-remix',    'ara:Afghan attan song remix'))
  'azerbaycan' = @(
    @('1-azeri-remix',           'https://youtu.be/epzpl4k2Kq8'),
    @('2-getme-remix',           'ara:Sovket Elekberova Getme remix'),
    @('3-qarabag',               'https://youtu.be/UukQT_ngHD0'),
    @('4-karabakh-trap-remix',   'https://youtu.be/A4UcdW5xEns'))
}

$sonuc = @()
foreach ($ulke in $liste.Keys) {
  $klasor = Join-Path $muzik $ulke
  New-Item -ItemType Directory -Force -Path $klasor | Out-Null
  # eski pix-... sarkilarini "eski" klasorune tasi (oyun alt klasorleri calmaz)
  $eski = Join-Path $klasor 'eski'
  Get-ChildItem $klasor -File | Where-Object { $_.Name -notmatch '^(0-|[1-4]-|mars)' -and $_.Extension -match '\.(mp3|m4a|wav|ogg|webm|aac)$' } | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $eski | Out-Null
    Move-Item -LiteralPath $_.FullName -Destination (Join-Path $eski $_.Name) -Force
  }
  foreach ($s in $liste[$ulke]) {
    $ad = $s[0]; $kaynak = $s[1]
    if (Get-ChildItem $klasor -File -Filter "$ad.*" -ErrorAction SilentlyContinue) { $sonuc += "VAR      $ulke / $ad"; continue }
    Write-Host "`n>>> $ulke / $ad" -ForegroundColor Cyan
    $cikti = Join-Path $klasor "$ad.%(ext)s"
    if ($kaynak.StartsWith('ara:')) {
      $sorgu = 'ytsearch8:' + $kaynak.Substring(4)
      & yt-dlp @bicim --no-playlist --match-filter 'duration > 90 & duration < 480' --max-downloads 1 -o $cikti $sorgu
    } else {
      & yt-dlp @bicim --no-playlist -o $cikti $kaynak
    }
    if (Get-ChildItem $klasor -File -Filter "$ad.*" -ErrorAction SilentlyContinue) { $sonuc += "INDI     $ulke / $ad" } else { $sonuc += "OLMADI   $ulke / $ad" }
  }
}

Write-Host "`n================ SONUC ================" -ForegroundColor Yellow
$sonuc | ForEach-Object { if ($_ -like 'OLMADI*') { Write-Host $_ -ForegroundColor Red } else { Write-Host $_ -ForegroundColor Green } }
Write-Host "`nBitti. OBS'te oyun kaynagina sag tik > Yenile. Sunucuyu kapatmana gerek yok." -ForegroundColor Yellow
