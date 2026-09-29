// ═══════════════════════════════════════════
// AUDIO PREVIEW (Web Audio)
// Exposes window.AudioEngine
// ═══════════════════════════════════════════
(function (global) {
  'use strict';

  let ctx = null;
  let master = null;
  let noteAudioOn = true;

  function getCtx() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    // iOS: declare playback so it sounds even in silent mode.
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) { /* no-op */ }
    return ctx;
  }

  function pluck(freq, when, dur, vol) {
    const c = getCtx();
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = Math.min(freq * 8, 6000);
    filt.Q.value = 0.5;

    const o1 = c.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;

    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const o2gain = c.createGain();
    o2gain.gain.value = 0.22;

    const env = c.createGain();
    o1.connect(filt);
    o2.connect(o2gain);
    o2gain.connect(filt);
    filt.connect(env);
    env.connect(master);

    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vol, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    o1.start(when);
    o2.start(when);
    o1.stop(when + dur + 0.05);
    o2.stop(when + dur + 0.05);
  }

  function freqFor(state, string, absFret) {
    const base = global.Theory.STRING_BASE_FREQ[state.tuning][string];
    return base * Math.pow(2, absFret / 12);
  }

  function playChord(state) {
    const c = getCtx();
    const t0 = c.currentTime + 0.03;
    let i = 0;
    for (let s = 0; s < 6; s++) {
      const st = state.strings[s];
      if (st.state === 'mute') continue;
      const abs = st.state === 'open' ? 0 : st.fret;
      pluck(freqFor(state, s, abs), t0 + i * 0.035, 1.6, 0.28);
      i++;
    }
  }

  function playNote(state, string, absFret) {
    if (!noteAudioOn) return;
    const c = getCtx();
    pluck(freqFor(state, string, absFret), c.currentTime + 0.01, 1.1, 0.25);
  }

  function setNoteAudio(on) { noteAudioOn = !!on; }
  function isNoteAudioOn() { return noteAudioOn; }

  global.AudioEngine = { playChord, playNote, setNoteAudio, isNoteAudioOn, getCtx };
})(window);