// ---------- Tık sesi (profil resmi hayvana değdiği an) ----------
let ses = null, anaCikis = null, sesTampon = null, sesBas = 0, sesTepe = 0.02, sonTik = 0;
const sesIsle = () => typeof SES_ISLE !== 'undefined' && SES_ISLE;   // true: dosyayı kalınlaştır/EQ uygula, false: dosya olduğu gibi
const caliyor = [];   // şu an çalan dosya sesleri
function sesHazirla() {
  if (ses) return;
  try { ses = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  // ortak çıkış: sınırlayıcı (limiter) -> yüksek seste ve üst üste binince cızırtı/patlama olmasın
  anaCikis = ses.createDynamicsCompressor();
  anaCikis.threshold.value = -3; anaCikis.knee.value = 4; anaCikis.ratio.value = 12;
  anaCikis.attack.value = 0.001; anaCikis.release.value = 0.08;
  anaCikis.connect(ses.destination);
  fetch(SES_DOSYA).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && ses.decodeAudioData(b)).then(t => {
    if (!t) return;
    // baştaki sessizliği atla: vuruş anından çalsın
    const d = t.getChannelData(0); let tepe = 0;
    for (let i = 0; i < d.length; i++) tepe = Math.max(tepe, Math.abs(d[i]));
    let i0 = 0; while (i0 < d.length && Math.abs(d[i0]) < tepe * 0.05) i0++;
    sesBas = Math.max(0, i0 / t.sampleRate - 0.003);
    // vuruşun en güçlü anı, başlangıçtan ne kadar sonra (ses tam değme anına denk getirilir)
    let iTepe = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) === tepe) { iTepe = i; break; }
    sesTepe = Math.max(0, iTepe / t.sampleRate - sesBas);
    // sesi en yükseğe getir (dosya kısık geliyor)
    const kat = tepe > 0 ? 0.95 / tepe : 1;
    for (let c = 0; c < t.numberOfChannels; c++) { const k = t.getChannelData(c); for (let i = 0; i < k.length; i++) k[i] *= kat; }
    sesTampon = t;
  }).catch(() => {});
}
function dosyaCal(t, cikis) {
  // sınır dolduysa en eski sesi hızla sustur
  while (caliyor.length >= SES_EN_FAZLA) { const e = caliyor.shift(); e.g.gain.setTargetAtTime(0, t, 0.02); e.k.stop(t + 0.1); }
  const k = ses.createBufferSource(), g = ses.createGain();
  if (!sesIsle()) {
    // tasarlanmış ses: olduğu gibi çal (her vuruş çok hafif farklı olsun diye ±%2 oynama)
    k.buffer = sesTampon; k.playbackRate.value = 0.98 + Math.random() * 0.04;
    g.gain.setValueAtTime(1, t);
    g.gain.setValueAtTime(1, t + SES_KIRP - 0.012);
    g.gain.linearRampToValueAtTime(0, t + SES_KIRP);
    k.connect(g); g.connect(cikis);
    k.start(t, sesBas, SES_KIRP + 0.01);
    const e = { k, g }; caliyor.push(e);
    k.onended = () => { const i = caliyor.indexOf(e); if (i >= 0) caliyor.splice(i, 1); };
    return;
  }
  k.buffer = sesTampon; k.playbackRate.value = SES_KALINLIK * (0.98 + Math.random() * 0.04);
  // ton: altı güçlü (tok), ortası yumuşak, tizi törpülenmiş (kremsi, batmayan) -> "thock"
  const bas = ses.createBiquadFilter(); bas.type = 'lowshelf'; bas.frequency.value = 220; bas.gain.value = 8;
  const orta = ses.createBiquadFilter(); orta.type = 'peaking'; orta.frequency.value = 2500; orta.Q.value = 1; orta.gain.value = -3;
  const tiz = ses.createBiquadFilter(); tiz.type = 'highshelf'; tiz.frequency.value = 6000; tiz.gain.value = -6;
  g.gain.setValueAtTime(0.8, t);
  g.gain.setValueAtTime(0.8, t + SES_KIRP * 0.6);
  g.gain.linearRampToValueAtTime(0, t + SES_KIRP);   // sonu yumuşak sönsün, kesik "tık" olmasın
  k.connect(bas); bas.connect(orta); orta.connect(tiz); tiz.connect(g); g.connect(cikis);
  // gövde: tuşun dibe oturduğu derin "tok" (kısa, alçalan alçak ton) — dosyanın vuruş tepesine denk gelir
  const o = ses.createOscillator(), og = ses.createGain(), tv = t + 0.018;
  o.type = 'sine'; o.frequency.setValueAtTime(150, tv); o.frequency.exponentialRampToValueAtTime(70, tv + 0.06);
  og.gain.setValueAtTime(0.0001, tv); og.gain.exponentialRampToValueAtTime(0.45, tv + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, tv + 0.07);
  o.connect(og); og.connect(cikis); o.start(tv); o.stop(tv + 0.08);
  k.start(t, sesBas, SES_KIRP + 0.01);
  const e = { k, g }; caliyor.push(e);
  k.onended = () => { const i = caliyor.indexOf(e); if (i >= 0) caliyor.splice(i, 1); };
}
// Sentetik "tok" mekanik/optik klavye sesi: kısa yüksek tık + alçak gövde (thock)
function tik(sonraMs = 0) {
  if (SES_SEVIYE <= 0) return;
  sesHazirla(); if (!ses) return;
  if (ses.state === 'suspended') ses.resume();
  // ses, değme anına önceden zamanlanır (ekran takılsa bile tam vaktinde çalar);
  // vuruşun tepesi dosyada ~20 ms sonra geldiği ve hoparlör gecikmesi olduğu için biraz erken başlatılır
  const gecikme = (ses.outputLatency || ses.baseLatency || 0) + (sesTampon ? sesTepe : 0.02);
  const kayma = (typeof SES_KAYMA !== 'undefined' ? SES_KAYMA : 0) / 1000;   // panelden 'Ses senkronu' (OBS/yayın gecikmesini dengeler)
  const t = Math.max(ses.currentTime, ses.currentTime + sonraMs / 1000 - gecikme + kayma);
  if (Math.abs(t - sonTik) < 0.004) return;   // aynı anda iki kez tetiklenmesin
  sonTik = t;
  const cikis = ses.createGain(); cikis.gain.value = SES_SEVIYE; cikis.connect(anaCikis);
  if (sesTampon) { dosyaCal(t, cikis); return; }
  const oynama = 0.94 + Math.random() * 0.12;   // her tık hafif farklı, doğal olsun
  const gurultu = (sure) => { const b = ses.createBuffer(1, Math.ceil(ses.sampleRate * sure), ses.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ses.createBufferSource(); s.buffer = b; return s; };
  // 1) üstteki keskin tık (switch'in vurduğu an)
  const n1 = gurultu(0.02), f1 = ses.createBiquadFilter(), g1 = ses.createGain();
  f1.type = 'bandpass'; f1.frequency.value = 3200 * oynama; f1.Q.value = 1.4;
  g1.gain.setValueAtTime(0.0001, t); g1.gain.exponentialRampToValueAtTime(0.55, t + 0.001); g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  n1.connect(f1).connect(g1).connect(cikis); n1.start(t);
  // 2) tok gövde: tuşun dibe oturma sesi
  const o = ses.createOscillator(), g2 = ses.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(210 * oynama, t); o.frequency.exponentialRampToValueAtTime(95 * oynama, t + 0.06);
  g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.9, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
  o.connect(g2).connect(cikis); o.start(t); o.stop(t + 0.08);
  // 3) kasanın boğuk yankısı
  const n3 = gurultu(0.06), f3 = ses.createBiquadFilter(), g3 = ses.createGain();
  f3.type = 'lowpass'; f3.frequency.value = 900 * oynama; f3.Q.value = 0.8;
  g3.gain.setValueAtTime(0.0001, t); g3.gain.exponentialRampToValueAtTime(0.5, t + 0.002); g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  n3.connect(f3).connect(g3).connect(cikis); n3.start(t);
}
// iPhone: web sesi varsayılan olarak sessiz moda (yan tuş) takılır ve susar.
// "playback" seçilince sessiz modda da çalar — sayfa açılır açılmaz, dokunmaya gerek kalmadan ayarlanır.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
// Telefon/tablet: tarayıcı sesi kilitli tutarsa ilk dokunuşta açılır (yedek).
function sesKilidiAc() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  sesHazirla(); if (!ses) return;
  ses.resume();
  // iOS: kısa sessiz bir ses çalmak ses kanalını açar
  try { const b = ses.createBuffer(1, 1, 22050), s = ses.createBufferSource(); s.buffer = b; s.connect(ses.destination); s.start(0); } catch {}
}
for (const olay of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(olay, sesKilidiAc, { passive: true });
