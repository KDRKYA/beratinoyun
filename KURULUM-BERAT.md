# Berat için kurulum (tek komut)

## Tek komut
Windows'ta **PowerShell**'i aç (Başlat → "PowerShell" yaz), aşağıdaki satırın **tamamını** kopyala, yapıştır, Enter'a bas:

```powershell
foreach ($p in 'OpenJS.NodeJS.LTS','Git.Git','yt-dlp.yt-dlp','Gyan.FFmpeg') { winget install -e --id $p --accept-source-agreements --accept-package-agreements }; $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User'); $d = "$env:USERPROFILE\Desktop\tiktok oyun"; if (-not (Test-Path "$d\server.js")) { git clone https://github.com/KDRKYA/beratinoyun "$d" }; Set-Location "$d"; npm.cmd install; New-Item -ItemType Directory -Force "public\video" | Out-Null; if (-not (Test-Path "public\video\gta5-mega-ramp.mp4")) { yt-dlp -f "bv*[height<=1080][vcodec^=avc1]+ba[ext=m4a]/b[height<=1080]" --merge-output-format mp4 -o "public\video\gta5-mega-ramp.mp4" "https://www.youtube.com/watch?v=xa1rM6CEkWY" }; Start-Process "$d\baslat.bat" -WorkingDirectory "$d"; Start-Sleep 5; Start-Process "http://localhost:7777/panel.html"; Start-Process "http://localhost:7777/oyun.html?arka"
```

Sırasıyla şunları yapar:
1. Gerekli ücretsiz programları kurar: Node.js, Git, yt-dlp, FFmpeg. Zaten kuruluysa atlar.
2. Oyunu masaüstüne **"tiktok oyun"** klasörüne indirir.
3. Oyunun parçalarını kurar (`npm install`).
4. Alttaki GTA videosunu YouTube'dan indirir (1–2 GB, birkaç dakika sürer).
5. Sunucuyu başlatır (açılan siyah pencereyi yayın boyunca **kapatma**).
6. Tarayıcıda paneli ve oyunu açar.

Hata çıkarsa PowerShell'i kapatıp açıp aynı komutu tekrar yapıştır; bitmiş adımları atlar, kaldığı yerden devam eder.

**Sonraki açılışlarda** sadece masaüstündeki `tiktok oyun` klasöründe **`baslat.bat`**'a çift tıkla, sonra tarayıcıda `http://localhost:7777/panel.html` ve `http://localhost:7777/oyun.html` aç.

**Yayın:** OBS → Kaynak ekle → **Tarayıcı** → adres `http://localhost:7777/oyun.html`, boyut **1080 × 1920** → Sanal kamerayı başlat → TikTok LIVE Studio'da kamera olarak OBS Virtual Camera seç.

## Videolar
| Ne | Link | Not |
|---|---|---|
| Alt video (şu an kullanılan) | https://www.youtube.com/watch?v=xa1rM6CEkWY | LennyBarn – GTA 5 RP. Komut bunu `public/video/gta5-mega-ramp.mp4` olarak indirir. İlk 15 sn panelden kesili. |
| Eski alt video | https://www.youtube.com/watch?v=74voi0vlxHE | OrbitalNCG + – GTA 5 Mega Ramp |

## Müzikler (hepsi zaten repoda, ayrıca indirmeye gerek yok)
Klasör: `public/muzik/<ülke>/`. Her ülkenin şarkıları sırayla çalar, birinci olan ülkeninki duyulur.

| Ülke | Dosya | Kaynak |
|---|---|---|
| 🇹🇷 Türkiye | 0-dombra.mp3 | https://youtu.be/_2PGR-1gl9M |
| ☀️ Kürdistan | 0-leyle-leyle.mp3 | https://youtu.be/_7wgDT8nudo |
| 🇸🇾 Suriye | 0-zdiib.mp3 | https://youtu.be/uoKU9sTyywo |
| 🇦🇫 Afganistan | 0-rabi-sakhi.mp3 | https://youtu.be/aHyAhOGXAWE |
| 🇦🇿 Azerbaycan | 0-gara-goz.mp3 | https://youtu.be/UiGrew7JIOI |
| Her ülke | pix-1-…, pix-2-… (10 şarkı) | Pixabay (ücretsiz müzik kütüphanesi) |

Daha fazla şarkı önerisi: `MUZIK-LISTESI.md`. Yeni şarkı eklemek için mp3'ü ilgili ülke klasörüne at; oyun 30 sn içinde kendisi görür. Yayındayken panelden **İstek şarkı** kutusuna YouTube linki yapıştırarak da çalabilirsin.

## Yayın kuralları
TikTok ceza vermesin diye: `YAYIN-KURALLARI.md` (başlıkta, konuşmada, yorumlarda hediye/destek isteme).
