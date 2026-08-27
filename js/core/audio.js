export function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {
    console.log('Audio not supported', e);
  }
  try {
    if (navigator.vibrate) navigator.vibrate(200);
  } catch(e) {}
}


export function speakPhase(texto) {
  if (!window.speechSynthesis) return;
  const pref = localStorage.getItem('vg_hiit_voice');
  if (pref === 'off') return;
  
  // Cancel previous speech to avoid queue buildup
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = 'es-ES'; // Spanish
  utterance.rate = 1.1; // Slightly faster
  window.speechSynthesis.speak(utterance);
}