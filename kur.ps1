# TikTok yaris oyunu - tek komutla kurulum
# Kullanim (PowerShell):  irm https://raw.githubusercontent.com/KDRKYA/beratinoyun/main/kur.ps1 | iex
# Yaptiklari: gerekli programlar -> oyun -> 2 video -> her ulkeye 5 sarki -> sunucu + panel + oyun
# Tekrar calistirilabilir: inmis olanlari atlar, kaldigi yerden devam eder.

$ErrorActionPreference = 'Continue'
function Adim($m) { Write-Host ''; Write-Host "==> $m" -ForegroundColor Cyan }

Adim 'Gerekli programlar kuruluyor (Node.js, Git, yt-dlp, FFmpeg)'
foreach ($p in 'OpenJS.NodeJS.LTS', 'Git.Git', 'yt-dlp.yt-dlp', 'Gyan.FFmpeg') {
  winget install -e --id $p --accept-source-agreements --accept-package-agreements
}
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

Adim 'Oyun indiriliyor (Masaustu\tiktok oyun)'
$d = Join-Path $env:USERPROFILE 'Desktop\tiktok oyun'
if (-not (Test-Path "$d\server.js")) { git clone https://github.com/KDRKYA/beratinoyun "$d" } else { git -C "$d" pull }
Set-Location $d
npm.cmd install

Adim 'Videolar indiriliyor (buyuk dosyalar, birkac dakika surebilir)'
New-Item -ItemType Directory -Force 'public\video' | Out-Null
$videolar = [ordered]@{
  'gta5-mega-ramp.mp4'      = 'https://www.youtube.com/watch?v=xa1rM6CEkWY'   # su an kullanilan (LennyBarn - GTA 5 RP)
  'gta5-mega-ramp-eski.mp4' = 'https://www.youtube.com/watch?v=74voi0vlxHE'   # eski (OrbitalNCG + - GTA 5 Mega Ramp)
}
foreach ($v in $videolar.GetEnumerator()) {
  if (-not (Test-Path "public\video\$($v.Key)")) {
    yt-dlp -f 'bv*[height<=1080][vcodec^=avc1]+ba[ext=m4a]/b[height<=1080]' --merge-output-format mp4 -o "public\video\$($v.Key)" $v.Value
  }
}

Adim 'Sarkilar indiriliyor (her ulkeye 5 sarki)'
# 0-... sarkilar zaten oyunla geliyor. 1-4 buradan iner. "ytsearch1:" = YouTube'da arayip ilk sonucu indir.
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

Adim 'Oyun baslatiliyor'
Start-Process "$d\baslat.bat" -WorkingDirectory $d
Start-Sleep 5
Start-Process 'http://localhost:7777/panel.html'
Start-Process 'http://localhost:7777/oyun.html?arka'
Write-Host ''
Write-Host 'Hazir! Siyah sunucu penceresini yayin boyunca kapatma.' -ForegroundColor Green
Write-Host 'Sonraki seferler: Masaustu\tiktok oyun\baslat.bat' -ForegroundColor Green
