"""Tok, tatli, ASMR hissi veren tik sesleri tasarlar (sentez, ucretsiz, telifsiz).
Cikti: onizleme/ses/aday1-5.wav (dinleme: 3 tek tik + art arda 6 tik) ve public/ses/adaylar/aday1-5.wav (oyunda calacak tek tik)
Kullanim: python araclar/tik_tasarla.py
"""
import os, wave, numpy as np
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
UZUN = 0.13   # tek tik suresi (sn) — "tap-tik" (basis + kalkis) sigsin diye
t = np.arange(int(SR * UZUN)) / SR
rng = np.random.default_rng(7)

def zarf(atak, tau):
    """yumusak atak + ussel sonum"""
    a = np.clip(t / max(atak, 1e-4), 0, 1) ** 2
    return a * np.exp(-np.maximum(t - atak, 0) / tau)

def sin_kayan(f0, f1, sure):
    """f0'dan f1'e ussel kayan frekansli sinus"""
    f = f1 + (f0 - f1) * np.exp(-t / sure)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def alcak(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y

def yuksek(x, fc): return x - alcak(x, fc)
def bant(x, f1, f2): return alcak(yuksek(x, f1), f2)
def gurultu(): return rng.standard_normal(len(t))

def bitir(x):
    x = x / (np.abs(x).max() + 1e-9)
    x = np.tanh(1.4 * x) / np.tanh(1.4)          # hafif sicak doygunluk
    f = int(SR * 0.012); x[-f:] *= np.linspace(1, 0, f) ** 2
    return x * 0.9

adaylar = {}
# 1) Kremsi thock: yumusak govde + kucuk temiz tap
adaylar[1] = bitir(
    1.00 * zarf(0.0015, 0.018) * sin_kayan(210, 120, 0.02) +
    0.25 * zarf(0.0008, 0.008) * sin_kayan(480, 300, 0.01) +
    0.18 * zarf(0.0004, 0.0025) * bant(gurultu(), 900, 3200) +
    0.15 * zarf(0.001, 0.012) * alcak(gurultu(), 500))
# 2) Tahta bilye: tahtaya dusen bilye, sicak rezonans
adaylar[2] = bitir(
    sum(g * zarf(0.0007, d) * np.sin(2 * np.pi * f * t) for f, d, g in [(380, .045, 1), (1010, .02, .45), (1730, .012, .25), (2650, .007, .12)]) +
    0.6 * zarf(0.001, 0.02) * sin_kayan(140, 105, 0.02))
# 3) Kopuk pop: derin, tatli bir "pop" (su damlasi / kabarcik hissi)
adaylar[3] = bitir(
    1.00 * zarf(0.003, 0.022) * sin_kayan(520, 160, 0.012) +
    0.50 * zarf(0.002, 0.025) * np.sin(2 * np.pi * 90 * t) +
    0.08 * zarf(0.0004, 0.002) * alcak(gurultu(), 2500))
# 4) Derin kapasitif: kalin "thup" + yuvarlak kubbe sesi
adaylar[4] = bitir(
    1.00 * zarf(0.0015, 0.028) * sin_kayan(95, 70, 0.03) +
    0.45 * zarf(0.001, 0.014) * sin_kayan(340, 300, 0.01) +
    0.12 * zarf(0.0003, 0.0015) * bant(gurultu(), 1500, 3500) +
    0.30 * zarf(0.001, 0.015) * alcak(gurultu(), 300))
# 5) Yumusak tus: kremsi thock + pop karisimi (en "asmr")
adaylar[5] = bitir(
    0.8 * zarf(0.002, 0.02) * sin_kayan(260, 130, 0.015) +
    0.6 * zarf(0.003, 0.018) * sin_kayan(420, 170, 0.01) +
    0.35 * zarf(0.002, 0.03) * np.sin(2 * np.pi * 85 * t) +
    0.10 * zarf(0.0005, 0.003) * bant(gurultu(), 700, 2400))

# ---------- MEKANIK KLAVYE ailesi (mek1-5) ----------
# Gercek bir tus vurusu: switch'in kisa "tap"i -> tus kapaginin plakaya oturdugu darbe ->
# kasa/plaka rezonansi (tok kisim, 150-400 Hz) + kapak rezonansi (800-1600 Hz, cabuk sonen)
def gecik(x, ms):
    n = int(SR * ms / 1000); return np.concatenate([np.zeros(n), x[:len(x) - n]])
def rez(f, tau, g, atak=0.0006): return g * zarf(atak, tau) * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))
def tap(g, f1=2000, f2=6000, tau=0.0012): return g * zarf(0.0002, tau) * bant(gurultu(), f1, f2)
def darbe(g, fc=1200, tau=0.006): return g * zarf(0.0003, tau) * alcak(gurultu(), fc)

mek = {}
# 1) Yaglanmis lineer + PBT kapak: klasik tok "thock"
mek[1] = bitir(tap(0.18) + darbe(0.5) + rez(230, .022, .9) + rez(520, .010, .4) + rez(1150, .005, .22))
# 2) Gasket montaj, kopuklu: daha derin ve yumusak
mek[2] = bitir(tap(0.10, 1800, 4500) + darbe(0.55, 900, .007) + rez(170, .028, 1) + rez(400, .012, .35) + rez(950, .006, .18))
# 3) Kremsi / mermerimsi: orta frekans dolgun, tatli
mek[3] = bitir(tap(0.12, 1500, 4000) + darbe(0.45, 1000, .007) + rez(260, .02, .8) + rez(680, .014, .55) + rez(1350, .006, .2))
# 4) Kirmizi switch + aluminyum kasa: biraz daha net, yine tok
mek[4] = bitir(tap(0.25, 2500, 7000, .0009) + darbe(0.45, 1600, .005) + rez(300, .018, .85) + rez(720, .009, .4) + rez(1600, .004, .25))
# 5) Gercekci iki asamali vurus: tusun inisindeki minik tap, 11 ms sonra tok oturma
mek[5] = bitir(gecik(tap(0.12, 1800, 5000), 0) + gecik(darbe(0.5, 1100, .006) + rez(210, .024, .95) + rez(560, .011, .4) + rez(1200, .005, .2) + tap(0.15), 11))

# ---------- TAP-TIK ailesi (taptik1-5) ----------
# Tus basilinca tok "tap" (asagi), hemen ardindan tus kalkarken kisa, parlak "tik" (yukari).
def tik_yukari(g, f=1800):
    return g * (tap(0.35, 2500, 7000, .0010) + rez(f, .004, .25) + rez(f * 1.8, .0025, .15) + darbe(0.12, 2500, .002))
def govde(n):   # mek ailesinin "tap" kismi, bitir() oncesi ham hali
    return {1: tap(0.18) + darbe(0.5) + rez(230, .022, .9) + rez(520, .010, .4) + rez(1150, .005, .22),
            2: tap(0.10, 1800, 4500) + darbe(0.55, 900, .007) + rez(170, .028, 1) + rez(400, .012, .35) + rez(950, .006, .18),
            3: tap(0.12, 1500, 4000) + darbe(0.45, 1000, .007) + rez(260, .02, .8) + rez(680, .014, .55) + rez(1350, .006, .2),
            4: tap(0.25, 2500, 7000, .0009) + darbe(0.45, 1600, .005) + rez(300, .018, .85) + rez(720, .009, .4) + rez(1600, .004, .25),
            5: tap(0.12, 1800, 5000) + gecik(darbe(0.5, 1100, .006) + rez(210, .024, .95) + rez(560, .011, .4) + rez(1200, .005, .2) + tap(0.15), 11)}[n]
taptik = {}
for n, (ms, g, f) in {1: (45, .45, 1800), 2: (40, .40, 1500), 3: (50, .45, 1700), 4: (35, .50, 2100), 5: (55, .42, 1800)}.items():
    taptik[n] = bitir(govde(n) + gecik(tik_yukari(g, f), ms))

def yaz(p, x):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()

bos = lambda s: np.zeros(int(SR * s))
for on_ek, grup in (('aday', adaylar), ('mek', mek), ('taptik', taptik)):
    for n, x in grup.items():
        yaz(os.path.join(KOK, 'public', 'ses', 'adaylar', '%s%d.wav' % (on_ek, n)), x)
        dinle = np.concatenate([x, bos(0.45), x, bos(0.45), x, bos(0.6)] + [np.concatenate([x, bos(0.04)]) for _ in range(6)] + [bos(0.5)])
        yaz(os.path.join(KOK, 'onizleme', 'ses', '%s%d.wav' % (on_ek, n)), dinle)
print('tamam')
