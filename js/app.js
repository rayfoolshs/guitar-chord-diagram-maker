// ═══════════════════════════════════════════
// APP: state, wiring, interaction
// ═══════════════════════════════════════════
(function () {
  'use strict';

  const Theory = window.Theory;
  const Voicings = window.Voicings;
  const Fretboard = window.Fretboard;
  const AudioEngine = window.AudioEngine;
  const Exporter = window.Exporter;

  // ── State ──
  function initStrings() {
    return Array.from({ length: 6 }, () => ({ state: 'open', fret: 0, finger: 0 }));
  }

  const state = {
    tuning: 'standard',
    startFret: 1,
    numFrets: 5,
    title: '',
    strings: initStrings(),
    barres: []
  };

  let titleEdited = false;
  let hasInteracted = false;
  let drag = null;
  let popoverTarget = null;

  // ── DOM refs ──
  const wrap = document.getElementById('fretboardWrap');
  const host = document.getElementById('fretboardHost');
  const titleInput = document.getElementById('chordTitle');
  const popover = document.getElementById('dotPopover');
  const popoverFingers = document.getElementById('popoverFingers');
  const popoverRemove = document.getElementById('popoverRemove');
  const suggestionNames = document.getElementById('suggestionNames');
  const lookupInput = document.getElementById('lookupInput');
  const lookupResults = document.getElementById('lookupResults');
  const tuningSelect = document.getElementById('tuningSelect');
  const startFretSelect = document.getElementById('startFretSelect');
  const numFretsSelect = document.getElementById('numFretsSelect');
  const noteAudioBtn = document.getElementById('btnNoteAudio');

  // ── Derived notes ──
  function getSoundingNotes() {
    const notes = [];
    let bass = null;
    for (let s = 0; s < 6; s++) {
      const st = state.strings[s];
      if (st.state === 'mute') continue;
      const abs = st.state === 'open' ? 0 : st.fret;
      const pitch = (Theory.TUNINGS[state.tuning][s] + abs) % 12;
      notes.push(pitch);
      if (bass === null) bass = pitch;
    }
    return { noteSet: Array.from(new Set(notes)), bass: bass === null ? -1 : bass };
  }

  // ── Render ──
  function render() {
    hidePopover();
    host.innerHTML = Fretboard.buildSvgMarkup(state, { interactive: true });
    syncControls();
    renderSuggestions();
  }

  function syncControls() {
    if (tuningSelect.value !== state.tuning) tuningSelect.value = state.tuning;
    if (+startFretSelect.value !== state.startFret) startFretSelect.value = String(state.startFret);
    if (+numFretsSelect.value !== state.numFrets) numFretsSelect.value = String(state.numFrets);
  }

  function renderSuggestions() {
    const { noteSet, bass } = getSoundingNotes();
    if (noteSet.length === 0) {
      suggestionNames.innerHTML = '<span class="muted">—</span>';
      return;
    }
    const results = Theory.detectChords(noteSet, bass);
    if (!results.length) {
      suggestionNames.innerHTML = '<span class="muted">—</span>';
      return;
    }
    suggestionNames.innerHTML = results
      .map((r) => '<span class="chord-name" data-name="' + Fretboard.escapeXml(r.name) + '">' + Fretboard.escapeXml(r.name) + '</span>')
      .join('');
    if (!titleEdited && hasInteracted) {
      state.title = results[0].name;
      titleInput.value = results[0].name;
    }
  }

  // ── Editing operations ──
  function placeDot(string, absFret) {
    hasInteracted = true;
    state.barres = state.barres.filter((b) => !(b.fret === absFret && string >= b.from && string <= b.to));
    state.strings[string] = { state: 'fretted', fret: absFret, finger: state.strings[string].finger || 0 };
    AudioEngine.playNote(state, string, absFret);
  }

  function removeDot(string) {
    state.barres = state.barres.filter((b) => !(string >= b.from && string <= b.to));
    state.strings[string] = { state: 'open', fret: 0, finger: 0 };
  }

  function addBarre(fret, from, to) {
    hasInteracted = true;
    state.barres.push({ fret, from, to, finger: 1 });
    for (let s = from; s <= to; s++) {
      state.strings[s] = { state: 'fretted', fret, finger: 1 };
    }
    AudioEngine.playNote(state, from, fret);
  }

  function removeBarre(barre) {
    state.barres = state.barres.filter((b) => b !== barre);
    for (let s = barre.from; s <= barre.to; s++) {
      state.strings[s] = { state: 'open', fret: 0, finger: 0 };
    }
  }

  function cycleString(string) {
    hasInteracted = true;
    const st = state.strings[string];
    if (st.state === 'fretted') {
      state.barres = state.barres.filter((b) => !(string >= b.from && string <= b.to));
      state.strings[string] = { state: 'open', fret: 0, finger: 0 };
    } else if (st.state === 'open') {
      state.strings[string] = { state: 'mute', fret: 0, finger: 0 };
    } else {
      state.strings[string] = { state: 'open', fret: 0, finger: 0 };
    }
    render();
  }

  function clearAll() {
    hasInteracted = true;
    titleEdited = true;
    state.strings = initStrings();
    state.barres = [];
    state.title = '';
    titleInput.value = '';
    render();
  }

  function setFinger(string, absFret, finger) {
    state.strings[string].finger = finger;
    state.barres.forEach((b) => {
      if (b.fret === absFret && string >= b.from && string <= b.to) b.finger = finger;
    });
    render();
    showPopover(string, absFret);
  }

  // ── Pointer interaction ──
  function currentSvg() { return host.querySelector('svg'); }

  host.addEventListener('pointerdown', (e) => {
    const marker = e.target.closest && e.target.closest('[data-marker-string]');
    if (marker) {
      cycleString(parseInt(marker.getAttribute('data-marker-string'), 10));
      return;
    }
    const svg = currentSvg();
    if (!svg) return;
    const hit = Fretboard.hitTest(state, svg, e.clientX, e.clientY);
    if (!hit) return;

    hidePopover();

    const st = state.strings[hit.string];
    if (st.state === 'fretted' && st.fret === hit.absFret) {
      showPopover(hit.string, hit.absFret);
      return;
    }
    const barre = state.barres.find((b) => b.fret === hit.absFret && hit.string >= b.from && hit.string <= b.to);
    if (barre) {
      removeBarre(barre);
      render();
      return;
    }

    drag = { fret: hit.absFret, start: hit.string, current: hit.string };
    try { host.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });

  host.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const svg = currentSvg();
    if (!svg) return;
    const hit = Fretboard.hitTest(state, svg, e.clientX, e.clientY);
    if (hit && hit.absFret === drag.fret) drag.current = hit.string;
  });

  host.addEventListener('pointerup', () => {
    if (!drag) return;
    const from = Math.min(drag.start, drag.current);
    const to = Math.max(drag.start, drag.current);
    if (from === to) placeDot(drag.start, drag.fret);
    else addBarre(drag.fret, from, to);
    drag = null;
    render();
  });

  host.addEventListener('pointercancel', () => { drag = null; });

  // ── Popover ──
  function showPopover(string, absFret) {
    popoverTarget = { string, absFret };
    const st = state.strings[string];
    popoverFingers.innerHTML = [1, 2, 3, 4, 5]
      .map((f) => '<button class="popover-btn' + (st.finger === f ? ' active' : '') + '" data-finger="' + f + '">' +
        (f === 5 ? 'T' : f) + '</button>')
      .join('');
    popover.classList.add('visible');
    const svg = currentSvg();
    if (!svg) return;
    const pos = Fretboard.dotClientPos(state, svg, string, absFret);
    const wrapRect = wrap.getBoundingClientRect();
    popover.style.left = (pos.x - wrapRect.left) + 'px';
    popover.style.top = (pos.y - wrapRect.top + 18) + 'px';
  }

  function hidePopover() {
    popover.classList.remove('visible');
    popoverTarget = null;
  }

  popoverFingers.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-finger]');
    if (!btn || !popoverTarget) return;
    setFinger(popoverTarget.string, popoverTarget.absFret, parseInt(btn.getAttribute('data-finger'), 10));
  });

  popoverRemove.addEventListener('click', () => {
    if (!popoverTarget) return;
    const { string } = popoverTarget;
    hidePopover();
    removeDot(string);
    render();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!popover.classList.contains('visible')) return;
    if (popover.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#fretboardHost')) return;
    hidePopover();
  });

  // ── Suggestions ──
  suggestionNames.addEventListener('click', (e) => {
    const pill = e.target.closest('.chord-name');
    if (!pill) return;
    titleEdited = true;
    state.title = pill.getAttribute('data-name');
    titleInput.value = state.title;
  });

  // ── Title ──
  titleInput.addEventListener('input', () => {
    titleEdited = true;
    state.title = titleInput.value;
  });

  // ── Lookup ──
  function fretsLabel(frets) {
    return frets.map((f) => (f === -1 ? 'x' : f)).join(' ');
  }

  function closeLookup() {
    lookupResults.classList.remove('visible');
    lookupResults.innerHTML = '';
    lookupResults._results = null;
  }

  lookupInput.addEventListener('input', () => {
    const results = Voicings.lookupChords(lookupInput.value);
    if (!results.length) { closeLookup(); return; }
    lookupResults._results = results;
    lookupResults.innerHTML = results
      .map((r, i) => '<div class="lookup-item" data-idx="' + i + '">' +
        '<span class="lookup-item-name">' + Fretboard.escapeXml(r.name) + '</span>' +
        '<span class="lookup-item-frets">' + fretsLabel(r.voicings[0]) + '</span></div>')
      .join('');
    lookupResults.classList.add('visible');
  });

  lookupInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = lookupResults.querySelector('.lookup-item');
      if (first) first.click();
    } else if (e.key === 'Escape') {
      closeLookup();
    }
  });

  lookupResults.addEventListener('click', (e) => {
    const item = e.target.closest('.lookup-item');
    if (!item || !lookupResults._results) return;
    const r = lookupResults._results[parseInt(item.getAttribute('data-idx'), 10)];
    loadVoicing(r.voicings[0], r.name);
    lookupInput.value = r.name;
    closeLookup();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!lookupResults.classList.contains('visible')) return;
    if (e.target.closest && (e.target.closest('.lookup-input-wrap'))) return;
    closeLookup();
  });

  function loadVoicing(frets, name) {
    hasInteracted = true;
    state.barres = [];
    state.strings = initStrings();
    for (let s = 0; s < 6; s++) {
      const f = frets[s];
      if (f === -1) state.strings[s] = { state: 'mute', fret: 0, finger: 0 };
      else if (f === 0) state.strings[s] = { state: 'open', fret: 0, finger: 0 };
      else state.strings[s] = { state: 'fretted', fret: f, finger: 0 };
    }
    const fretted = frets.filter((f) => f > 0);
    const minF = fretted.length ? Math.min.apply(null, fretted) : 0;
    const maxF = fretted.length ? Math.max.apply(null, fretted) : 0;
    if (minF > 1) {
      state.startFret = minF;
      state.numFrets = Math.max(3, Math.min(7, maxF - minF + 1));
    } else {
      state.startFret = 1;
      state.numFrets = Math.max(5, Math.min(7, Math.max(maxF, 5)));
    }
    titleEdited = true;
    state.title = name;
    titleInput.value = name;
    render();
  }

  // ── Controls ──
  tuningSelect.addEventListener('change', () => { state.tuning = tuningSelect.value; render(); });
  startFretSelect.addEventListener('change', () => { state.startFret = parseInt(startFretSelect.value, 10); render(); });
  numFretsSelect.addEventListener('change', () => { state.numFrets = parseInt(numFretsSelect.value, 10); render(); });

  // ── Action buttons ──
  document.getElementById('btnPlay').addEventListener('click', () => AudioEngine.playChord(state));

  noteAudioBtn.addEventListener('click', () => {
    const next = !AudioEngine.isNoteAudioOn();
    AudioEngine.setNoteAudio(next);
    noteAudioBtn.textContent = 'Note Audio: ' + (next ? 'On' : 'Off');
    noteAudioBtn.classList.toggle('off', !next);
  });

  document.getElementById('btnExportPNG').addEventListener('click', () => {
    Exporter.downloadPNG(state).catch((err) => alert('PNG export failed: ' + err.message));
  });
  document.getElementById('btnExportSVG').addEventListener('click', () => Exporter.downloadSVG(state));
  document.getElementById('btnClear').addEventListener('click', clearAll);

  // ── Embed modal ──
  const embedOverlay = document.getElementById('embedOverlay');
  const embedCode = document.getElementById('embedCode');
  const embedPreview = document.getElementById('embedPreview');
  const embedCopyBtn = document.getElementById('embedCopyBtn');
  let embedType = 'img';

  function updateEmbed() {
    const code = embedType === 'svg' ? Exporter.svgEmbed(state) : Exporter.imageEmbed(state);
    embedCode.value = code;
    embedPreview.innerHTML = embedType === 'svg'
      ? Exporter.cleanSvg(state)
      : Exporter.imageEmbed(state);
  }

  function openEmbed() {
    embedType = 'img';
    document.querySelectorAll('.embed-tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-embed-type') === 'img'));
    updateEmbed();
    embedOverlay.classList.add('visible');
  }
  function closeEmbed() { embedOverlay.classList.remove('visible'); }

  document.getElementById('btnEmbed').addEventListener('click', openEmbed);
  document.getElementById('embedClose').addEventListener('click', closeEmbed);
  embedOverlay.addEventListener('click', (e) => { if (e.target === embedOverlay) closeEmbed(); });

  document.querySelectorAll('.embed-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      embedType = tab.getAttribute('data-embed-type');
      document.querySelectorAll('.embed-tab').forEach((t) => t.classList.toggle('active', t === tab));
      updateEmbed();
    });
  });

  embedCopyBtn.addEventListener('click', () => {
    embedCode.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(embedCode.value).catch(() => {});
      ok = true;
    }
    embedCopyBtn.classList.add('copied');
    embedCopyBtn.textContent = ok ? '✓ Copied' : 'Copy Code';
    setTimeout(() => {
      embedCopyBtn.classList.remove('copied');
      embedCopyBtn.textContent = '📋 Copy Code';
    }, 1400);
  });

  // ── Keyboard ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hidePopover();
      closeLookup();
      closeEmbed();
    }
  });

  // ── Init ──
  render();
})();