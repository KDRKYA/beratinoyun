# Kurulum: Oyun → OBS → Sanal Kamera → TikTok LIVE Studio

Hedef çözünürlük her yerde aynı: **1080 × 1920 (dikey)**. Görüntünün net olması için zincirin hiçbir yerinde ölçekleme yapılmamalı.

## 1. Oyunu başlat
1. `baslat.bat` dosyasına çift tıkla. Siyah bir pencere açılır. **Yayın boyunca bu pencereyi kapatma.**
2. Panel kendiliğinden açılır: `http://localhost:7777/panel.html`
3. Panelde TikTok kullanıcı adını yaz ve **Bağlan**'a bas. Yayın açık değilse bağlanamaz. Sorun değil, yayın açılana kadar kendi kendine tekrar dener.

## 2. OBS Studio ayarları
**Ayarlar → Video**
- Temel (Tuval) Çözünürlüğü: `1080x1920`
- Çıkış (Ölçeklenmiş) Çözünürlüğü: `1080x1920`
- Ortak FPS Değerleri: `30` (bilgisayar güçlüyse `60`)

**Sahne:** Yeni bir sahne aç, adı "Yarış" olsun. Kaynaklar **alttan üste** şu sırayla eklenecek:
1. *(Alt alan için. Karar verince eklenecek.)* **Medya Kaynağı**: döngü video.
   - "Döngü" seçeneği açık olsun.
   - Konumu: Sahnenin alt kısmı (Y = 985'ten aşağısı, 1080 × 935).
2. **Tarayıcı** kaynağı (oyun):
   - URL: `http://localhost:7777/oyun.html`
   - Genişlik `1080`, Yükseklik `1920`
   - "Özel kare hızı kullan" seçeneğini aç ve OBS ile aynı FPS'i yaz (30 ya da 60).
   - "Görünür değilken kaynağı kapat" seçeneği **KAPALI** olsun.
   - Ekledikten sonra kaynağa sağ tıkla → **Dönüştür → Dönüşümü sıfırla**. Böylece birebir 1080×1920 kalır ve ölçeklenmez.
   - **"Sesi OBS ile kontrol et" seçeneğini AÇ.** Jeton tık sesi bu sayede OBS'e ve yayına gider. Ses Mikseri'nde "Tarayıcı" kanalı görünür.
   - Oyunun alt kısmı şeffaftır. Alttaki video bu şeffaf alandan görünür.

**Sanal kamera:** OBS ana penceresinde sağ alttaki **Sanal Kamerayı Başlat**'a bas.
- Yanındaki dişli simgesine tıkla. Çıkış türü: **Program** olsun.

## 3. TikTok LIVE Studio ayarları
1. Yayın düzenini **Dikey (Portrait)** yap.
2. **Kaynak ekle → Kamera** seçeneğini seç, cihaz olarak **OBS Virtual Camera**'yı seç.
3. Kamera ayarlarında:
   - Çözünürlük: listedeki en yüksek seçenek ya da `1080x1920`.
   - **Ayna (Mirror) KAPALI.** Açık kalırsa her şey ters görünür.
   - Kaynağı tuvale tam oturt. Gerekirse sağ tık → "Tuvale sığdır".
4. Yayın kalitesi: `1080p`, `30 fps` (ya da 60), izin verilen en yüksek bit hızı.

## Netlik kontrol listesi
- OBS tuvali, OBS çıkışı ve tarayıcı kaynağı: hepsi 1080×1920 ✔
- Tarayıcı kaynağı "Dönüşümü sıfırla" ile birebir boyutta ✔
- LIVE Studio'da kamera kaynağı tuvali tam kaplıyor, büyütülüp küçültülmemiş ✔
- Görüntü bulanıksa: OBS → Ayarlar → Video → Küçültme filtresi: **Lanczos**.

## Sorun giderme
- **Oyun ekranı boş ya da siyah:** `baslat.bat` penceresi açık mı? Değilse yeniden başlat. Sonra OBS'de tarayıcı kaynağına sağ tıkla → **Yenile**.
- **LIVE Studio'da görüntü yatay ya da kenarları siyah:** Önce OBS'deki sanal kamerayı durdur, sonra yeniden başlat. Ardından LIVE Studio'da kamera kaynağını silip yeniden ekle.
- **Hediyeler gelmiyor:** Paneldeki bağlantı durumuna bak. "Bağlı" yazmıyorsa yayının açık olduğundan emin ol ve **Bağlan**'a bas.
- **Bir hediye yanlış şeride gidiyor:** Panel → *Hediye eşleştirme* bölümünden doğru şeridi seç.
