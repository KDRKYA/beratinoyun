// TikTok Canlı Yarış – sunucu
// Oyun:  http://localhost:7777/oyun.html   (OBS tarayıcı kaynağı, 1080x1920)
// Panel: http://localhost:7777/panel.html
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const PORT = 7777;
const KOK = __dirname;
const PUBLIC = path.join(KOK, 'public');
const VERI = path.join(KOK, 'veri');
const DURUM_DOSYA = path.join(VERI, 'durum.json');
const LOG_DOSYA = path.join(VERI, 'log.jsonl');
fs.mkdirSync(VERI, { recursive: true });

// ---------- Kalıcı durum ----------
const VARSAYILAN = {
  kullanici: '',
  seritler: [
    { id: 'afghanistan', ad: 'Afganistan', hediye: 'Lazer Çubuğu', giftIds: [6788], ikon: '', puan: 0 },
    { id: 'suriye', ad: 'Suriye', hediye: 'GG', giftIds: [6064], ikon: '', puan: 0 },
    { id: 'kurdistan', ad: 'Kürdistan', hediye: 'Gül', giftIds: [5655], ikon: '', puan: 0 },
    { id: 'turkiye', ad: 'Türkiye', hediye: 'TikTok', giftIds: [5269], ikon: '', puan: 0 },
    { id: 'azerbaycan', ad: 'Azerbaycan', hediye: 'Dondurma Külahı', giftIds: [5827], ikon: '', puan: 0 },
  ],
};
let durum;
try { durum = JSON.parse(fs.readFileSync(DURUM_DOSYA, 'utf8')); } catch { durum = JSON.parse(JSON.stringify(VARSAYILAN)); }
// Eski kayıtlarda Lazer Çubuğu (Glow Stick, ID 6788) eşleşmemişse ekle
{ const af = durum.seritler && durum.seritler.find(s => s.id === 'afghanistan');
  if (af && !durum.seritler.some(s => s.giftIds.includes(6788))) af.giftIds.push(6788); }
let kayitZamani = null;
function kaydet() {
  clearTimeout(kayitZamani);
  kayitZamani = setTimeout(() => {
    const gecici = DURUM_DOSYA + '.tmp';
    fs.writeFileSync(gecici, JSON.stringify(durum, null, 1));
    fs.renameSync(gecici, DURUM_DOSYA);
  }, 300);
}
function logYaz(kayit) {
  kayit.t = Date.now();
  fs.appendFile(LOG_DOSYA, JSON.stringify(kayit) + '\n', () => {});
  yayinla({ tip: 'log', kayit }, 'panel');
}
function loglariOku(sayfa = 0, adet = 200) {
  let satirlar = [];
  try { satirlar = fs.readFileSync(LOG_DOSYA, 'utf8').trim().split('\n').filter(Boolean); } catch {}
  const toplam = satirlar.length;
  const bas = Math.max(0, toplam - (sayfa + 1) * adet), son = toplam - sayfa * adet;
  return { toplam, sayfa, kayitlar: satirlar.slice(bas, Math.max(bas, son)).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean).reverse() };
}

// ---------- Websocket ----------
const istemciler = new Set();
function yayinla(mesaj, hedef) {
  const s = JSON.stringify(mesaj);
  for (const ws of istemciler) if (!hedef || ws.rol === hedef) { try { ws.send(s); } catch {} }
}
// Yayındaki ses seviyeleri (panelden ayarlanır): tik = vuruş sesi (1 = %100, 2 = %200), muzik = ülke müziği (0-1)
const SES_VARSAYILAN = { tik: 1.4, muzik: 0.5, gecikme: 0, anons: 1, anonsAralik: 3 };   // gecikme: tık sesinin kayması (ms, + = ses daha geç); anons: spiker sesi (0 = kapalı); anonsAralik: kaç dakikada bir "X önde" (0 = sadece öne geçince)
function sesAyar() { return { ...SES_VARSAYILAN, ...(durum.ses || {}) }; }
// Yerleşim (panelden sürükleyerek): ust = üstteki oyunun ölçeği (1 = normal), videoX = alt videonun yatay kaydırması (-1 sol ... 1 sağ)
// Yerleşim: odaParlak = TV ekranı dışındaki odanın parlaklığı (1 = normal), hayvanParlak/cizgiParlak/haleParlak = hayvanların, şerit çizgilerinin ve hayvanların arkasındaki elips ışığın parlaklığı, ust = üstteki oyunun ölçeği, oyunX/videoX = yatay kaydırma (-1 sol ... 1 sağ), oyunY/videoY = dikey kaydırma (-1 yukarı ... 1 aşağı), videoZoom = videoyu yakınlaştırma,
// oyunSol/oyunSag/oyunUst/oyunAlt = üstteki oyunun kenarlarından kesilen pay, videoKirp/videoAlt/videoSol/videoSag = videonun üst/alt/sol/sağ kesme payı
const YER_SINIR = { odaParlak: [0.3, 1.6], hayvanParlak: [0.3, 1.6], cizgiParlak: [0.1, 1.8], haleParlak: [0, 2.5], ust: [0.6, 1.5], videoX: [-1, 1], oyunX: [-1, 1], oyunY: [-1, 1], videoY: [-1, 1], videoZoom: [1, 2.5], oyunSol: [0, 0.4], oyunSag: [0, 0.4], oyunUst: [0, 0.4], oyunAlt: [0, 0.4], videoKirp: [0, 0.4], videoAlt: [0, 0.4], videoSol: [0, 0.4], videoSag: [0, 0.4] };
const YER_VARSAYILAN = { odaParlak: 1, hayvanParlak: 1, cizgiParlak: 1, haleParlak: 1, ust: 1, videoX: 0, oyunX: 0, oyunY: 0, videoY: 0, videoZoom: 1, oyunSol: 0, oyunSag: 0, oyunUst: 0, oyunAlt: 0, videoKirp: 0, videoAlt: 0, videoSol: 0, videoSag: 0 };
function yerAyar() { return { ...YER_VARSAYILAN, ...(durum.yer || {}) }; }
// Alt video: bas = baştan atlanan saniye, son = sondan atlanan saniye (panelden ayarlanır)
const VIDEO_VARSAYILAN = { bas: 15, son: 0 };
function videoAyar() { return { ...VIDEO_VARSAYILAN, ...(durum.video || {}) }; }
function durumOzet() {
  return { tip: 'durum', seritler: durum.seritler, kullanici: durum.kullanici, baglanti: baglantiDurum, sonHediyeler, ses: sesAyar(), yer: yerAyar(), video: videoAyar() };
}

// ---------- Spiker anonsu: "Türkiye öne geçti!", arada bir "Şu an Kürdistan önde!" ----------
// Sesler public/anons/ içinde (araclar/anons_hazirla.py üretir). Sunucu karar verir, tüm oyun sayfaları aynı anda çalar.
const ANONS_GECIKME = 1800;    // ms: puan değişince bekle (avatar uçup hayvan öne geçsin, sonra anons)
const ANONS_EN_SIK = 6000;     // ms: iki anons arası en az
function tekLider() {
  const s = [...durum.seritler].sort((a, b) => b.puan - a.puan);
  return s[0] && s[0].puan > 0 && (!s[1] || s[1].puan < s[0].puan) ? s[0].id : null;
}
let anonsLider = tekLider(), sonAnons = Date.now(), anonsZaman = null;
function anonsCal(id, tur) {
  sonAnons = Date.now();
  yayinla({ tip: 'anons', dosya: 'anons/' + id + '-' + tur + Math.floor(Math.random() * 2) + '.mp3' }, 'oyun');
}
function anonsKontrol() {
  clearTimeout(anonsZaman);
  anonsZaman = setTimeout(() => {
    const l = tekLider(); if (!l || l === anonsLider) { if (l) anonsLider = l; return; }
    if (Date.now() - sonAnons < ANONS_EN_SIK) return anonsKontrol();   // çok sık olmasın: biraz sonra tekrar bak
    anonsLider = l;
    if (sesAyar().anons > 0) anonsCal(l, 'gecti');
  }, ANONS_GECIKME);
}
setInterval(() => {   // arada bir kim öndeyse söyle
  const a = sesAyar(), l = tekLider();
  if (a.anons > 0 && a.anonsAralik > 0 && l && Date.now() - sonAnons >= a.anonsAralik * 60000) anonsCal(l, 'onde');
}, 10000);

// ---------- Puan ----------
function puanEkle(seritId, miktar, kaynak, kullanici) {
  const s = durum.seritler.find(x => x.id === seritId);
  if (!s || !miktar) return;
  s.puan = Math.max(0, s.puan + miktar);
  kaydet(); anonsKontrol();
  yayinla({ tip: 'hediye', serit: seritId, miktar, puan: s.puan, kullanici: kullanici || null, kaynak });
  yayinla(durumOzet(), 'panel');
  logYaz({ olay: 'puan', serit: seritId, miktar, puan: s.puan, kaynak, kullanici: kullanici ? kullanici.ad : null });
}

// ---------- TikTok ----------
let baglanti = null;
let baglantiDurum = { durum: 'kapali', mesaj: '' };
let yenidenDene = null;
let elleKapatildi = true;
const sonHediyeler = []; // panelde eşleştirme için
const seriler = new Map(); // kombo takibi: anahtar -> {sayi, zaman}

function ilkUrl(obj, derinlik = 0) {
  if (!obj || derinlik > 5) return '';
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : '';
  if (Array.isArray(obj)) { for (const x of obj) { const u = ilkUrl(x, derinlik + 1); if (u) return u; } return ''; }
  if (typeof obj === 'object') { for (const k of Object.keys(obj)) { const u = ilkUrl(obj[k], derinlik + 1); if (u) return u; } }
  return '';
}
function baglantiAyarla(d, m) { baglantiDurum = { durum: d, mesaj: m || '' }; yayinla(durumOzet(), 'panel'); }

function hediyeIsle(data) {
  const giftId = Number(data.giftId);
  const det = data.giftDetails || data.gift || {};
  const giftType = Number(det.giftType ?? det.type ?? 0);
  const ad = det.giftName || det.name || (data.extendedGiftInfo && data.extendedGiftInfo.name) || String(giftId);
  const ikon = ilkUrl(det.giftImage) || ilkUrl(det.image) || ilkUrl(det.icon) || ilkUrl(data.extendedGiftInfo && data.extendedGiftInfo.image) || '';
  const u = data.user || {};
  const kullanici = {
    id: String(u.userId || u.id || u.uniqueId || ''),
    ad: u.nickname || u.uniqueId || 'izleyici',
    foto: ilkUrl(u.profilePicture) || ilkUrl(u.avatarThumb) || ilkUrl(u.avatarMedium) || '',
  };
  const repeat = Math.max(1, Number(data.repeatCount) || 1);
  const bitti = !!Number(data.repeatEnd);

  // Kombo sayımı: aynı seride sadece ARTIŞ sayılır, tekrar sayılmaz.
  let miktar;
  if (giftType === 1) {
    const anahtar = kullanici.id + ':' + giftId + ':' + (data.groupId || '');
    const onceki = seriler.get(anahtar);
    const oncekiSayi = onceki ? onceki.sayi : 0;
    miktar = repeat - oncekiSayi;
    if (miktar < 0) miktar = repeat; // yeni seri aynı anahtarla başladıysa
    seriler.set(anahtar, { sayi: Math.max(oncekiSayi, repeat), zaman: Date.now(), bitti });
  } else {
    miktar = repeat;
  }

  // eşleştirme listesi
  const kayit = sonHediyeler.find(h => h.giftId === giftId);
  if (kayit) { kayit.sayi += Math.max(0, miktar); kayit.son = Date.now(); if (ikon) kayit.ikon = ikon; }
  else { sonHediyeler.unshift({ giftId, ad, ikon, sayi: Math.max(0, miktar), son: Date.now() }); if (sonHediyeler.length > 40) sonHediyeler.pop(); }

  const serit = durum.seritler.find(s => s.giftIds.includes(giftId));
  if (serit && ikon && serit.ikon !== ikon) { serit.ikon = ikon; kaydet(); }
  if (!serit) { logYaz({ olay: 'eslesmeyen', giftId, ad, miktar, kullanici: kullanici.ad }); yayinla(durumOzet(), 'panel'); return; }
  if (miktar > 0) puanEkle(serit.id, miktar, 'tiktok', kullanici);
}
setInterval(() => { const sinir = Date.now() - 5 * 60 * 1000; for (const [k, v] of seriler) if (v.zaman < sinir) seriler.delete(k); }, 60 * 1000);

async function baglan(kullaniciAdi) {
  elleKapatildi = false;
  clearTimeout(yenidenDene);
  if (baglanti) { try { baglanti.disconnect(); } catch {} baglanti = null; }
  kullaniciAdi = String(kullaniciAdi || '').trim().replace(/^@/, '');
  if (!kullaniciAdi) return baglantiAyarla('hata', 'Kullanıcı adı boş');
  durum.kullanici = kullaniciAdi; kaydet();
  baglantiAyarla('baglaniyor', '@' + kullaniciAdi);
  const c = new TikTokLiveConnection(kullaniciAdi, { enableExtendedGiftInfo: false, processInitialData: false });
  baglanti = c;
  c.on(WebcastEvent.GIFT, d => { try { hediyeIsle(d); } catch (e) { console.error('hediye hatası', e); } });
  c.on(WebcastEvent.STREAM_END, () => { baglantiAyarla('kapali', 'Yayın bitti'); logYaz({ olay: 'baglanti', mesaj: 'Yayın bitti' }); });
  c.on(WebcastEvent.DISCONNECTED, () => {
    if (baglanti !== c || elleKapatildi) return;
    baglantiAyarla('yeniden', 'Bağlantı koptu, 10 sn sonra tekrar denenecek');
    logYaz({ olay: 'baglanti', mesaj: 'Bağlantı koptu' });
    yenidenDene = setTimeout(() => baglan(kullaniciAdi), 10000);
  });
  try {
    const st = await c.connect();
    if (baglanti !== c) return;
    baglantiAyarla('bagli', '@' + kullaniciAdi + ' (oda ' + st.roomId + ')');
    logYaz({ olay: 'baglanti', mesaj: 'Bağlandı @' + kullaniciAdi });
  } catch (e) {
    if (baglanti !== c) return;
    const msj = (e && (e.message || e.toString())) || 'Bilinmeyen hata';
    baglantiAyarla('yeniden', 'Bağlanamadı: ' + msj.slice(0, 160) + ' – 20 sn sonra tekrar');
    logYaz({ olay: 'baglanti', mesaj: 'Bağlanamadı: ' + msj.slice(0, 160) });
    if (!elleKapatildi) yenidenDene = setTimeout(() => baglan(kullaniciAdi), 20000);
  }
}
function kes() {
  elleKapatildi = true; clearTimeout(yenidenDene);
  if (baglanti) { try { baglanti.disconnect(); } catch {} baglanti = null; }
  baglantiAyarla('kapali', 'Elle kapatıldı');
}

// ---------- İstek şarkı: panelden YouTube linki → sesi indirilir → oyun çalan müziğin arasına sokar ----------
// İndirilen dosyalar public/muzik/istek/ klasörüne gider (repoda yok). İstek bitince oyun "istekBitti" der, listeden düşer.
const ISTEK_KLASOR = path.join(PUBLIC, 'muzik', 'istek');
const ISTEK_EN_UZUN = 900;   // saniye: bundan uzun video (saatlik mix vb.) indirilmez
let istekler = [], istekNo = 0;
function istekOzet() { return { tip: 'istekler', liste: istekler.map(({ no, url, baslik, durum, yol, hata }) => ({ no, url, baslik, durum, yol, hata })) }; }
function istekYayinla() { yayinla(istekOzet()); }
function ytdlpAdaylari() {
  const l = ['yt-dlp'];
  if (process.env.LOCALAPPDATA) {
    l.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe'));
    try {   // winget bazen PATH'e eklemiyor: paket klasöründen bul
      const pk = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
      for (const d of fs.readdirSync(pk)) if (/^yt-dlp/i.test(d)) l.push(path.join(pk, d, 'yt-dlp.exe'));
    } catch {}
  }
  l.push(path.join(KOK, 'araclar', 'yt-dlp.exe'));
  return l;
}
function ytdlpCalistir(arg, bitti, adaylar = ytdlpAdaylari()) {
  const exe = adaylar[0];
  require('child_process').execFile(exe, arg, { timeout: 240000, windowsHide: true, maxBuffer: 4e6, env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } }, (err, out, hata) => {
    if (err && err.code === 'ENOENT' && adaylar.length > 1) return ytdlpCalistir(arg, bitti, adaylar.slice(1));
    bitti(err, String(out || ''), String(hata || ''));
  });
}
function istekEkle(url) {
  url = String(url || '').trim();
  if (!/^https?:\/\/([a-z0-9-]+\.)?(youtube\.com|youtu\.be)\//i.test(url)) return;
  const i = { no: ++istekNo, url, baslik: url, durum: 'indiriliyor' };
  istekler.push(i); istekYayinla();
  fs.mkdirSync(ISTEK_KLASOR, { recursive: true });
  // şarkı adı ekrana değil dosyaya yazdırılır: Windows konsolu Türkçe/Kürtçe harfleri bozuyordu ("SOF�")
  const bilgi = path.join(ISTEK_KLASOR, 'bilgi-' + i.no + '.txt');
  ytdlpCalistir(['--no-playlist', '--no-warnings', '--no-progress', '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',   // webm (opus): OBS'in tarayıcısı da kesin çalar
    '--match-filter', 'duration<=' + ISTEK_EN_UZUN, '-o', path.join(ISTEK_KLASOR, '%(id)s.%(ext)s'),
    '--no-simulate', '--print-to-file', 'after_move:%(title)s\t%(filepath)s', bilgi, url], (err, out, hataYazi) => {
    try { out = fs.readFileSync(bilgi, 'utf8'); fs.unlink(bilgi, () => {}); } catch {}
    if (!istekler.includes(i)) return;   // bu arada panelden silindi
    const satir = out.trim().split(/\r?\n/).filter(s => s.includes('\t')).pop() || '';
    const [baslik, dosya] = satir.split('\t');
    if (err || !dosya || !fs.existsSync(dosya)) {
      i.durum = 'hata';
      i.hata = err && err.code === 'ENOENT' ? 'yt-dlp kurulu değil (winget install yt-dlp.yt-dlp)'
        : !err && !dosya ? 'indirilmedi (' + Math.round(ISTEK_EN_UZUN / 60) + ' dk\'dan uzun olabilir)'
        : (hataYazi.split(/\r?\n/).filter(s => /error/i.test(s)).pop() || (err && err.message) || 'indirilemedi').slice(0, 160);
    } else {
      i.durum = 'hazir'; i.baslik = baslik || i.url;
      i.yol = 'muzik/istek/' + encodeURIComponent(path.basename(dosya));
    }
    logYaz({ olay: 'istek', mesaj: (i.durum === 'hazir' ? 'İstek şarkı hazır: ' + i.baslik : 'İstek şarkı indirilemedi: ' + i.hata) });
    istekYayinla();
  });
}
function istekKaldir(no) {
  const i = istekler.find(x => x.no === no); if (!i) return;
  istekler = istekler.filter(x => x !== i);
  if (i.yol) setTimeout(() => fs.unlink(path.join(ISTEK_KLASOR, decodeURIComponent(i.yol.split('/').pop())), () => {}), 5000);
  istekYayinla();
}

// ---------- Panel komutları ----------
function komut(m) {
  switch (m.tip) {
    case 'istek': istekEkle(m.url); break;
    case 'video': {   // alt videonun başından/sonundan kesilecek saniye
      const v = videoAyar();
      for (const k of ['bas', 'son']) if (m[k] !== undefined && Number.isFinite(Number(m[k]))) v[k] = Math.max(0, Math.min(36000, Math.round(Number(m[k]))));
      durum.video = v; kaydet();
      yayinla({ tip: 'video', video: v });
      break;
    }
    case 'istekSil': istekKaldir(Number(m.no)); break;
    case 'arti': puanEkle(m.serit, Math.trunc(Number(m.miktar) || 1), 'panel', { id: 'panel', ad: 'Panel', foto: '' }); break;
    case 'sifirla': {
      const hedefler = m.serit ? durum.seritler.filter(s => s.id === m.serit) : durum.seritler;
      for (const s of hedefler) s.puan = 0;
      kaydet(); anonsLider = tekLider(); logYaz({ olay: 'sifirla', serit: m.serit || 'hepsi' });
      yayinla({ tip: 'sifirla' }); yayinla(durumOzet());
      break;
    }
    case 'ses': {
      const s = sesAyar();
      if (m.tik !== undefined && Number.isFinite(Number(m.tik))) s.tik = Math.max(0, Math.min(2.5, Number(m.tik)));
      if (m.muzik !== undefined && Number.isFinite(Number(m.muzik))) s.muzik = Math.max(0, Math.min(1, Number(m.muzik)));
      if (m.gecikme !== undefined && Number.isFinite(Number(m.gecikme))) s.gecikme = Math.max(-300, Math.min(300, Math.round(Number(m.gecikme))));
      if (m.anons !== undefined && Number.isFinite(Number(m.anons))) s.anons = Math.max(0, Math.min(2, Number(m.anons)));
      if (m.anonsAralik !== undefined && Number.isFinite(Number(m.anonsAralik))) s.anonsAralik = Math.max(0, Math.min(30, Math.round(Number(m.anonsAralik))));
      durum.ses = s; kaydet();
      yayinla({ tip: 'ses', ses: s });
      break;
    }
    case 'yer': {
      const y = yerAyar();
      for (const [k, [lo, hi]] of Object.entries(YER_SINIR))
        if (m[k] !== undefined && Number.isFinite(Number(m[k]))) y[k] = Math.max(lo, Math.min(hi, Number(m[k])));
      durum.yer = y; kaydet();
      yayinla({ tip: 'yer', yer: y });
      break;
    }
    case 'puanAyarla': {
      const s = durum.seritler.find(x => x.id === m.serit);
      const p = Math.max(0, Math.trunc(Number(m.puan)));
      if (s && Number.isFinite(p)) { s.puan = p; kaydet(); anonsKontrol(); logYaz({ olay: 'puanAyarla', serit: s.id, puan: p }); yayinla(durumOzet()); }
      break;
    }
    case 'sarkiKaldir': {   // yanlış ülkede / istenmeyen şarkıyı o ülkenin "eski" klasörüne taşı (silinmez)
      const serit = durum.seritler.find(x => x.id === m.serit);
      const ad = String(m.ad || '');
      if (!serit || !ad || ad !== path.basename(ad) || ad.startsWith('.')) break;
      const klasor = path.join(PUBLIC, 'muzik', serit.id), kaynak = path.join(klasor, ad);
      if (!fs.existsSync(kaynak)) break;
      fs.mkdirSync(path.join(klasor, 'eski'), { recursive: true });
      try { fs.renameSync(kaynak, path.join(klasor, 'eski', ad)); } catch (e) { console.error('şarkı taşınamadı', e); break; }
      logYaz({ olay: 'sarkiKaldir', serit: serit.id, ad });
      yayinla({ tip: 'muzikYenile' }, 'oyun');
      break;
    }
    case 'esle': {
      const giftId = Number(m.giftId);
      for (const s of durum.seritler) s.giftIds = s.giftIds.filter(g => g !== giftId);
      const s = durum.seritler.find(x => x.id === m.serit);
      if (s) { s.giftIds.push(giftId); const h = sonHediyeler.find(x => x.giftId === giftId); if (h && h.ikon) s.ikon = h.ikon; }
      kaydet(); logYaz({ olay: 'esle', giftId, serit: m.serit || 'yok' }); yayinla(durumOzet());
      break;
    }
    case 'baglan': baglan(m.kullanici); break;
    case 'kes': kes(); break;
  }
}

// ---------- HTTP ----------
const TURLER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.webm': 'audio/webm' };
const MUZIK_UZANTI = ['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.webm', '.opus'];
const sunucu = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/teshis') {   // telefondaki ses durumunu görmek için (geçici)
    try { fs.appendFileSync(path.join(__dirname, 'veri', 'teshis.log'), new Date().toISOString() + ' ' + (req.headers['user-agent'] || '').slice(0, 120) + ' ' + (url.searchParams.get('d') || '').slice(0, 500) + '\n'); } catch {}
    res.writeHead(204); return res.end();
  }
  if (url.pathname === '/api/adres') {   // telefondan girmek için güncel IP (modem değiştirebilir)
    const ipler = Object.values(require('os').networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254')).map(a => a.address);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(JSON.stringify({ ipler, port: PORT }));
  }
  if (url.pathname === '/api/muzik') {   // public/muzik/<serit>/ klasörlerindeki müzikler ("mars" ile başlayan dosya marş sayılır)
    const liste = {};
    for (const s of durum.seritler) {
      let dosyalar = [];
      try { dosyalar = fs.readdirSync(path.join(PUBLIC, 'muzik', s.id)).filter(f => MUZIK_UZANTI.includes(path.extname(f).toLowerCase())).sort(); } catch {}
      liste[s.id] = dosyalar.map(f => ({ yol: 'muzik/' + s.id + '/' + encodeURIComponent(f), mars: /^mar[sş]/i.test(f) }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(JSON.stringify(liste));
  }
  if (url.pathname === '/api/log') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(loglariOku(Number(url.searchParams.get('sayfa')) || 0)));
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/panel.html';
  const dosya = path.normalize(path.join(PUBLIC, p));
  if (!dosya.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  const tur = TURLER[path.extname(dosya).toLowerCase()] || 'application/octet-stream';
  // ses/video: parça parça gönderim (Range) — Safari/iPhone müzik çalmak için bunu ister
  if (tur.startsWith('audio/') || tur.startsWith('video/')) {
    return fs.stat(dosya, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('Bulunamadı'); }
      const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (r) {
        let bas = r[1] === '' ? st.size - Number(r[2]) : Number(r[1]);
        let son = r[1] !== '' && r[2] !== '' ? Number(r[2]) : st.size - 1;
        if (bas < 0 || bas >= st.size || son < bas) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
        son = Math.min(son, st.size - 1);
        res.writeHead(206, { 'Content-Type': tur, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${bas}-${son}/${st.size}`, 'Content-Length': son - bas + 1, 'Cache-Control': 'no-cache' });
        return fs.createReadStream(dosya, { start: bas, end: son }).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': tur, 'Accept-Ranges': 'bytes', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      fs.createReadStream(dosya).pipe(res);
    });
  }
  fs.readFile(dosya, (err, veri) => {
    if (err) { res.writeHead(404); return res.end('Bulunamadı'); }
    res.writeHead(200, { 'Content-Type': tur, 'Cache-Control': 'no-cache' });
    res.end(veri);
  });
});
const oyunSayfalari = new Map();   // kimlik -> son durum (açık oyun sayfaları)
let sonMuzikDurum = null;   // oyun sayfasının son bildirdiği müzik durumu (panelde gösterilir)
const wss = new WebSocketServer({ server: sunucu });
wss.on('connection', (ws, req) => {
  ws.rol = new URL(req.url, 'http://x').searchParams.get('rol') || 'oyun';
  istemciler.add(ws);
  ws.send(JSON.stringify(durumOzet()));
  ws.on('message', b => {
    let m; try { m = JSON.parse(b); } catch { return; }
    if (ws.rol === 'oyun' && m.tip === 'muzikDurum') {   // oyun sayfası müzik durumunu bildirir; aynı anda kaç oyun sayfası açık, panelde görünsün
      ws.oyunKimlik = m.kimlik;
      const k = String(m.kimlik || '?'), once = oyunSayfalari.get(k);
      oyunSayfalari.set(k, { zaman: Date.now(), ilk: once ? once.ilk : Date.now(), sessiz: !!m.sessiz, obs: !!m.obs, calan: m.calan || null, durum: m });
      for (const [a, v] of oyunSayfalari) if (Date.now() - v.zaman > 10000) oyunSayfalari.delete(a);
      // Panelde TEK sayfanın durumu gösterilsin: oyun birden çok yerde açıkken (OBS + Chrome) her biri sırayla
      // kendi şarkısını bildirince panel sürekli değişiyordu. Öncelik: sessiz olmayan > OBS > en eski açılan.
      const ana = [...oyunSayfalari.values()].sort((a, b) => (a.sessiz - b.sessiz) || (b.obs - a.obs) || (a.ilk - b.ilk))[0];
      if (ana.durum !== m) return;   // bu sayfa ana değil: paneli değiştirme
      // Herkes aynı müziği duysun: ana sayfanın çaldığı şarkı ve saniyesi diğer tüm oyun sayfalarına gider, onlar da aynısını çalar
      yayinla({ tip: 'muzikSenk', ana: m.kimlik, calan: m.calan || null }, 'oyun');
      const oyunlar = [...oyunSayfalari.values()].map(({ durum, ...v }) => v);
      sonMuzikDurum = { ...m, zaman: Date.now(), oyunlar };
      return yayinla(sonMuzikDurum, 'panel');
    }
    if (ws.rol === 'oyun' && m.tip === 'istekBasladi') {   // yayındaki oyun istek şarkıyı çalmaya başladı
      const i = istekler.find(x => x.no === Number(m.no));
      if (i) { i.durum = 'caliyor'; i.hata = null; i.calan = ws; istekYayinla(); }
      return;
    }
    if (ws.rol === 'oyun' && m.tip === 'istekBitti') {   // bitti / lider değişti → listeden düşer; çalınamadıysa hata olarak kalır
      const i = istekler.find(x => x.no === Number(m.no));
      if (i && i.calan && i.calan !== ws) return;   // başka bir oyun sayfası (OBS) zaten çalıyor: bu sayfanın hatası/bitişi sayılmaz
      if (i && m.hata) { i.durum = 'hata'; i.hata = 'Oyun çalamadı: ' + String(m.hata).slice(0, 120); i.calan = null; logYaz({ olay: 'istek', mesaj: 'İstek şarkı çalınamadı: ' + i.baslik + ' – ' + i.hata }); return istekYayinla(); }
      return istekKaldir(Number(m.no));
    }
    if (ws.rol !== 'panel') return;
    try { komut(m); } catch (e) { console.error(e); }
  });
  if (ws.rol === 'panel' && sonMuzikDurum) ws.send(JSON.stringify(sonMuzikDurum));
  ws.send(JSON.stringify(istekOzet()));
  ws.on('close', () => {
    istemciler.delete(ws);
    if (ws.oyunKimlik) oyunSayfalari.delete(String(ws.oyunKimlik));   // kapanan sayfa hemen ana olmaktan çıksın
    for (const i of istekler.filter(x => x.calan === ws)) istekKaldir(i.no);   // istek çalan oyun sayfası kapandı/yenilendi
  });
});
// 0.0.0.0: aynı Wi-Fi'deki telefon/tablet de açabilsin
sunucu.listen(PORT, '0.0.0.0', () => {
  console.log('Hazır!');
  console.log('  Panel: http://localhost:' + PORT + '/panel.html');
  console.log('  Oyun : http://localhost:' + PORT + '/oyun.html  (OBS tarayıcı kaynağı 1080x1920)');
  const ipler = Object.values(require('os').networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
  for (const ip of ipler) console.log('  Telefondan (aynı Wi-Fi): http://' + ip + ':' + PORT + '/oyun.html?arka   |   panel: http://' + ip + ':' + PORT + '/panel.html');
  if (durum.kullanici) baglan(durum.kullanici);
});
