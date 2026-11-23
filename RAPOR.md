# Son Rapor – Onay Bekliyor

## 1. Görseller (gorseller klasörü) ✅
Beş GIF de aynı yapıda: 640x360 boyutunda, her biri 30 kare ve 3 saniyelik kusursuz bir koşu döngüsü.
- Arka plan düz yeşil. Hayvanlar sağa koşuyor, ekranın ortasında kalıyor ve tamamı görünüyor.

| Dosya | Hayvan | Bayrak | Hediye (1 jeton) | Şerit |
|---|---|---|---|---|
| afghanistan.gif | Siyah panter | Afganistan (siyah–kırmızı–yeşil dikey, beyaz amblem) | Lazer Çubuğu | 1 |
| suriye.gif | Kaplan | Suriye (yeşil–beyaz–siyah, 3 kırmızı yıldız) | GG | 2 |
| kürdistan.gif | Aslan | Kürdistan (kırmızı–beyaz–yeşil, sarı güneş) | Gül | 3 |
| turkiye.gif | Gri kurt | Türkiye (kırmızı, beyaz ay-yıldız) | TikTok | 4 |
| azetbaijan.gif | Gri kurt | Azerbaycan (mavi–kırmızı–yeşil, beyaz ay-yıldız) | Dondurma Külahı | 5 |

## 2. Bayrak giydirme testi ✅
Önizleme dosyası: `onizleme/bayrak-onizleme.jpg`
- Yeşil arka plan temiz siliniyor ve **bayraklardaki yeşil bozulmuyor**.
- Bayrak kürkün dokusu ve gölgeleri korunarak giydiriliyor. Görünüm referans videodakiyle aynı tarzda.
- Oyunda yapılacak iyileştirmeler:
  - Bayrak hayvanın gövdesine sabitlenecek. Testte koşarken bayrak hafif kayıyordu.
  - Türk bayrağındaki ay-yıldız resmi oranlarına göre düzeltilecek.
  - Afgan amblemi daha detaylı çizilecek.

## 3. Oyun (referans videoya birebir)
- **Ekran:** 5 yatay şerit, aralarında parlayan mavi çizgiler, koyu lacivert ve dağ silüetli arka plan.
- **Sayaç:** Her şeridin solunda bir rozet olacak. Rozette o şeridin hediye ikonu ve toplam hediye sayısı yazacak.
- **Hayvanlar:** Sürekli koşma animasyonunda. Konumları sayıyla orantılı: lider en sağda, sayısı az olan solda.
- **Hediye gelince:**
  1. Gönderenin yuvarlak profil fotoğrafı rozetin yanında belirir.
  2. 0,3–0,5 saniyede sağa kayarak hayvanın içine girer.
  3. Sayaç 1 artar ve hayvan ileri atılır.
  4. Art arda gelen hediyelerde fotoğraflar sırayla kayar.
- **Parlama halkası:** Videodaki gibi mavi elips halka ve dönen kesikli yay.
- **Dilencilik kuralı:** Ekranda "hediye at", "gül gönder" gibi hiçbir yazı **olmayacak**. Sadece ikon ve sayı görünecek, videoda da böyle.
- **Kopyalanmayacaklar:** Orijinal yapımcının "buonsende" filigranı ve markası kullanılmayacak.

## 4. Teknik yapı (tamamı ücretsiz)
- Oyun bilgisayarda tarayıcıda çalışan bir sayfa olacak (HTML ve JavaScript).
- Hediyeler, ücretsiz **tiktok-live-connector** kütüphanesiyle TikTok kullanıcı adın üzerinden canlı olarak okunacak.
  - Uyarı: Bu kütüphane TikTok'un resmî bir aracı değil. TikTok bir değişiklik yaparsa geçici olarak bozulabilir.
- Canlı yayın açılmadan da denemek için klavyeden sahte hediye gönderme özelliği olacak (test modu). Bu tuşlar yayında görünmeyecek.
- Sayaçlar kaydedilecek, böylece yayın kapanıp açılınca sıfırlanmayacak.

## 5. Senden gereken bilgiler
1. TikTok **kullanıcı adın** (@ olmadan). Hediyeleri okumak için gerekli.
2. Yayını **nereden** açıyorsun?
   - (a) Bilgisayardan, TikTok LIVE Studio ya da OBS ile
   - (b) Telefondan
3. Sayaçlar ne zaman sıfırlansın?
   - Videoda sayılar 1000'in üzerinde, bu da birikimli olduğunu gösteriyor.
   - Öneri: Sadece sen bir tuşa bastığında sıfırlansın.

Onay verirsen kodlamaya başlarım.
