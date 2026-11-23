# Sorunlar ve Olası Çözümler

## 1. Alttaki GTA görüntüsü ne olacak? ⚠️ (karar senin)
**Durum:** Referans videoda ekranın üst yarısında oyun, alt yarısında GTA oynanışı var. Bu büyük ihtimalle bir **"canlılık" önlemi**. TikTok; sabit görüntü, döngüye alınmış video ya da önceden kaydedilmiş içerik gösteren yayınları **"özgün olmayan içerik"** sayıp kısıtlayabiliyor (öne çıkarmama, uyarı).
**Olası çözümler:**
- **A) Altta gerçekten GTA (ya da başka bir oyun) oynamak:** Canlı oynanış olduğu için en güvenli seçenek. Ancak bilgisayarın hem oyunu hem yayını kaldırması gerekiyor.
- **B) Altta kamera (yüzün ya da masan):** Canlı ve özgün içerik, kısıtlamaya takılma riski en düşük seçenek. Bilgisayara yük bindirmez.
- **C) Altta kayıtlı bir GTA videosunu döngüde oynatmak:** En kolayı ama **riskli**. TikTok bunu "önceden kaydedilmiş içerik" olarak algılayabilir. Önermiyorum.
- **D) Oyunu tam ekrana büyütmek ve alt alanı kaldırmak:** Sade bir görüntü olur ama ekranda hareket yalnızca hediye geldiğinde olur, bu da kısıtlama riskini artırır.
**Önerim:** A ya da B. LIVE Studio'da bunları ayrı katmanlar olarak üst üste koyacağız: üstte oyun, altta oyun yakalama ya da kamera.

## 2. Oyunu LIVE Studio'ya nasıl alacağız?
**Durum:** Oyun bilgisayarda bir web sayfası olarak çalışacak.
**Olası çözümler:**
- **A) Pencere yakalama:** Oyunu ayrı ve çerçevesiz bir tarayıcı penceresinde açarız (Chrome "uygulama modu"). LIVE Studio'da "Pencere yakalama" ile bu pencereyi seçeriz.
- **B) Ekranın bir bölgesini yakalama:** Daha basit ama pencere kayarsa görüntü bozulur.
**Önerim:** A. Kurulum adımlarını sana ayrıca yazacağım.
**Not:** LIVE Studio'yu kullanabilmek için hesabında LIVE yetkisi olması gerekiyor. Hesabında açık değilse bunu TikTok'tan başvurarak açman lazım.

## 3. Hediyeleri TikTok'tan nasıl okuyacağız?
**Durum:** TikTok'un herkese açık, resmî bir hediye okuma aracı yok.
**Olası çözümler:**
- **A) tiktok-live-connector (ücretsiz, açık kaynak):** Kullanıcı adınla yayına bağlanır; hediyeyi, gönderenin adını ve profil fotoğrafını verir. Ancak resmî değil, TikTok bir şey değiştirirse birkaç gün bozulabilir. Bağlantı için ücretsiz bir imza servisi kullanıyor, bu servisin günlük bir limiti olabilir.
- **B) TikFinity gibi hazır programlar:** Bazı özellikleri paralı. Senin "ücretli bir şey önerme" kuralın yüzünden önermiyorum.
**Önerim:** A. Bağlantı koparsa otomatik olarak yeniden bağlanacak; o sırada oyun donmadan çalışmaya devam edecek.

## 4. Kombo (seri) hediyeler yanlış sayılabilir
**Durum:** Gül gibi hediyeler arka arkaya basılınca "x63" gibi seri halinde geliyor. Yanlış kodlanırsa aynı hediye birden fazla kez sayılır.
**Çözüm:** Her hediye olayında serideki **artış miktarını** sayacağız. Testte bunu ayrıca kontrol edeceğim.

## 5. Hediye ikonları
**Durum:** Önizlemedeki ikonlar yer tutucu (🌹, 🍦, GG...).
**Çözüm:** Yayında TikTok'un gönderdiği **gerçek hediye resimleri** otomatik olarak kullanılacak. TikTok hediye adlarını dile göre değiştirebiliyor. Bu yüzden eşleştirmeyi ada göre değil, **hediye numarasına (ID)** göre yapacağız. Numaraları ilk testte, sen her hediyeden bir tane atınca kaydedeceğim.

## 6. Bayraklar ve politik içerik riski ⚠️
**Durum:** Suriye ve Kürdistan bayrakları bazı izleyicilerde tartışma ya da şikâyet doğurabilir. Gemini'nin itiraz etmesinin bir nedeni de bu. TikTok, şikâyet yoğunlaşırsa yayını inceleyebilir.
**Olası çözümler:** Referans videoyla birebir aynı kalmak için bayrakları koruyoruz. Sorun çıkarsa bir bayrağı değiştirmek 1 dakikalık iş.
**Karar senin.** Ben altın kural gereği videodaki gibi bırakıyorum.

## 7. "Dilencilik" kısıtı
**Durum:** TikTok, izleyiciden açıkça hediye isteyen yayınları kısıtlıyor.
**Çözüm:** Ekranda hiçbir yazı olmayacak, sadece ikon ve sayı görünecek (referans videodaki gibi). Yayında da sesli olarak "hediye atın" demeni önermem. Ödül vaat etmek de (ör. "kazanan takıma şu verilecek") kumar ya da teşvik sayılabilir, bundan kaçınacağız.

## 8. Performans (bilgisayarın kasması)
**Durum:** 5 GIF'te yeşili silip bayrağı her karede canlı olarak giydirmek bilgisayarı yorar.
**Çözüm:** Bayraklı kareleri **bir kez önceden** üreteceğiz (Python ile). Oyun bu hazır görselleri oynatacak, yani neredeyse sıfır yük. GTA ile aynı anda çalışırken de sorun çıkarmaz.

## 9. Sayaçlar ve sıfırlama
**Durum:** Videoda sayılar binlerde, yani sayaçlar birikimli.
**Çözüm:** Sayaçlar bilgisayara kaydedilecek, yayın kapanıp açılınca kaldığı yerden devam edecek. Sıfırlama sadece senin basacağın gizli bir tuşla yapılacak.
**Karar senin:** Her yayında sıfırlansın mı, yoksa hiç sıfırlanmasın mı?

## 10. Hiç hediye yokken başlangıç
**Durum:** Bütün sayılar 0 iken hayvanların konumu tanımsız kalıyor.
**Çözüm:** Hepsi soldaki başlangıç çizgisinde dizilir ve yerinde koşar. İlk hediyede ayrışmaya başlarlar.

## 11. Token tasarrufu
- Hareketli testleri yayına geçerken yapacağız (senin isteğin).
- Bu önizleme hareketsiz bir sayfa. Ekran görüntülerini düşük çözünürlükte alıyorum.
