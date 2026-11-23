// ---------- Müzik: birinci olan ülkenin müziği ANINDA çalar ----------
// Dosyalar: public/muzik/<serit>/  (afghanistan, suriye, kurdistan, turkiye, azerbaycan)
// Ayar: public/muzik/ayar.json — her ülke için hangi şarkı, kaçıncı saniyeden başlasın, nerede başa sarsın:
//   "turkiye": { "dosya": "0-dombra.mp3", "bas": 49.48, "son": 90.07 }
//     dosya: klasördeki dosya adı (boşsa klasördeki ilk şarkı; adı "mars" ile başlayanlar atlanır)
//     bas  : başlangıç saniyesi. Ülke birinci olunca şarkı hep buradan (en hareketli yer) başlar.
//     son  : bu saniyeye gelince "bas"a kesintisiz geri sarar (döngü). Boşsa bas+60 sn.
// Bekleme olmasın diye her ülkenin bölümü açılışta belleğe yüklenir; lider değişince yeni şarkı hemen başlar.
// Klasöre dosya eklemek / ayarı değiştirmek yeterli; oyun 30 sn içinde kendisi görür.
let MUZIK_SEVIYE = 0.5;      // müzik sesi (0-1). Panelden "Müzik sesi" ile değişir
const MUZIK_GECIS = 0.15;    // şarkı değişirken çok kısa geçiş (sn) — çıt sesi olmasın diye, beklemesin diye kısa
const MUZIK_KONTROL = 50;    // lider kaç ms'de bir kontrol edilsin

let muzikListe = {}, muzikAyar = {}, calanSerit = null;
let oynatici = null;          // { kaynak, g }
const muzikTampon = {};       // id -> { anahtar, tampon } (döngü bölümü, belleğe çözülmüş)
const muzikYukleniyor = {};   // id -> anahtar

async function muzikListeYukle() {
  try { muzikListe = await (await fetch('/api/muzik', { cache: 'no-store' })).json(); } catch {}
  try { const r = await fetch('muzik/ayar.json', { cache: 'no-store' }); if (r.ok) muzikAyar = await r.json(); } catch {}
  for (const id of Object.keys(muzikListe)) muzikOnYukle(id);
}
muzikListeYukle(); setInterval(muzikListeYukle, 30000);

function parcaSec(id) {
  const l = muzikListe[id] || []; if (!l.length) return null;
  const a = muzikAyar[id] || {};
  let p = a.dosya && l.find(x => decodeURIComponent(x.yol.split('/').pop()) === a.dosya);
  if (!p) p = l.find(x => !x.mars) || l[0];
  return { yol: p.yol, bas: Number(a.bas) || 0, son: a.son ? Number(a.son) : null };
}

// Şarkıyı indirip sadece bas..son bölümünü belleğe al (tüm şarkıyı tutmayalım)
async function muzikOnYukle(id) {
  const p = parcaSec(id); if (!p) return;
  const anahtar = p.yol + '|' + p.bas + '|' + p.son;
  if ((muzikTampon[id] && muzikTampon[id].anahtar === anahtar) || muzikYukleniyor[id] === anahtar) return;
  sesHazirla(); if (!ses) return;
  muzikYukleniyor[id] = anahtar;
  try {
    const tam = await ses.decodeAudioData(await (await fetch(p.yol)).arrayBuffer());
    const sr = tam.sampleRate;
    const b0 = Math.min(Math.floor(p.bas * sr), tam.length - sr);
    const b1 = Math.min(tam.length, Math.floor((p.son || p.bas + 60) * sr));
    const n = Math.max(sr, b1 - b0);
    const kes = ses.createBuffer(tam.numberOfChannels, n, sr);
    for (let k = 0; k < tam.numberOfChannels; k++) kes.copyToChannel(tam.getChannelData(k).subarray(b0, b0 + n), k);
    // döngü noktasında çıt olmasın: bölümün son 20 ms'si ile ilk 20 ms'si yumuşak birleşsin
    const f = Math.floor(sr * 0.02);
    for (let k = 0; k < kes.numberOfChannels; k++) {
      const d = kes.getChannelData(k);
      for (let i = 0; i < f; i++) { const a = i / f; d[n - f + i] = d[n - f + i] * (1 - a) + d[i] * a; }
    }
    muzikTampon[id] = { anahtar, tampon: kes };
    if (calanSerit === id && !oynatici) muzikCal(id);
  } catch (e) { console.warn('müzik yüklenemedi', id, e); }
  if (muzikYukleniyor[id] === anahtar) delete muzikYukleniyor[id];
}

function muzikSondur(o) {
  if (!o || !ses) return;
  const t = ses.currentTime;
  o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0, t + MUZIK_GECIS);
  try { o.kaynak.stop(t + MUZIK_GECIS + 0.02); } catch {}
}
function muzikCal(id) {
  muzikSondur(oynatici); oynatici = null; calanSerit = id;
  const m = muzikTampon[id]; if (!m || !ses) { muzikOnYukle(id); return; }   // yüklenince kendisi başlar
  if (ses.state !== 'running') ses.resume();
  const kaynak = ses.createBufferSource(); kaynak.buffer = m.tampon; kaynak.loop = true;
  const g = ses.createGain(); kaynak.connect(g); g.connect(ses.destination);
  const t = ses.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUZIK_SEVIYE, t + MUZIK_GECIS);
  kaynak.start(t);
  oynatici = { kaynak, g };
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
  if (lider.id !== calanSerit || !oynatici) muzikCal(lider.id);                 // yeni birinci: hemen çal
}
setInterval(muzikKontrol, MUZIK_KONTROL);
