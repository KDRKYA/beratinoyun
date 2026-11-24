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
const SES_VARSAYILAN = { tik: 1.4, muzik: 0.5, gecikme: 0 };   // gecikme: tık sesinin kayması (ms, + = ses daha geç)
function sesAyar() { return { ...SES_VARSAYILAN, ...(durum.ses || {}) }; }
// Yerleşim (panelden sürükleyerek): ust = üstteki oyunun ölçeği (1 = normal), videoX = alt videonun yatay kaydırması (-1 sol ... 1 sağ)
// Yerleşim: odaParlak = TV ekranı dışındaki odanın parlaklığı (1 = normal), hayvanParlak/cizgiParlak/haleParlak = hayvanların, şerit çizgilerinin ve hayvanların arkasındaki elips ışığın parlaklığı, ust = üstteki oyunun ölçeği, oyunX/videoX = yatay kaydırma (-1 sol ... 1 sağ), oyunY/videoY = dikey kaydırma (-1 yukarı ... 1 aşağı), videoZoom = videoyu yakınlaştırma,
// oyunSol/oyunSag/oyunUst/oyunAlt = üstteki oyunun kenarlarından kesilen pay, videoKirp/videoAlt/videoSol/videoSag = videonun üst/alt/sol/sağ kesme payı
const YER_SINIR = { odaParlak: [0.3, 1.6], hayvanParlak: [0.3, 1.6], cizgiParlak: [0.1, 1.8], haleParlak: [0, 2.5], ust: [0.6, 1.5], videoX: [-1, 1], oyunX: [-1, 1], oyunY: [-1, 1], videoY: [-1, 1], videoZoom: [1, 2.5], oyunSol: [0, 0.4], oyunSag: [0, 0.4], oyunUst: [0, 0.4], oyunAlt: [0, 0.4], videoKirp: [0, 0.4], videoAlt: [0, 0.4], videoSol: [0, 0.4], videoSag: [0, 0.4] };
const YER_VARSAYILAN = { odaParlak: 1, hayvanParlak: 1, cizgiParlak: 1, haleParlak: 1, ust: 1, videoX: 0, oyunX: 0, oyunY: 0, videoY: 0, videoZoom: 1, oyunSol: 0, oyunSag: 0, oyunUst: 0, oyunAlt: 0, videoKirp: 0, videoAlt: 0, videoSol: 0, videoSag: 0 };
function yerAyar() { return { ...YER_VARSAYILAN, ...(durum.yer || {}) }; }
function durumOzet() {
  return { tip: 'durum', seritler: durum.seritler, kullanici: durum.kullanici, baglanti: baglantiDurum, sonHediyeler, ses: sesAyar(), yer: yerAyar() };
}

// ---------- Puan ----------
function puanEkle(seritId, miktar, kaynak, kullanici) {
  const s = durum.seritler.find(x => x.id === seritId);
  if (!s || !miktar) return;
  s.puan = Math.max(0, s.puan + miktar);
  kaydet();
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

// ---------- Panel komutları ----------
function komut(m) {
  switch (m.tip) {
    case 'arti': puanEkle(m.serit, Math.trunc(Number(m.miktar) || 1), 'panel', { id: 'panel', ad: 'Panel', foto: '' }); break;
    case 'sifirla': {
      const hedefler = m.serit ? durum.seritler.filter(s => s.id === m.serit) : durum.seritler;
      for (const s of hedefler) s.puan = 0;
      kaydet(); logYaz({ olay: 'sifirla', serit: m.serit || 'hepsi' });
      yayinla({ tip: 'sifirla' }); yayinla(durumOzet());
      break;
    }
    case 'ses': {
      const s = sesAyar();
      if (m.tik !== undefined && Number.isFinite(Number(m.tik))) s.tik = Math.max(0, Math.min(2.5, Number(m.tik)));
      if (m.muzik !== undefined && Number.isFinite(Number(m.muzik))) s.muzik = Math.max(0, Math.min(1, Number(m.muzik)));
      if (m.gecikme !== undefined && Number.isFinite(Number(m.gecikme))) s.gecikme = Math.max(-300, Math.min(300, Math.round(Number(m.gecikme))));
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
      if (s && Number.isFinite(p)) { s.puan = p; kaydet(); logYaz({ olay: 'puanAyarla', serit: s.id, puan: p }); yayinla(durumOzet()); }
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
let sonMuzikDurum = null;   // oyun sayfasının son bildirdiği müzik durumu (panelde gösterilir)
const wss = new WebSocketServer({ server: sunucu });
wss.on('connection', (ws, req) => {
  ws.rol = new URL(req.url, 'http://x').searchParams.get('rol') || 'oyun';
  istemciler.add(ws);
  ws.send(JSON.stringify(durumOzet()));
  ws.on('message', b => {
    let m; try { m = JSON.parse(b); } catch { return; }
    if (ws.rol === 'oyun' && m.tip === 'muzikDurum') { sonMuzikDurum = { ...m, zaman: Date.now() }; return yayinla(sonMuzikDurum, 'panel'); }   // oyun sayfası müzik durumunu bildirir
    if (ws.rol !== 'panel') return;
    try { komut(m); } catch (e) { console.error(e); }
  });
  if (ws.rol === 'panel' && sonMuzikDurum) ws.send(JSON.stringify(sonMuzikDurum));
  ws.on('close', () => istemciler.delete(ws));
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
