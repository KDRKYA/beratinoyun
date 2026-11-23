"""public/tv/eski-tv-orijinal.png fotoğrafından TV gövdesini kesip 3x büyütür, kenarı saydam yapar -> public/tv/eski-tv.png
Kesim (orijinal piksel): x 14..354, y 24..366. Ekran camı bu kesimde: x 40, y 38, w 261, h 196 (oyun.html FOTO.ekran)"""
from PIL import Image, ImageDraw, ImageFilter
import os
K = os.path.join(os.path.dirname(__file__), '..', 'public', 'tv')
im = Image.open(os.path.join(K, 'eski-tv-orijinal.png')).convert('RGB').crop((14, 24, 354, 320))  # alt: kaset yuvasının altından kesildi (düğme sırası yok)
O = 3
im = im.resize((im.width * O, im.height * O), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=2))
m = Image.new('L', im.size, 0)
d = ImageDraw.Draw(m)
# gövde: üstte yuvarlak köşeli, alta doğru ayaklara kadar
# gövde dış hattı (3x ölçek): üst kasa hafif eğik, alttaki video bölümü daha dar
d.polygon([(10, 62), (24, 30), (60, 18), (950, 20), (984, 32), (1002, 64), (994, 400), (984, 600), (972, 792), (958, 792),
           (955, 1000), (940, 1016), (82, 1016), (66, 1000), (62, 792), (58, 792), (44, 600), (30, 400)], fill=255)
m = m.filter(ImageFilter.GaussianBlur(1.5))
im.putalpha(m)
im.save(os.path.join(K, 'eski-tv.png'))
print(im.size)
