"""Muzik dosyasinda en hareketli bolumu bulur; ritme (olcuye) oturan baslangic/bitis saniyesi onerir.
Kullanim: python araclar/dongu_bul.py dosya.mp3 [hedef_sure_sn=32] [en_erken_bas_sn=0]
Cikti: bas son bpm  (public/muzik/ayar.json'a yazilir)"""
import sys, subprocess, glob, os, numpy as np
FF = glob.glob(os.path.join(os.environ['LOCALAPPDATA'], 'Microsoft', 'WinGet', 'Packages', '**', 'ffmpeg.exe'), recursive=True)[0]
SR = 22050

def oku(p):
    ham = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(ham, np.float32)

def analiz(p, hedef=32.0, enErken=0.0):
    x = oku(p); sure = len(x) / SR
    hop = 512; n = len(x) // hop
    kare = x[:n * hop].reshape(n, hop)
    rms = np.sqrt((kare ** 2).mean(1))
    # onset: yuksek frekans enerjisinin artisi
    fark = np.diff(kare, axis=1); hf = np.sqrt((fark ** 2).mean(1))
    onset = np.maximum(0, np.diff(hf, prepend=hf[0]))
    # tempo: onset otokorelasyonu, 80-170 BPM
    o = onset - onset.mean(); ac = np.correlate(o, o, 'full')[len(o) - 1:]
    fps = SR / hop
    lo, hi = int(fps * 60 / 170), int(fps * 60 / 80)
    lag = lo + int(np.argmax(ac[lo:hi])); bpm = 60 * fps / lag
    olcu = 4 * lag / fps                       # 4 vurus = 1 olcu (sn)
    olcuSay = max(4, int(round(hedef / olcu)))
    pencere = olcuSay * olcu
    # vurus fazi: onset'in en guclu oldugu kaydirma
    faz = int(np.argmax([onset[k::lag].sum() for k in range(lag)])) / fps
    # en hareketli pencere: (rms + onset) ortalamasi en yuksek olan, olcu basina hizali
    enerji = rms / (rms.max() + 1e-9) + onset / (onset.max() + 1e-9)
    en, enBas = -1, faz
    b = faz
    while b + pencere <= sure - 0.5:
        if b >= enErken:
            i0, i1 = int(b * fps), int((b + pencere) * fps)
            e = enerji[i0:i1].mean()
            if e > en: en, enBas = e, b
        b += olcu
    return round(enBas, 2), round(enBas + pencere, 2), round(bpm, 1), round(sure, 1)

if __name__ == '__main__':
    p = sys.argv[1]; hedef = float(sys.argv[2]) if len(sys.argv) > 2 else 32; enErken = float(sys.argv[3]) if len(sys.argv) > 3 else 0
    print(*analiz(p, hedef, enErken))
