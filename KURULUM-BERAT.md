# Berat için kurulum (tek komut)

## Tek komut
Windows'ta **PowerShell**'i aç (Başlat → "PowerShell" yaz), bu satırı yapıştır, Enter'a bas:

```powershell
irm https://raw.githubusercontent.com/KDRKYA/beratinoyun/main/kur.ps1 | iex
```

Sırasıyla şunları yapar (ayrıntısı `kur.ps1` dosyasında):
1. Gerekli ücretsiz programları kurar: Node.js, Git, yt-dlp, FFmpeg. Zaten kuruluysa atlar.
2. Oyunu masaüstüne **"tiktok oyun"** klasörüne indirir.
3. Oyunun parçalarını kurar (`npm install`).
4. **İki videoyu** YouTube'dan indirir (büyük dosyalar, birkaç dakika sürer).
5. **Her ülkeye 5 şarkı** olacak şekilde şarkıları YouTube'dan indirir (her ülkenin 0. şarkısı zaten oyunla geliyor, 1-4 iner).
6. Sunucuyu başlatır (açılan siyah pencereyi yayın boyunca **kapatma**).
7. Tarayıcıda paneli ve oyunu açar.

Hata çıkarsa PowerShell'i kapatıp açıp aynı komutu tekrar yapıştır; bitmiş adımları atlar, kaldığı yerden devam eder.

**Sonraki açılışlarda** sadece masaüstündeki `tiktok oyun` klasöründe **`baslat.bat`**'a çift tıkla, sonra tarayıcıda `http://localhost:7777/panel.html` ve `http://localhost:7777/oyun.html` aç.

**Yayın:** OBS → Kaynak ekle → **Tarayıcı** → adres `http://localhost:7777/oyun.html`, boyut **1080 × 1920** → Sanal kamerayı başlat → TikTok LIVE Studio'da kamera olarak OBS Virtual Camera seç.

## Videolar
| Ne | Link | Not |
|---|---|---|
| Alt video (şu an kullanılan) | https://www.youtube.com/watch?v=xa1rM6CEkWY | LennyBarn – GTA 5 RP. Komut bunu `public/video/gta5-mega-ramp.mp4` olarak indirir. İlk 15 sn panelden kesili. |
| Eski alt video | https://www.youtube.com/watch?v=74voi0vlxHE | OrbitalNCG + – GTA 5 Mega Ramp |

## Müzikler (her ülkeye 5)
Klasör: `public/muzik/<ülke>/`. Her ülkenin şarkıları sırayla çalar, birinci olan ülkeninki duyulur. 0. şarkılar oyunla gelir, 1-4 komutla iner. "arama" yazanlar YouTube'da aranıp ilk sonuç indirilir.

| Ülke | 0 (oyunla gelir) | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| 🇹🇷 Türkiye | [Dombra](https://youtu.be/_2PGR-1gl9M) | [Ölürüm Türkiyem remix](https://youtu.be/8mIFWRadck4) | Ceddin Deden remix (arama) | [Gaza getiren tulum](https://youtu.be/AWMCBDU9fgk) | [Ölürüm Türkiyem](https://youtu.be/4P2kbm76REw) |
| ☀️ Kürdistan | [Leyle Leyle](https://youtu.be/_7wgDT8nudo) | [Delilo – Aylin Demir](https://youtu.be/tTTDFRJXBCE) | [Ka Bıdın Zarokatiye](https://youtu.be/uJkJBBHoDt4) | [Lêxe 2 trap remix](https://youtu.be/imqkAsEHaK0) | Kurdish halay remix (arama) |
| 🇸🇾 Suriye | [Zdiib](https://youtu.be/uoKU9sTyywo) | [Dabka TikTok trend](https://youtu.be/-sH3O_T1MIE) | [Cennet cennet](https://youtu.be/TeK13YNzoRw) | Syrian dabke remix (arama) | Syrian wedding dabke (arama) |
| 🇦🇫 Afganistan | [Rabi Sakhi](https://youtu.be/aHyAhOGXAWE) | [Homayun mast mix](https://youtu.be/2T8yPRKSuJs) | [Sorosh Moheb – Attan](https://youtu.be/OivMaH-YcYI) | [JanNan Pashto fast](https://youtu.be/MV2gpWF2MtA) | Afghan attan remix (arama) |
| 🇦🇿 Azerbaycan | [Gara Göz](https://youtu.be/UiGrew7JIOI) | [Azeri remix](https://youtu.be/epzpl4k2Kq8) | [Getme remix](https://youtu.be/ypbopjISWPw) | [Qarabağ](https://youtu.be/UukQT_ngHD0) | [Karabakh trap remix](https://youtu.be/A4UcdW5xEns) |

15 dakikadan uzun olanlar (saatlik mix) inmez, atlanır. Oyunla gelen Pixabay şarkıları (pix-…) her ülkenin `eski` klasörüne kaldırılır; geri istersen oradan ülke klasörüne taşı.

Daha fazla şarkı önerisi: `MUZIK-LISTESI.md`. Yeni şarkı eklemek için mp3'ü ilgili ülke klasörüne at; oyun 30 sn içinde kendisi görür. Yayındayken panelden **İstek şarkı** kutusuna YouTube linki yapıştırarak da çalabilirsin.

## Yayın kuralları
TikTok ceza vermesin diye: `YAYIN-KURALLARI.md` (başlıkta, konuşmada, yorumlarda hediye/destek isteme).
