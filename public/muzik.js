// ---------- Müzik: birinci olan ülkenin şarkıları sırayla çalar ----------
// Dosyalar: public/muzik/<serit>/  (afghanistan, suriye, kurdistan, turkiye, azerbaycan)
// Klasördeki her şarkı (adı "mars" ile başlayanlar hariç) ada göre sırayla çalar: 0-..., 1-..., 2-...
// Her şarkının sadece EN HAREKETLİ ~40 saniyesi çalar, sonra yumuşak geçişle sıradaki şarkıya geçer.
// Ülke birinci olunca o ülkenin SIRADAKİ şarkısı en hareketli yerinden hemen başlar.
// En hareketli yer otomatik bulunur. Elle ayarlamak istersen: public/muzik/ayar.json
//   "turkiye": { "dosya": "0-dombra.mp3", "bas": 49.48, "son": 90.07 }          (tek şarkı, eski biçim)
//   "turkiye": { "parcalar": { "1-x.mp3": { "bas": 30, "son": 70 } } }         (istediğin kadar şarkı)
// Klasöre dosya eklemek / ayarı değiştirmek yeterli; oyun 30 sn içinde kendisi görür.
let MUZIK_SEVIYE = 0.5;      // müzik sesi (0-1). Panelden "Müzik sesi" ile değişir
const MUZIK_GECIS = 0.15;    // lider değişince eski şarkının kısılma süresi (sn): yeni şarkı beklemeden başlar
const BOLUM_SURE = 40;       // her şarkıdan kaç saniye çalsın (ayar.json'da bas/son yoksa)
const SARKI_GECIS = 1.2;     // aynı ülkenin şarkıları arasında yumuşak geçiş (sn)
const MUZIK_KONTROL = 50;    // lider kaç ms'de bir kontrol edilsin
const TAMPON_EN_FAZLA = 8;   // bellekte en fazla kaç şarkı bölümü dursun (OBS'i yormasın)

let muzikListe = {}, muzikAyar = {}, calanSerit = null;
let oynatici = null;          // { kaynak, g, id, yol, zamanlayici }
const sira = {};              // id -> sıradaki şarkının numarası
const muzikTampon = new Map();// yol -> bölüm (AudioBuffer)
const kuyruk = [];            // yüklenecek şarkılar (tek tek çözülür, bellek patlamasın)
let yukleniyor = null;

const bozuk = new Map();      // yol -> neden (çözülemeyen / çok büyük şarkılar atlanır, sıradakine geçilir)
const MUZIK_EN_BUYUK = 40e6;  // bundan büyük dosya (saatlik mix vb.) belleği patlatır: atlanır
function muzikParcalar(id) { return (muzikListe[id] || []).filter(x => !x.mars && !bozuk.has(x.yol)); }
function dosyaAdi(yol) { return decodeURIComponent(yol.split('/').pop()); }

async function muzikListeYukle() {
  try { muzikListe = await (await fetch('/api/muzik', { cache: 'no-store' })).json(); } catch {}
  try { const r = await fetch('muzik/ayar.json', { cache: 'no-store' }); if (r.ok) muzikAyar = await r.json(); } catch {}
  for (const id of Object.keys(muzikListe)) { const l = muzikParcalar(id); if (l.length) yukle(l[(sira[id] || 0) % l.length].yol, id); }
}
muzikListeYukle(); setInterval(muzikListeYukle, 30000);

// ayar.json'da bu şarkı için elle yazılmış bas/son var mı?
function elleAyar(id, ad) {
  const a = muzikAyar[id] || {};
  const p = a.parcalar && a.parcalar[ad];
  if (p && Number.isFinite(Number(p.bas))) return { bas: Number(p.bas), son: p.son ? Number(p.son) : null };
  if (a.dosya === ad && Number.isFinite(Number(a.bas))) return { bas: Number(a.bas), son: a.son ? Number(a.son) : null };
  return null;
}

// Şarkının en hareketli BOLUM_SURE saniyesini bul (ses enerjisi en yüksek pencere)
function enHareketli(tam) {
  const sr = tam.sampleRate, sure = tam.duration;
  if (sure <= BOLUM_SURE + 4) return { bas: 0, son: sure };
  const adim = Math.floor(sr * 0.25), n = Math.floor(tam.length / adim);
  const kanallar = []; for (let k = 0; k < tam.numberOfChannels; k++) kanallar.push(tam.getChannelData(k));
  const enerji = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let t = 0; const b = i * adim;
    for (const d of kanallar) for (let j = b; j < b + adim; j += 4) t += d[j] * d[j];
    enerji[i] = Math.sqrt(t / (adim / 4 * kanallar.length));
  }
  const w = Math.round(BOLUM_SURE / 0.25);
  const ilk = Math.floor(n * 0.06), sonUc = n - Math.floor(n * 0.04) - w;   // girişi ve kapanışı atla
  let top = 0; for (let i = ilk; i < ilk + w && i < n; i++) top += enerji[i];
  let en = top, enI = ilk;
  for (let i = ilk + 1; i <= sonUc; i++) { top += enerji[i + w - 1] - enerji[i - 1]; if (top > en) { en = top; enI = i; } }
  const bas = enI * 0.25;
  return { bas, son: bas + BOLUM_SURE };
}

function yukle(yol, id) {
  if (muzikTampon.has(yol) || yukleniyor === yol || kuyruk.some(x => x.yol === yol)) return;
  kuyruk.push({ yol, id }); kuyrukIsle();
}
async function kuyrukIsle() {
  if (yukleniyor || !kuyruk.length) return;
  sesHazirla(); if (!ses) return;
  const { yol, id } = kuyruk.shift(); yukleniyor = yol;
  try {
    const veri = await (await fetch(yol)).arrayBuffer();
    if (veri.byteLength > MUZIK_EN_BUYUK) throw new Error('dosya çok büyük (' + Math.round(veri.byteLength / 1e6) + ' MB)');
    const tam = await ses.decodeAudioData(veri);
    const sr = tam.sampleRate;
    const b = elleAyar(id, dosyaAdi(yol)) || enHareketli(tam);
    const b0 = Math.max(0, Math.min(Math.floor(b.bas * sr), tam.length - sr));
    const b1 = Math.min(tam.length, Math.floor((b.son || b.bas + BOLUM_SURE) * sr));
    const n = Math.max(sr, b1 - b0);
    const kes = ses.createBuffer(tam.numberOfChannels, n, sr);
    for (let k = 0; k < tam.numberOfChannels; k++) kes.copyToChannel(tam.getChannelData(k).subarray(b0, b0 + n), k);
    muzikTampon.set(yol, kes);
    tamponTemizle();
    if (calanSerit === id && !oynatici) muzikCal(id);
  } catch (e) {
    console.warn('müzik yüklenemedi', yol, e);
    bozuk.set(yol, String((e && e.message) || e).slice(0, 80));
    const l = muzikParcalar(id);                                   // bu şarkıyı atla, sıradakini hazırla
    if (l.length) yukle(l[(sira[id] || 0) % l.length].yol, id);
    if (calanSerit === id && !oynatici) muzikCal(id);
  }
  yukleniyor = null; kuyrukIsle();
}
// bellekte çok şarkı birikmesin: çalan ve her ülkenin sıradaki şarkısı dışındakileri at
function tamponTemizle() {
  if (muzikTampon.size <= TAMPON_EN_FAZLA) return;
  const gerekli = new Set(); if (oynatici) gerekli.add(oynatici.yol);
  for (const id of Object.keys(muzikListe)) { const l = muzikParcalar(id); if (l.length) gerekli.add(l[(sira[id] || 0) % l.length].yol); }
  for (const yol of [...muzikTampon.keys()]) { if (muzikTampon.size <= TAMPON_EN_FAZLA) break; if (!gerekli.has(yol)) muzikTampon.delete(yol); }
}

function muzikSondur(o, sure) {
  if (!o || !ses) return;
  clearTimeout(o.zamanlayici);
  const t = ses.currentTime;
  o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0, t + sure);
  try { o.kaynak.stop(t + sure + 0.02); } catch {}
}
// id ülkesinin sıradaki şarkısını çal. gecis: eski şarkı kaç saniyede kısılsın
function muzikCal(id, gecis = MUZIK_GECIS) {
  const l = muzikParcalar(id);
  calanSerit = id;
  if (!l.length) { muzikSondur(oynatici, gecis); oynatici = null; return; }
  const i = (sira[id] || 0) % l.length, yol = l[i].yol;
  const tampon = muzikTampon.get(yol);
  if (!tampon || !ses) {
    if (gecis === MUZIK_GECIS) { muzikSondur(oynatici, gecis); oynatici = null; }   // lider değişti: eskisi sussun
    else if (oynatici) { tekrarCal(); }                                              // sıradaki hazır değil: aynısı bir tur daha
    yukle(yol, id); return;                                                          // yüklenince kendisi başlar
  }
  muzikSondur(oynatici, gecis);
  if (ses.state !== 'running') ses.resume();
  const kaynak = ses.createBufferSource(); kaynak.buffer = tampon;
  const g = ses.createGain(); kaynak.connect(g); g.connect(ses.destination);
  const t = ses.currentTime, d = tampon.duration;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + Math.min(0.3, gecis + 0.15));
  kaynak.start(t);
  const o = { kaynak, g, id, yol, zamanlayici: null };
  // bölüm bitmeden sıradaki şarkıya yumuşak geçiş
  o.zamanlayici = setTimeout(() => { if (oynatici === o && calanSerit === id) muzikCal(id, SARKI_GECIS); }, Math.max(1, d - SARKI_GECIS) * 1000);
  oynatici = o;
  sira[id] = (i + 1) % l.length;
  yukle(l[sira[id]].yol, id);   // sıradakini şimdiden hazırla
}
function tekrarCal() {           // sıradaki şarkı yüklenemediyse çalan bölümü baştan bir kez daha çal
  const o = oynatici; if (!o) return;
  const id = o.id, l = muzikParcalar(id);
  const geri = l.findIndex(x => x.yol === o.yol); if (geri >= 0) sira[id] = geri;
  const tampon = muzikTampon.get(o.yol); if (!tampon) return;
  muzikSondur(o, SARKI_GECIS); oynatici = null;
  const kaynak = ses.createBufferSource(); kaynak.buffer = tampon;
  const g = ses.createGain(); kaynak.connect(g); g.connect(ses.destination);
  const t = ses.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + 0.3); kaynak.start(t);
  const yeni = { kaynak, g, id, yol: o.yol, zamanlayici: null };
  yeni.zamanlayici = setTimeout(() => { if (oynatici === yeni) { sira[id] = (geri + 1) % l.length; muzikCal(id, SARKI_GECIS); } }, Math.max(1, tampon.duration - SARKI_GECIS) * 1000);
  oynatici = yeni;
}
function muzikSeviyeAyarla(v) {   // panelden gelen müzik sesi: çalan şarkıya yumuşakça uygulanır
  MUZIK_SEVIYE = Math.max(0, Math.min(1, v));
  if (oynatici && ses) { const t = ses.currentTime; oynatici.g.gain.cancelScheduledValues(t); oynatici.g.gain.setValueAtTime(oynatici.g.gain.value, t); oynatici.g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + 0.2); }
}
function muzikKontrol() {
  if (typeof seritler === 'undefined' || !seritler.length) return;
  const sirali = [...seritler].sort((a, b) => b.puan - a.puan), lider = sirali[0];
  if (!lider || lider.puan <= 0) return;                                       // kimsenin puanı yok
  if (sirali[1] && sirali[1].puan === lider.puan && calanSerit) return;         // berabere: çalan devam etsin
  if (lider.id !== calanSerit) muzikCal(lider.id);                              // yeni birinci: hemen kendi şarkısı
  else if (!oynatici && muzikTampon.size) muzikCal(lider.id);                   // hiç çalmıyorsa başlat
}
setInterval(muzikKontrol, MUZIK_KONTROL);

// ---------- Panele müzik durumu: her ülkede kaç şarkı var, kaçı hazır, hangisi çalıyor ----------
function muzikDurumGonder() {
  const ws = window.oyunSoket; if (!ws || ws.readyState !== 1) return;
  const ulkeler = {};
  for (const id of Object.keys(muzikListe)) {
    const hepsi = (muzikListe[id] || []).filter(x => !x.mars);
    ulkeler[id] = hepsi.map(x => ({ ad: dosyaAdi(x.yol), hazir: muzikTampon.has(x.yol), bozuk: bozuk.get(x.yol) || null }));
  }
  ws.send(JSON.stringify({ tip: 'muzikDurum', surum: 2, ulkeler, calan: oynatici ? { id: oynatici.id, ad: dosyaAdi(oynatici.yol) } : null, sesDurum: ses ? ses.state : 'yok' }));
}
setInterval(muzikDurumGonder, 3000);
