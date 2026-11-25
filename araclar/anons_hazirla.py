# Anons seslerini üretir: public/anons/<ulke>-<tur><no>.mp3
# Ücretsiz Microsoft Edge sesleri (edge-tts). Kurulum: python -m pip install edge-tts
# Çalıştır: python araclar/anons_hazirla.py   (cümleleri değiştirip yeniden çalıştırabilirsin)
import asyncio, os, edge_tts

SES = 'tr-TR-AhmetNeural'   # kadın sesi için: tr-TR-EmelNeural
HIZ, PERDE = '+12%', '+0Hz'
ULKELER = {'turkiye': 'Türkiye', 'kurdistan': 'Kürdistan', 'suriye': 'Suriye', 'afghanistan': 'Afganistan', 'azerbaycan': 'Azerbaycan'}
CUMLELER = {
    'gecti': ['{u} öne geçti!', '{u} liderliği aldı!'],          # lider değişince
    'onde':  ['Şu an {u} önde!', '{u} yarışı önde götürüyor!'],   # arada bir, kim öndeyse
}
KLASOR = os.path.join(os.path.dirname(__file__), '..', 'public', 'anons')

async def main():
    os.makedirs(KLASOR, exist_ok=True)
    for uid, ad in ULKELER.items():
        for tur, liste in CUMLELER.items():
            for i, c in enumerate(liste):
                yol = os.path.join(KLASOR, f'{uid}-{tur}{i}.mp3')
                await edge_tts.Communicate(c.format(u=ad), SES, rate=HIZ, pitch=PERDE).save(yol)
                print('hazır', os.path.basename(yol))

asyncio.run(main())
