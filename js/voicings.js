// ═══════════════════════════════════════════
// CHORD VOICING LIBRARY + LOOKUP
// Voicings are [string6..string1]; -1 = muted, 0 = open.
// Exposes window.Voicings
// ═══════════════════════════════════════════
(function (global) {
  'use strict';

  const LIB = {};

  function add(name, shapes) {
    if (!LIB[name]) LIB[name] = [];
    LIB[name] = LIB[name].concat(shapes);
  }

  // ── Idiomatic open-position shapes (listed first) ──
  const OPEN = {
    C: [[-1, 3, 2, 0, 1, 0]],
    C7: [[-1, 3, 2, 3, 1, 0]],
    Cmaj7: [[-1, 3, 2, 0, 0, 0]],
    D: [[-1, -1, 0, 2, 3, 2]],
    D7: [[-1, -1, 0, 2, 1, 2]],
    Dmaj7: [[-1, -1, 0, 2, 2, 2]],
    Dm: [[-1, -1, 0, 2, 3, 1]],
    Dm7: [[-1, -1, 0, 2, 1, 1]],
    E: [[0, 2, 2, 1, 0, 0]],
    E7: [[0, 2, 0, 1, 0, 0]],
    Em: [[0, 2, 2, 0, 0, 0]],
    Em7: [[0, 2, 0, 0, 0, 0]],
    Emaj7: [[0, 2, 1, 1, 0, 0]],
    G: [[3, 2, 0, 0, 0, 3], [3, 2, 0, 0, 3, 3]],
    G7: [[3, 2, 0, 0, 0, 1]],
    Gmaj7: [[3, 2, 0, 0, 0, 2]],
    A: [[-1, 0, 2, 2, 2, 0]],
    A7: [[-1, 0, 2, 0, 2, 0]],
    Am: [[-1, 0, 2, 2, 1, 0]],
    Am7: [[-1, 0, 2, 0, 1, 0]],
    Amaj7: [[-1, 0, 2, 1, 2, 0]],
    B7: [[-1, 2, 1, 2, 0, 2]],
    Bb: [[-1, 1, 3, 3, 3, 1]],
    Bm: [[-1, 2, 4, 4, 3, 2]],
    Bm7: [[-1, 2, 0, 2, 0, 2], [-1, 2, 4, 2, 3, 2]],
    F: [[1, 3, 3, 2, 1, 1], [-1, -1, 3, 2, 1, 1]],
    Fmaj7: [[1, 3, 3, 2, 1, 0], [-1, -1, 3, 2, 1, 0]],
    Fm: [[1, 3, 3, 1, 1, 1]],
    Bm7b5: [[-1, 2, 3, 2, 3, -1]],
    Em7b5: [[0, 1, 0, 0, -1, 0]],
    Am7b5: [[-1, 0, 1, 0, 1, 3]],
    Dm7b5: [[-1, -1, 0, 1, 1, 1]],
    Cdim7: [[-1, 3, 4, 2, 4, -1]],
    Bdim7: [[-1, 2, 3, 1, 3, -1]],
    'C6': [[-1, 3, 2, 2, 1, 0]],
    'A6': [[-1, 0, 2, 2, 2, 2]],
    'Cadd9': [[-1, 3, 2, 0, 3, 0]],
    'Aadd9': [[-1, 0, 2, 4, 2, 0]],
    'Eadd9': [[0, 2, 2, 1, 0, 2]],
    'Csus2': [[-1, 3, 5, 5, 3, 3]],
    'Dsus2': [[-1, -1, 0, 2, 3, 0]],
    'Asus2': [[-1, 0, 2, 2, 0, 0]],
    'Esus2': [[0, 2, 4, 4, 0, 0]],
    'Csus4': [[-1, 3, 3, 0, 1, 1]],
    'Dsus4': [[-1, -1, 0, 2, 3, 3]],
    'Asus4': [[-1, 0, 2, 2, 3, 0]],
    'Esus4': [[0, 2, 2, 2, 0, 0]],
    'Caug': [[-1, 3, 2, 1, 1, 0]],
    'Eaug': [[0, 3, 2, 1, 1, 0]]
  };

  // ── Movable shapes (offsets from the root fret; null = muted) ──
  const E_SHAPES = {
    '': [0, 2, 2, 1, 0, 0],
    'm': [0, 2, 2, 0, 0, 0],
    '7': [0, 2, 0, 1, 0, 0],
    'm7': [0, 2, 0, 0, 0, 0],
    'maj7': [0, 2, 1, 1, 0, 0],
    'aug': [0, 3, 2, 1, 1, 0]
  };
  const A_SHAPES = {
    '': [null, 0, 2, 2, 2, 0],
    'm': [null, 0, 2, 2, 1, 0],
    '7': [null, 0, 2, 0, 2, 0],
    'm7': [null, 0, 2, 0, 1, 0],
    'maj7': [null, 0, 2, 1, 2, 0],
    'm7b5': [null, 0, 1, 0, 1, null],
    'dim7': [null, 0, 1, -1, 1, -1]
  };
  const E_POWER = [0, 2, 2, null, null, null];
  const A_POWER = [null, 0, 2, 2, null, null];

  const ROOTS = [
    { name: 'C', pc: 0 }, { name: 'C#', pc: 1 }, { name: 'D', pc: 2 },
    { name: 'Eb', pc: 3 }, { name: 'E', pc: 4 }, { name: 'F', pc: 5 },
    { name: 'F#', pc: 6 }, { name: 'G', pc: 7 }, { name: 'Ab', pc: 8 },
    { name: 'A', pc: 9 }, { name: 'Bb', pc: 10 }, { name: 'B', pc: 11 }
  ];

  function shift(shape, fret) {
    return shape.map((v) => (v === null ? -1 : v + fret));
  }

  // Open shapes first.
  Object.keys(OPEN).forEach((name) => add(name, OPEN[name]));

  // Generated barre shapes for every root.
  ROOTS.forEach((root) => {
    const eFret = (root.pc - 4 + 12) % 12; // root on 6th string
    const aFret = (root.pc - 9 + 12) % 12; // root on 5th string
    Object.keys(E_SHAPES).forEach((suffix) => {
      const shifted = shift(E_SHAPES[suffix], eFret);
      if (shifted.some((v) => v < -1)) return;
      add(root.name + suffix, [shifted]);
    });
    Object.keys(A_SHAPES).forEach((suffix) => {
      const shifted = shift(A_SHAPES[suffix], aFret);
      if (shifted.some((v) => v < -1)) return;
      add(root.name + suffix, [shifted]);
    });
    add(root.name + '5', [shift(E_POWER, eFret), shift(A_POWER, aFret)]);
  });

  // Enharmonic aliases.
  const ALIASES = [['C#', 'Db'], ['D#', 'Eb'], ['F#', 'Gb'], ['G#', 'Ab'], ['A#', 'Bb']];
  Object.keys(LIB).slice().forEach((key) => {
    ALIASES.forEach((pair) => {
      if (key.indexOf(pair[0]) === 0) {
        const alt = pair[1] + key.slice(pair[0].length);
        if (!LIB[alt]) LIB[alt] = LIB[key];
      }
      if (key.indexOf(pair[1]) === 0) {
        const alt = pair[0] + key.slice(pair[1].length);
        if (!LIB[alt]) LIB[alt] = LIB[key];
      }
    });
  });

  // ── Lookup ──
  function normalize(s) {
    s = String(s || '').trim();
    if (!s) return '';
    s = s.replace(/ø7/g, 'm7b5')
      .replace(/ø/gi, 'm7b5')
      .replace(/°7/g, 'dim7')
      .replace(/°/g, 'dim')
      .replace(/[△Δ^]/g, 'maj')
      .replace(/\+/g, 'aug')
      .replace(/minor/gi, 'm')
      .replace(/major/gi, 'maj')
      .replace(/min/gi, 'm')
      .replace(/dom/gi, '')
      .replace(/-/g, 'm')
      .replace(/\s+/g, '');
    if (/^[a-g]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
    return s;
  }

  // Build a normalized index once.
  const INDEX = Object.keys(LIB).map((key) => ({ key, norm: normalize(key) }));

  function lookupChords(query) {
    const q = normalize(query);
    if (!q) return [];
    const qHasAccidental = /[#b]/.test(q);
    const exact = [];
    const prefix = [];
    const seen = new Set();
    INDEX.forEach((entry) => {
      if (seen.has(entry.key)) return;
      if (entry.norm === q) { exact.push(entry.key); seen.add(entry.key); return; }
      if (entry.norm.indexOf(q) !== 0) return;
      // Don't let a bare root match a different root's accidental (e.g. "C" -> "C#").
      const next = entry.norm.charAt(q.length);
      if (!qHasAccidental && (next === '#' || next === 'b')) return;
      prefix.push(entry.key);
      seen.add(entry.key);
    });
    // Stable, shortest-first prefix ordering.
    prefix.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return exact.concat(prefix).slice(0, 12).map((name) => ({ name, voicings: LIB[name] }));
  }

  global.Voicings = { LIB, lookupChords, normalize };
})(window);
