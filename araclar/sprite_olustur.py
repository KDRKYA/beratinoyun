"""gorseller/*.gif -> public/sprites/<anahtar>.png (bayrakli, seffaf, izgara sprite) + sprites.json

Kullanim:
  python araclar/sprite_olustur.py          # RIFE varsa 3 kat ara kare uretir (daha puruzsuz kosu)
  python araclar/sprite_olustur.py --rifesiz # GIF'in kendi kareleriyle
"""
import os, sys, json, shutil, subprocess, importlib.util, glob
import numpy as np
from PIL import Image, ImageSequence

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('bayraklar', os.path.join(KOK, 'araclar', 'bayraklar.py'))
bayraklar = importlib.util.module_from_spec(spec); spec.loader.exec_module(bayraklar)

KAT = 3          # ara kare kati (3 = her iki kare arasina 2 yeni kare)
SUTUN = 10       # sprite izgarasi sutun sayisi
RIFE_MODEL = 'rife-v4.6'

# dosya adi -> bayrak anahtari (dosya adi bayragi belirler)
DOSYALAR = {
    'afghanistan.gif': 'afghanistan',
    'suriye.gif': 'suriye',
    'kürdistan.gif': 'kurdistan',
    'turkiye.gif': 'turkiye',
    'azetbaijan.gif': 'azerbaycan',
}

def rife_exe():
    bul = glob.glob(os.path.join(KOK, 'araclar', 'rife', '**', 'rife-ncnn-vulkan.exe'), recursive=True)
    return bul[0] if bul else None

def ara_kareler(anahtar, kareler):
    """RIFE ile dongulu ara kare uretir. Basarisiz olursa None doner."""
    exe = rife_exe()
    if not exe or '--rifesiz' in sys.argv:
        return None
    is_dir = os.path.join(KOK, 'araclar', 'ara', anahtar)
    gir, cik = os.path.join(is_dir, 'gir'), os.path.join(is_dir, 'cik')
    shutil.rmtree(is_dir, ignore_errors=True); os.makedirs(gir); os.makedirs(cik)
    dongu = kareler + [kareler[0]]  # son->ilk gecisi de yumusasin
    for i, k in enumerate(dongu):
        Image.fromarray(k.astype(np.uint8)).save(os.path.join(gir, '%08d.png' % (i + 1)))
    hedef = (len(dongu) - 1) * KAT + 1
    model = os.path.join(os.path.dirname(exe), RIFE_MODEL)
    r = subprocess.run([exe, '-i', gir, '-o', cik, '-m', model, '-n', str(hedef)], capture_output=True, text=True, cwd=os.path.dirname(exe))
    cikti = sorted(glob.glob(os.path.join(cik, '*.png')))
    if r.returncode != 0 or len(cikti) < hedef:
        print('  RIFE calismadi, normal kareler kullanilacak:', (r.stderr or '')[-300:])
        return None
    return [np.asarray(Image.open(p).convert('RGB')).astype(np.float32) for p in cikti[:hedef - 1]]

def alfa(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return np.clip(1 - ((g - np.maximum(r, b)) - 15) / 30, 0, 1)

meta = {}
for dosya, anahtar in DOSYALAR.items():
    im = Image.open(os.path.join(KOK, 'gorseller', dosya))
    kareler = [np.asarray(k.convert('RGB')).astype(np.float32) for k in ImageSequence.Iterator(im)]
    sure = im.info.get('duration', 100) or 100
    yeni = ara_kareler(anahtar, kareler)
    if yeni:
        kareler, sure = yeni, sure / KAT
    alfalar = [alfa(k) for k in kareler]
    # tum karelerin birlesik kutusu -> bayrak govdeye sabit kalir
    birlesik = np.max(np.stack(alfalar), axis=0)
    ys, xs = np.where(birlesik > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    pad = 2
    y0, x0 = max(0, y0 - pad), max(0, x0 - pad)
    y1, x1 = min(kareler[0].shape[0] - 1, y1 + pad), min(kareler[0].shape[1] - 1, x1 + pad)
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    bayrak = np.asarray(Image.fromarray(bayraklar.flag(anahtar).astype(np.uint8)).resize((bw, bh), Image.LANCZOS)).astype(np.float32)
    sutun = min(SUTUN, len(kareler)); satir = (len(kareler) + sutun - 1) // sutun
    izgara = Image.new('RGBA', (bw * sutun, bh * satir), (0, 0, 0, 0))
    for i, (a, al) in enumerate(zip(kareler, alfalar)):
        a = a[y0:y1+1, x0:x1+1]; al = al[y0:y1+1, x0:x1+1]
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        lum = 0.3*r + 0.59*np.minimum(g, np.maximum(r, b)) + 0.11*b
        m = al > 0.9
        lo, hi = np.percentile(lum[m], 3), np.percentile(lum[m], 97)
        golge = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
        renk = np.clip(bayrak * (0.35 + 0.9 * golge[..., None]) + 40 * golge[..., None] ** 3, 0, 255)
        rgba = np.dstack([renk, al * 255]).astype(np.uint8)
        izgara.paste(Image.fromarray(rgba, 'RGBA'), ((i % sutun) * bw, (i // sutun) * bh))
    izgara.save(os.path.join(KOK, 'public', 'sprites', anahtar + '.png'), optimize=True)
    meta[anahtar] = {'w': int(bw), 'h': int(bh), 'kare': len(kareler), 'sutun': sutun, 'ms': round(sure, 3)}
    print(anahtar, bw, bh, len(kareler), 'kare', '(RIFE)' if yeni else '')

with open(os.path.join(KOK, 'public', 'sprites', 'sprites.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=1)
print('tamam')
