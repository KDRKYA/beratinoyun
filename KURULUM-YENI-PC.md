# Yeni bilgisayarda kurulum

Claude'a "kur ve aç" demen yeterli; aşağıdakileri o yapar. Elle yapmak istersen sırası:

1. **Gerekli programlar** (ücretsiz): Node.js LTS, Git, Python 3 (sadece araçlar için), Google Chrome.
   ```powershell
   winget install OpenJS.NodeJS.LTS Git.Git GitHub.cli yt-dlp.yt-dlp
   ```
2. **Projeyi indir** (masaüstüne):
   ```powershell
   cd $env:USERPROFILE\Desktop
   gh repo clone <kullanici>/tiktok-oyun "tiktok oyun"
   cd "tiktok oyun"
   npm install
   ```
3. **Alt videoyu indir** (2 GB, GitHub'a sığmadığı için repoda yok). Telifsiz, kanal: OrbitalNCG + (yayın açıklamasında adını an):
   ```powershell
   yt-dlp -f "bv*[height<=1080][vcodec^=avc1]+ba[ext=m4a]/b[height<=1080]" --merge-output-format mp4 -o "public/video/gta5-mega-ramp.mp4" "https://www.youtube.com/watch?v=74voi0vlxHE"
   ```
4. **Sunucuyu başlat**: `baslat.bat` (penceresini yayın boyunca kapatma).
5. **Oyun** (sesli, tam ekran Chrome):
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="$env:LOCALAPPDATA\tiktok-oyun-chrome" --autoplay-policy=no-user-gesture-required --start-fullscreen --app=http://localhost:7777/oyun.html?arka
   ```
6. **Panel**: `http://localhost:7777/panel.html` (telefondan: panelin üstünde yazan adres; aynı Wi-Fi).
7. **Yayın**: OBS → Tarayıcı kaynağı `http://localhost:7777/oyun.html` (1080 × 1920) → Sanal kamera → TikTok LIVE Studio.

Notlar
- Puanlar ve ses ayarı `veri/` klasöründe tutulur (repoda yok); yeni bilgisayarda sıfırdan başlar.
- Windows güvenlik duvarı ilk açılışta Node için izin sorar; telefondan panel için "Özel ağ"a izin ver.
