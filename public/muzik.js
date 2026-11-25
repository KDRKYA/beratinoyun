// ---------- Müzik: birinci olan ülkenin şarkıları sırayla çalar ----------
// Dosyalar: public/muzik/<serit>/  (afghanistan, suriye, kurdistan, turkiye, azerbaycan)
// Klasördeki her şarkı (adı "mars" ile başlayanlar hariç) ada göre sırayla çalar: 0-..., 1-..., 2-...
// Her şarkının sadece EN HAREKETLİ ~40 saniyesi çalar, sonra yumuşak geçişle sıradaki şarkıya geçer.
// Ülke birinci olunca o ülkenin SIRADAKİ şarkısı en hareketli yerinden hemen başlar.
// En hareketli yer otomatik bulunur. Elle ayarlamak istersen: public/muzik/ayar.json
//   "turkiye": { "dosya": "0-dombra.mp3", "bas": 49.48, "son": 90.07 }          (tek şarkı, eski biçim)
//   "turkiye": { "parcalar": { "1-x.mp3": { "bas": 30, "son": 70 } } }         (istediğin kadar şarkı)
// Klasöre dosya eklemek / ayarı değiştirmek yeterli; oyun 30 sn içinde kendisi görür.
// ?sessiz ile açılan oyun sayfası (paneldeki önizleme) müzik çalmaz: yayındaki sayfayla üst üste binmesin
const MUZIK_SESSIZ = new URLSearchParams(location.search).has('sessiz');
const OYUN_KIMLIK = Math.random().toString(36).slice(2, 8);   // aynı anda kaç oyun sayfası açık, panel bunu görsün
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
let takipci = false;          // oyun birden çok yerde açıksa: true = bu sayfa ana sayfanın çaldığını aynen çalar

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
// panelden şarkı kaldırılınca hemen listeyi yenile; kaldırılan şarkı çalıyorsa sıradakine geç
async function muzikHemenYenile() {
  await muzikListeYukle();
  if (takipci) return;
  if (oynatici && !oynatici.istek && !(muzikListe[oynatici.id] || []).some(x => x.yol === oynatici.yol)) { muzikTampon.delete(oynatici.yol); muzikCal(oynatici.id, SARKI_GECIS); }
}

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
    if (calanSerit === id && !oynatici && !takipci) muzikCal(id);
    if (takipci && sonSenk && sonSenk.calan && sonSenk.calan.yol === yol) muzikSenkAl(sonSenk);   // ana sayfanın çaldığı şarkı şimdi hazır: hemen katıl
  } catch (e) {
    console.warn('müzik yüklenemedi', yol, e);
    bozuk.set(yol, String((e && e.message) || e).slice(0, 80));
    const l = muzikParcalar(id);                                   // bu şarkıyı atla, sıradakini hazırla
    if (l.length) yukle(l[(sira[id] || 0) % l.length].yol, id);
    if (calanSerit === id && !oynatici && !takipci) muzikCal(id);
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
  if (o.audio) {   // istek şarkı: kısılınca durdur, sunucuya "bitti" de (sona geldi ya da lider değişti)
    o.audio.onended = o.audio.ontimeupdate = null;
    setTimeout(() => { try { o.audio.pause(); o.audio.removeAttribute('src'); o.audio.load(); } catch {} }, (sure + 0.05) * 1000);
    if (!o.takip) istekGonder({ tip: 'istekBitti', no: o.istek });
  } else { try { o.kaynak.stop(t + sure + 0.02); } catch {} }
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
  const o = { kaynak, g, id, yol, zamanlayici: null, bas: t, sure: d };
  // bölüm bitmeden sıradaki şarkıya yumuşak geçiş
  o.zamanlayici = setTimeout(() => { if (oynatici === o && calanSerit === id) muzikCal(id, SARKI_GECIS); }, Math.max(1, d - SARKI_GECIS) * 1000);
  oynatici = o;
  sira[id] = (i + 1) % l.length;
  yukle(l[sira[id]].yol, id);   // sıradakini şimdiden hazırla
  setTimeout(muzikDurumGonder, 30);   // şarkı değişti: diğer sayfalar hemen aynısına geçsin
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
  const yeni = { kaynak, g, id, yol: o.yol, zamanlayici: null, bas: t, sure: tampon.duration };
  yeni.zamanlayici = setTimeout(() => { if (oynatici === yeni) { sira[id] = (geri + 1) % l.length; muzikCal(id, SARKI_GECIS); } }, Math.max(1, tampon.duration - SARKI_GECIS) * 1000);
  oynatici = yeni;
}
function muzikSeviyeAyarla(v) {   // panelden gelen müzik sesi: çalan şarkıya yumuşakça uygulanır
  MUZIK_SEVIYE = Math.max(0, Math.min(1, v));
  if (oynatici && ses) { const t = ses.currentTime; oynatici.g.gain.cancelScheduledValues(t); oynatici.g.gain.setValueAtTime(oynatici.g.gain.value, t); oynatici.g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + 0.2); }
}
// Birinci, sunucudaki ASIL puana göre belirlenir. Ekrandaki sayaç uçan avatarlar hayvana değdikçe artar;
// sayfa arka planda/gizliyken avatarlar uçmaz, sayaç geride kalır ve eskiden yanlış ülkenin şarkısı çalıyordu.
const asilPuan = s => (s.gercek ?? s.puan);
function muzikKontrol() {
  if (MUZIK_SESSIZ || takipci) return;   // takipçi sayfa kendi seçmez, ana sayfayı dinler
  if (typeof seritler === 'undefined' || !seritler.length) return;
  if (oynatici && oynatici.istek && !oynatici.id) return;   // kimse birinci değilken açılan istek şarkı sonuna kadar çalsın
  const sirali = [...seritler].sort((a, b) => asilPuan(b) - asilPuan(a)), lider = sirali[0];
  if (!lider || asilPuan(lider) <= 0) return;                                       // kimsenin puanı yok
  // berabere: çalan ülke de birincilerden biriyse o devam etsin. Değilse (ör. iki ülke birden öne geçti)
  // eski ülkenin şarkısı çalmaya devam ETMESİN: birincilerden birininki başlasın.
  const birinciler = sirali.filter(s => asilPuan(s) === asilPuan(lider));
  if (birinciler.length > 1) {
    if (birinciler.some(s => s.id === calanSerit)) { if (!oynatici && muzikTampon.size) muzikCal(calanSerit); return; }
    return muzikCal(birinciler[0].id);
  }
  if (lider.id !== calanSerit) muzikCal(lider.id);                              // yeni birinci: hemen kendi şarkısı
  else if (!oynatici && muzikTampon.size) muzikCal(lider.id);                   // hiç çalmıyorsa başlat
}
setInterval(muzikKontrol, MUZIK_KONTROL);

// panelde ilerleme çubuğu için: çalan şarkının kaçıncı saniyesindeyiz, toplam kaç saniye
function calanKonum(o) {
  if (o.audio) return { konum: o.audio.currentTime || 0, sure: Number.isFinite(o.audio.duration) ? o.audio.duration : 0 };
  if (ses && o.sure) return { konum: Math.max(0, Math.min(o.sure, ses.currentTime - o.bas)), sure: o.sure };
  return {};
}
// ---------- Panele müzik durumu: her ülkede kaç şarkı var, kaçı hazır, hangisi çalıyor ----------
function muzikDurumGonder() {
  const ws = window.oyunSoket; if (!ws || ws.readyState !== 1) return;
  const ulkeler = {};
  for (const id of Object.keys(muzikListe)) {
    const hepsi = (muzikListe[id] || []).filter(x => !x.mars);
    ulkeler[id] = hepsi.map(x => ({ ad: dosyaAdi(x.yol), hazir: muzikTampon.has(x.yol), bozuk: bozuk.get(x.yol) || null }));
  }
  const sirali = typeof seritler !== 'undefined' ? [...seritler].sort((a, b) => asilPuan(b) - asilPuan(a)) : [];
  const lider = sirali[0] && asilPuan(sirali[0]) > 0 ? sirali.filter(x => asilPuan(x) === asilPuan(sirali[0])).map(x => x.id) : [];
  ws.send(JSON.stringify({ tip: 'muzikDurum', surum: 5, kimlik: OYUN_KIMLIK, sessiz: MUZIK_SESSIZ, obs: /OBS/i.test(navigator.userAgent) || !!window.obsstudio, lider, ulkeler, calan: oynatici ? { id: oynatici.id, yol: oynatici.yol, ad: oynatici.istek ? oynatici.ad : dosyaAdi(oynatici.yol), istek: !!oynatici.istek, ...calanKonum(oynatici) } : null, sesDurum: ses ? ses.state : 'yok', videoSure: (typeof altVideo !== 'undefined' && altVideo && Number.isFinite(altVideo.duration)) ? altVideo.duration : 0, videoKonum: (typeof altVideo !== 'undefined' && altVideo) ? altVideo.currentTime : 0, yer: typeof YER !== 'undefined' ? YER : null }));
}
setInterval(muzikDurumGonder, 3000);

// ---------- İstek şarkı (panelden YouTube linki) ----------
// Sunucu linkin sesini indirir; burada, o an birinci olan ülkenin müziğinin arasına girer ve TAMAMI çalar.
// Bitince aynı ülkenin sıradaki şarkısıyla döngü kaldığı yerden devam eder.
// İstek çalarken o ülke birincilikten düşerse istek kesilir, yeni birincinin sıradaki şarkısı başlar.
// Uzun şarkı belleği şişirmesin diye çözülüp belleğe alınmaz, <audio> ile akarak çalar.
let istekListe = [], istekHazirlaniyor = null;
const istekCalinan = new Set();
function istekGonder(m) { const ws = window.oyunSoket; if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
function istekGuncelle(liste) {
  istekListe = liste || [];
  if (takipci) return;   // takipçi sayfa isteği ana sayfadan izler
  // panelden silindiyse kes, ülkenin döngüsüne dön
  if (oynatici && oynatici.istek && !istekListe.some(x => x.no === oynatici.istek)) istekSonu(oynatici);
  istekKontrol();
}
function istekSonu(o) {   // istek bitti/silindi: birincinin (yoksa çalan ülkenin) sıradaki şarkısı
  if (oynatici !== o) return;
  muzikSondur(o, SARKI_GECIS); oynatici = null;
  const id = o.id || calanSerit;
  if (id && muzikParcalar(id).length) muzikCal(id, SARKI_GECIS);   // sıradaki hazır değilse yüklenince kendisi başlar
  setTimeout(istekKontrol, 300);
}
function istekKontrol() {
  if (MUZIK_SESSIZ || takipci || istekHazirlaniyor || (oynatici && oynatici.istek)) return;
  const s = istekListe.find(x => x.durum === 'hazir' && x.yol && !istekCalinan.has(x.no)); if (!s) return;
  sesHazirla(); if (!ses) return;
  istekCalinan.add(s.no); istekHazirlaniyor = s.no;
  const audio = new Audio(); audio.preload = 'auto';
  const hata = neden => {
    if (istekHazirlaniyor !== s.no) return; istekHazirlaniyor = null; clearTimeout(bekle);
    audio.oncanplay = audio.onerror = null;
    istekGonder({ tip: 'istekBitti', no: s.no, hata: neden });
    setTimeout(istekKontrol, 300);
  };
  const bekle = setTimeout(() => hata('dosya 60 sn içinde açılamadı'), 60000);
  audio.onerror = () => hata('dosya açılamadı (kod ' + (audio.error ? audio.error.code : '?') + ')');
  audio.oncanplay = () => {
    audio.oncanplay = null; clearTimeout(bekle);
    if (istekHazirlaniyor !== s.no) return; istekHazirlaniyor = null;
    if (!istekListe.some(x => x.no === s.no)) return;   // bu arada silindi
    if (ses.state !== 'running') ses.resume();
    const g = ses.createGain(); ses.createMediaElementSource(audio).connect(g); g.connect(ses.destination);
    muzikSondur(oynatici, SARKI_GECIS);                   // çalan ülke şarkısı yumuşakça kısılır (sırası ilerlemez)
    const t = ses.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + SARKI_GECIS);
    const o = { audio, g, id: calanSerit, yol: s.yol, ad: s.baslik, istek: s.no, zamanlayici: null };
    oynatici = o;
    audio.play().then(() => { istekGonder({ tip: 'istekBasladi', no: s.no }); setTimeout(muzikDurumGonder, 30); })
      .catch(e => { istekGonder({ tip: 'istekBitti', no: s.no, hata: 'çalma engellendi: ' + ((e && e.name) || e) }); o.istek = -1; istekSonu(o); });
    let bitiyor = false;   // sona SARKI_GECIS kala ülkenin şarkısına yumuşak geçiş
    audio.ontimeupdate = () => { if (!bitiyor && Number.isFinite(audio.duration) && audio.duration - audio.currentTime < SARKI_GECIS) { bitiyor = true; istekSonu(o); } };
    audio.onended = () => istekSonu(o);
  };
  audio.src = s.yol;
}
setInterval(istekKontrol, 2000);

// ---------- Spiker anonsu ----------
// Sunucu "Türkiye öne geçti!" gibi bir anons gönderince: müzik kısa bir süre kısılır, ses çalar, müzik geri açılır.
let ANONS_SEVIYE = 1;            // panelden "Anons" sesi (0 = kapalı)
const ANONS_KISIK = 0.3;         // anons sırasında müzik normalin kaçta kaçına insin
const anonsTampon = new Map();
async function anonsCal(dosya) {
  if (MUZIK_SESSIZ || !(ANONS_SEVIYE > 0)) return;
  sesHazirla(); if (!ses) return;
  try {
    let t = anonsTampon.get(dosya);
    if (!t) { t = await ses.decodeAudioData(await (await fetch(dosya)).arrayBuffer()); anonsTampon.set(dosya, t); }
    if (ses.state !== 'running') ses.resume();
    const k = ses.createBufferSource(); k.buffer = t;
    const g = ses.createGain(); g.gain.value = ANONS_SEVIYE; k.connect(g); g.connect(ses.destination);
    const s = ses.currentTime, o = oynatici;
    if (o) {   // müziği kıs → anons → geri aç
      o.g.gain.cancelScheduledValues(s); o.g.gain.setValueAtTime(o.g.gain.value, s);
      o.g.gain.linearRampToValueAtTime(MUZIK_SEVIYE * ANONS_KISIK, s + 0.25);
      o.g.gain.setValueAtTime(MUZIK_SEVIYE * ANONS_KISIK, s + 0.25 + t.duration);
      o.g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, s + 0.25 + t.duration + 0.6);
    }
    k.start(s + 0.25);
  } catch (e) { console.warn('anons çalınamadı', dosya, e); }
}
function anonsSeviyeAyarla(v) { ANONS_SEVIYE = Math.max(0, Math.min(2, v)); }

// ---------- Herkes aynı müziği duysun ----------
// Oyun birden çok yerde açıksa (OBS, Chrome, telefon) sunucu birini "ana" seçer (öncelik OBS).
// Ana sayfa şarkıyı kendisi seçer; diğerleri (takipçi) ana sayfanın çaldığı şarkıyı AYNI saniyeden çalar.
// Ana sayfa kapanırsa sıradaki sayfa ana olur ve kaldığı yerden kendi döngüsünü sürdürür.
const SENK_KAYMA = 0.35;   // saniye: takipçi ana sayfadan bu kadar saparsa yeniden hizalanır
let sonSenk = null;        // ana sayfadan gelen son bilgi: şarkı yüklenince beklemeden başlamak için
function muzikSenkAl(m) {
  if (MUZIK_SESSIZ) return;
  const eskiTakipci = takipci;
  takipci = m.ana !== OYUN_KIMLIK;
  if (!takipci) {   // ana sayfa biziz
    const o = oynatici;
    if (eskiTakipci && o && o.takip) {
      const id = o.id || calanSerit;
      if (!o.audio && id && ses) {   // çalan ülke şarkısı kaldığı yerden sürsün, bitince sıradakine geçilsin
        o.takip = false;
        const kalan = o.sure - (ses.currentTime - o.bas);
        o.zamanlayici = setTimeout(() => { if (oynatici === o) muzikCal(id, SARKI_GECIS); }, Math.max(0.5, kalan - SARKI_GECIS) * 1000);
      } else { muzikSondur(o, SARKI_GECIS); oynatici = null; if (id) muzikCal(id, SARKI_GECIS); }
    }
    return;
  }
  const c = m.calan;
  if (!c || !c.yol) { if (oynatici) { muzikSondur(oynatici, SARKI_GECIS); oynatici = null; } return; }
  if (c.id) {
    calanSerit = c.id;
    const l = muzikParcalar(c.id), i = l.findIndex(x => x.yol === c.yol);
    if (i >= 0) { sira[c.id] = (i + 1) % l.length; yukle(l[sira[c.id]].yol, c.id); }   // sıradakini önceden yükle; ana olursak döngü aynı yerden sürer
  }
  if (!m.alinma) m.alinma = performance.now();
  sonSenk = m;
  const hedef = (c.konum || 0) + 0.05 + (performance.now() - m.alinma) / 1000;   // yoldaki gecikme + bekleme payı
  if (c.istek) return senkIstek(c, hedef);
  // ülke şarkısı: bölüm bellekte değilse yükle, sonraki senkte başlar
  const tampon = muzikTampon.get(c.yol);
  if (!tampon || !ses) { yukle(c.yol, c.id); return; }
  if (oynatici && !oynatici.audio && oynatici.yol === c.yol && ses) {
    const benim = ses.currentTime - oynatici.bas;
    if (Math.abs(benim - hedef) < SENK_KAYMA) return;   // zaten aynı yerdeyiz
  }
  const ayni = oynatici && oynatici.yol === c.yol;
  muzikSondur(oynatici, ayni ? 0.05 : SARKI_GECIS);
  if (ses.state !== 'running') ses.resume();
  const kaynak = ses.createBufferSource(); kaynak.buffer = tampon;
  const g = ses.createGain(); kaynak.connect(g); g.connect(ses.destination);
  const t = ses.currentTime, bas = Math.min(Math.max(0, hedef), Math.max(0, tampon.duration - 0.1));
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + (ayni ? 0.08 : 0.3));
  kaynak.start(t, bas);
  oynatici = { kaynak, g, id: c.id, yol: c.yol, zamanlayici: null, bas: t - bas, sure: tampon.duration, takip: true };
}
function senkIstek(c, hedef) {
  if (oynatici && oynatici.audio && oynatici.yol === c.yol) {
    if (Math.abs(oynatici.audio.currentTime - hedef) > SENK_KAYMA) try { oynatici.audio.currentTime = hedef; } catch {}
    return;
  }
  if (!ses) return;
  const audio = new Audio(); audio.preload = 'auto';
  audio.oncanplay = () => {
    audio.oncanplay = null;
    if (!takipci) return;
    if (ses.state !== 'running') ses.resume();
    const g = ses.createGain(); ses.createMediaElementSource(audio).connect(g); g.connect(ses.destination);
    muzikSondur(oynatici, SARKI_GECIS);
    const t = ses.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + SARKI_GECIS);
    try { audio.currentTime = hedef; } catch {}
    audio.play().catch(() => {});
    oynatici = { audio, g, id: c.id, yol: c.yol, ad: c.ad, istek: -1, zamanlayici: null, takip: true };
  };
  audio.src = c.yol;
}   // ses motoru geç hazırlandıysa ya da bir mesaj kaçtıysa istek yine de başlasın
