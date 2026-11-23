"""public/tv/genis-tv-orijinal.jpg (yandan çekilmiş büyük TV fotoğrafı) -> perspektifi düzeltilmiş, 1080 genişlikte public/tv/genis-tv.jpg
Ekranın 4 köşesi (orijinal piksel) dikdörtgene oturtulur; çıktıdaki ekran dikdörtgeni yazdırılır (oyun.html GENIS.ekran)."""
import os, numpy as np
from PIL import Image
K = os.path.join(os.path.dirname(__file__), '..', 'public', 'tv')
im = Image.open(os.path.join(K, 'genis-tv-orijinal.jpg')).convert('RGB')
# ekranın görünen köşeleri (sol üst, sağ üst, sağ alt, sol alt)
KAYNAK = [(140, 252), (2500, 338), (2452, 1607), (140, 1628)]
# düz hali (16:9)
X0, Y0, X1, Y1 = 140, 262, 2480, 262 + 1316
HEDEF = [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)]

def katsayi(hedef, kaynak):   # çıktı(hedef) -> girdi(kaynak) eşlemesi
    A, b = [], []
    for (x, y), (u, v) in zip(hedef, kaynak):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(A, float), np.array(b, float)).tolist()

duz = im.transform(im.size, Image.PERSPECTIVE, katsayi(HEDEF, KAYNAK), Image.BICUBIC)
# kırp: TV + biraz duvar + ayakların bir kısmı
KX0, KY0, KX1, KY1 = 100, 110, 2540, 1800
duz = duz.crop((KX0, KY0, KX1, KY1))
o = 1080 / duz.width
duz = duz.resize((1080, round(duz.height * o)), Image.LANCZOS)
duz.save(os.path.join(K, 'genis-tv.jpg'), quality=90)
print('boyut', duz.size, 'ekran', round((X0 - KX0) * o, 1), round((Y0 - KY0) * o, 1), round((X1 - X0) * o, 1), round((Y1 - Y0) * o, 1))
