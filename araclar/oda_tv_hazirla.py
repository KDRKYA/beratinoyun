"""public/tv/oda-tv-orijinal.jpg (odadaki büyük TV) -> public/tv/oda-tv.jpg
1) Duvarlar pürüzsüz antrasit gri boyanır (priz, beyaz lekeler, saat silinir; ışık/gölge korunur)
2) TV ekranı dikdörtgen olacak şekilde perspektif düzeltilir
3) Kırpılıp 1080 genişliğe getirilir; ekran dikdörtgeni yazdırılır (oyun.html ODA.ekran)
Kullanım: python araclar/oda_tv_hazirla.py [maske]   ('maske' verilirse duvar maskesinin önizlemesini de kaydeder)"""
import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
K = os.path.join(os.path.dirname(__file__), '..', 'public', 'tv')
im = Image.open(os.path.join(K, 'oda-tv-orijinal.jpg')).convert('RGB')
W, H = im.size
d = 1 / 0.4658   # önizleme (900 px) koordinatı -> orijinal piksel
P = lambda pts: [(x * d, y * d) for x, y in pts]

# ---- duvar maskesi (önizleme koordinatlarıyla çizildi) ----
SOL = P([(0, 0), (285, 0), (556, 137), (556, 396), (88, 371), (77, 752), (0, 756)])
SAG = P([(556, 137), (832, 0), (900, 0), (900, 832), (792, 787), (791, 416), (556, 396)])
KLIMA = P([(536, 92), (772, 58), (778, 178), (560, 245)])        # klima kalsın
LAMBA = P([(540, 285), (568, 285), (568, 402), (540, 402)])      # köşedeki ışık çubuğu kalsın
m = Image.new('L', im.size, 0); md = ImageDraw.Draw(m)
md.polygon(SOL, fill=255); md.polygon(SAG, fill=255)
md.polygon(KLIMA, fill=0); md.polygon(LAMBA, fill=0)
m = m.filter(ImageFilter.GaussianBlur(2))

# ---- duvarın ışığı: aşırı açık/koyu şeyler kırpılıp çok bulanıklaştırılır (lekeler, prizler, saat kaybolur) ----
a = np.asarray(im, np.float32)
lum = a @ np.array([.299, .587, .114], np.float32)
mb = np.asarray(m, np.float32) / 255
duvarLum = lum[mb > .9]
lo, hi = np.percentile(duvarLum, 15), np.percentile(duvarLum, 55)
kl = np.clip(lum, lo, hi)
def kutu(x, r):   # ayrılabilir kutu bulanıklığı (numpy)
    for ax in (0, 1):
        c = np.cumsum(np.pad(x, [(r + 1, r) if i == ax else (0, 0) for i in range(2)], mode='edge'), axis=ax)
        x = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return x
def bulanik(x, r):   # büyük yarıçap: küçült, 3 kez kutu bulanıklığı, büyüt
    f = 8; h, w = x.shape
    k = np.asarray(Image.fromarray(x.astype(np.float32), 'F').resize((w // f, h // f), Image.BOX), np.float32)
    rr = max(1, round(r / f / 1.7))
    for _ in range(3): k = kutu(k, rr)
    return np.asarray(Image.fromarray(k, 'F').resize((w, h), Image.BICUBIC), np.float32)
# maskeli (normalize) bulanıklaştırma: duvar dışı renkler karışmasın
pay = bulanik(kl * mb, 90); payda = bulanik(mb, 90) + 1e-4
isik = pay / payda
isik = isik / np.median(isik[mb > .9])
ANTRASIT = np.array([58, 61, 65], np.float32)
renk = ANTRASIT[None, None, :] * np.clip(isik, .6, 1.5)[..., None] ** .8
# çok ince sıva/boya dokusu (dümdüz plastik görünmesin)
rng = np.random.default_rng(3)
gren = rng.normal(0, 1, (H, W)).astype(np.float32)
gren = (gren + np.roll(gren, 1, 0) + np.roll(gren, 1, 1) + np.roll(gren, -1, 0) + np.roll(gren, -1, 1)) / 5 * 2.2
renk = np.clip(renk + gren[..., None], 0, 255)
# köşe birleşiminde hafif gölge (iki duvarın kesiştiği çizgi)
kx = 556 * d
yy, xx = np.mgrid[0:H, 0:W]
kose = np.exp(-((xx - kx) ** 2) / (2 * 40 ** 2)) * .18
renk *= (1 - kose)[..., None]
out = a * (1 - mb[..., None]) + renk * mb[..., None]
im2 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

if len(sys.argv) > 1 and sys.argv[1] == 'maske':
    on = im2.copy(); od = ImageDraw.Draw(on)
    for poly in (SOL, SAG, KLIMA, LAMBA): od.polygon(poly, outline=(255, 0, 0))
    on.resize((900, round(H * 900 / W))).save(os.path.join(os.path.dirname(__file__), '..', 'onizleme', 'oda-maske.jpg'), quality=85)

# ---- perspektif: ekranın 4 köşesi -> dikdörtgen ----
KAYNAK = [(190, 792), (1692, 893), (1630, 1700), (160, 1662)]
X0, Y0 = 175, 800; X1, Y1 = 1665, 800 + 838
HEDEF = [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)]
def katsayi(hedef, kaynak):
    A, b = [], []
    for (x, y), (u, v) in zip(hedef, kaynak):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(A, float), np.array(b, float)).tolist()
duz = im2.transform(im2.size, Image.PERSPECTIVE, katsayi(HEDEF, KAYNAK), Image.BICUBIC)
KX0, KY0, KX1, KY1 = 100, 520, 1740, 1880
duz = duz.crop((KX0, KY0, KX1, KY1))
o = 1080 / duz.width
duz = duz.resize((1080, round(duz.height * o)), Image.LANCZOS)
duz.save(os.path.join(K, 'oda-tv.jpg'), quality=90)
print('boyut', duz.size, 'ekran', round((X0 - KX0) * o, 1), round((Y0 - KY0) * o, 1), round((X1 - X0) * o, 1), round((Y1 - Y0) * o, 1))
