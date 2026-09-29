// ═══════════════════════════════════════════
// MUSIC THEORY ENGINE
// Note math, tunings, chord formulas, detection.
// Exposes window.Theory
// ═══════════════════════════════════════════
(function (global) {
  'use strict';

  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  // Roots that conventionally take sharps rather than flats.
  const SHARP_ROOTS = new Set([0, 1, 2, 4, 7, 9, 11]); // C C# D E G A B

  // Tuning definitions, string 6 (low) -> string 1 (high), as pitch classes.
  const TUNINGS = {
    standard: [4, 9, 2, 7, 11, 4],   // E A D G B E
    dropD: [2, 9, 2, 7, 11, 4],      // D A D G B E
    openG: [2, 7, 2, 7, 11, 2],      // D G D G B D
    openD: [2, 9, 2, 6, 9, 2],       // D A D F# A D
    openE: [4, 11, 4, 8, 11, 4],     // E B E G# B E
    dadgad: [2, 9, 2, 7, 9, 2],      // D A D G A D
    halfDown: [3, 8, 1, 6, 10, 3]    // Eb Ab Db Gb Bb Eb
  };

  const TUNING_LABELS = {
    standard: ['E', 'A', 'D', 'G', 'B', 'E'],
    dropD: ['D', 'A', 'D', 'G', 'B', 'E'],
    openG: ['D', 'G', 'D', 'G', 'B', 'D'],
    openD: ['D', 'A', 'D', 'F#', 'A', 'D'],
    openE: ['E', 'B', 'E', 'G#', 'B', 'E'],
    dadgad: ['D', 'A', 'D', 'G', 'A', 'D'],
    halfDown: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb']
  };

  // Open-string frequencies (Hz), string 6 -> string 1.
  const STRING_BASE_FREQ = {
    standard: [82.41, 110.0, 146.83, 196.0, 246.94, 329.63],
    dropD: [73.42, 110.0, 146.83, 196.0, 246.94, 329.63],
    openG: [73.42, 196.0, 146.83, 196.0, 246.94, 293.66],
    openD: [73.42, 110.0, 146.83, 185.0, 220.0, 293.66],
    openE: [82.41, 123.47, 164.81, 207.65, 246.94, 329.63],
    dadgad: [73.42, 110.0, 146.83, 196.0, 220.0, 293.66],
    halfDown: [77.78, 103.83, 138.59, 185.0, 233.08, 311.13]
  };

  // Chord formulas: required intervals MUST be present, optional MAY be present.
  // A match means all required present AND every sounding note is explained.
  // Intervals: 0=R 1=b9 2=9 3=m3/#9 4=M3 5=4/11 6=b5/#11 7=5 8=#5/b13 9=6/13 10=b7 11=M7
  const CHORD_FORMULAS = [
    { name: '5', required: [0, 7], optional: [] },

    { name: 'maj', required: [0, 4, 7], optional: [] },
    { name: 'm', required: [0, 3, 7], optional: [] },
    { name: 'dim', required: [0, 3, 6], optional: [] },
    { name: 'aug', required: [0, 4, 8], optional: [] },
    { name: 'sus2', required: [0, 2, 7], optional: [] },
    { name: 'sus4', required: [0, 5, 7], optional: [] },

    { name: '7', required: [0, 4, 10], optional: [7] },
    { name: 'maj7', required: [0, 4, 11], optional: [7] },
    { name: 'm7', required: [0, 3, 10], optional: [7] },
    { name: 'mMaj7', required: [0, 3, 11], optional: [7] },
    { name: 'dim7', required: [0, 3, 6, 9], optional: [] },
    { name: 'm7b5', required: [0, 3, 6, 10], optional: [] },
    { name: '7sus4', required: [0, 5, 10], optional: [7] },

    { name: '6', required: [0, 4, 7, 9], optional: [] },
    { name: 'm6', required: [0, 3, 7, 9], optional: [] },

    { name: 'add9', required: [0, 2, 4, 7], optional: [] },
    { name: 'madd9', required: [0, 2, 3, 7], optional: [] },

    { name: '9', required: [0, 2, 4, 10], optional: [7] },
    { name: 'maj9', required: [0, 2, 4, 11], optional: [7] },
    { name: 'm9', required: [0, 2, 3, 10], optional: [7] },

    { name: 'maj7#11', required: [0, 4, 6, 11], optional: [7] },
    { name: 'maj9#11', required: [0, 2, 4, 6, 11], optional: [7] },
    { name: '7#11', required: [0, 4, 6, 10], optional: [7] },
    { name: '9#11', required: [0, 2, 4, 6, 10], optional: [7] },

    { name: '11', required: [0, 5, 10], optional: [4, 7, 2] },
    { name: 'm11', required: [0, 3, 5, 10], optional: [7, 2] },
    { name: 'maj11', required: [0, 4, 5, 11], optional: [7, 2] },

    { name: '13', required: [0, 4, 10, 9], optional: [7, 2, 5] },
    { name: 'maj13', required: [0, 4, 11, 9], optional: [7, 2, 5] },
    { name: 'm13', required: [0, 3, 10, 9], optional: [7, 2, 5] },

    { name: '7#9', required: [0, 3, 4, 10], optional: [7] },
    { name: '7b9', required: [0, 1, 4, 10], optional: [7] },
    { name: '7b5', required: [0, 4, 6, 10], optional: [] },
    { name: '7#5', required: [0, 4, 8, 10], optional: [] },
    { name: '7b9b5', required: [0, 1, 4, 6, 10], optional: [] },
    { name: '7#9b5', required: [0, 3, 4, 6, 10], optional: [] },
    { name: '7b13', required: [0, 4, 8, 10], optional: [7] },
    { name: '9b5', required: [0, 2, 4, 6, 10], optional: [] },

    { name: '6/9', required: [0, 2, 4, 9], optional: [7] },
    { name: 'm6/9', required: [0, 2, 3, 9], optional: [7] }
  ];

  const SUS = new Set(['sus2', 'sus4', '7sus4']);

  function noteToSemitone(n) {
    const map = {
      C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5,
      'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11
    };
    return Object.prototype.hasOwnProperty.call(map, n) ? map[n] : -1;
  }

  function nameSetFor(root) {
    return SHARP_ROOTS.has(root) ? SHARP_NAMES : FLAT_NAMES;
  }

  // Detect candidate chord names from a set of pitch classes plus a bass pitch class.
  function detectChords(noteSet, bassNote) {
    if (!noteSet || noteSet.length === 0) return [];
    const numNotes = noteSet.length;
    const results = [];

    for (const root of noteSet) {
      const intervals = noteSet.map((n) => (n - root + 12) % 12).sort((a, b) => a - b);
      const intervalSet = new Set(intervals);
      const nameSet = nameSetFor(root);
      const rootName = nameSet[root];
      const isBassRoot = root === bassNote;
      const bassInt = (bassNote - root + 12) % 12;

      for (const formula of CHORD_FORMULAS) {
        if (!formula.required.every((i) => intervalSet.has(i))) continue;

        const explained = new Set([...formula.required, ...formula.optional]);
        if (intervals.some((i) => !explained.has(i))) continue;

        // Suspended chords must not contain a 3rd, and the bass must not be the 3rd.
        if (SUS.has(formula.name) && (intervalSet.has(3) || intervalSet.has(4) || bassInt === 3 || bassInt === 4)) continue;
        // Dominant 11 with a major 3rd clashes with the 11th.
        if (formula.name === '11' && intervalSet.has(4) && intervalSet.has(5)) continue;
        // Power chord only when exactly two notes sound.
        if (formula.name === '5' && numNotes !== 2) continue;

        let score = 0;
        const optionalUsed = numNotes - formula.required.length;
        const totalFormulaSize = formula.required.length + formula.optional.length;
        if (optionalUsed === 0 && numNotes === formula.required.length) score += 120;
        else if (numNotes === totalFormulaSize) score += 110;
        else score += 90;

        if (isBassRoot) score += 60;
        score -= CHORD_FORMULAS.indexOf(formula);
        if (formula.name === 'maj' || formula.name === 'm') score += 10;
        if (formula.name === '7' || formula.name === 'm7' || formula.name === 'maj7') score += 5;

        let displayName = rootName;
        if (formula.name !== 'maj') displayName += formula.name;

        let slashBass = '';
        if (!isBassRoot && bassNote >= 0 && noteSet.indexOf(bassNote) !== -1) {
          if (['5', 'sus2', 'sus4', '7sus4'].indexOf(formula.name) !== -1) continue;
          if (formula.name === '11' && !intervalSet.has(4)) continue;
          slashBass = '/' + nameSet[bassNote];
        }

        results.push({
          name: displayName + slashBass,
          root,
          formula: formula.name,
          score,
          isBassRoot,
          isSlash: slashBass !== ''
        });
      }
    }

    // Pass 2: slash chords whose bass is not a chord tone.
    if (bassNote >= 0 && numNotes >= 3) {
      const withoutBass = noteSet.filter((n) => n !== bassNote);
      if (withoutBass.length >= 2 && withoutBass.length < numNotes) {
        for (const root of withoutBass) {
          const intervals = withoutBass.map((n) => (n - root + 12) % 12).sort((a, b) => a - b);
          const intervalSet = new Set(intervals);
          const nameSet = nameSetFor(root);
          const rootName = nameSet[root];

          for (const formula of CHORD_FORMULAS) {
            if (!formula.required.every((i) => intervalSet.has(i))) continue;
            const explained = new Set([...formula.required, ...formula.optional]);
            if (intervals.some((i) => !explained.has(i))) continue;
            if (['5', 'sus2', 'sus4', '7sus4'].indexOf(formula.name) !== -1) continue;
            if (formula.name === '11' && !intervalSet.has(4)) continue;

            let score = 70 - CHORD_FORMULAS.indexOf(formula);
            if (formula.name === 'maj' || formula.name === 'm') score += 20;
            if (formula.name === '7' || formula.name === 'm7' || formula.name === 'maj7') score += 10;

            let displayName = rootName;
            if (formula.name !== 'maj') displayName += formula.name;
            displayName += '/' + nameSet[bassNote];

            results.push({ name: displayName, root, formula: formula.name, score, isBassRoot: false, isSlash: true });
          }
        }
      }
    }

    results.sort((a, b) => b.score - a.score);

    // Suppress slash versions of a formula that already matched on the bass root.
    const bassRootFormulas = new Set();
    results.forEach((r) => { if (r.isBassRoot) bassRootFormulas.add(r.formula); });

    const seen = new Set();
    const filtered = results.filter((r) => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      if (r.isSlash && bassRootFormulas.has(r.formula)) return false;
      return true;
    });

    return filtered.slice(0, 5);
  }

  global.Theory = {
    SHARP_NAMES,
    FLAT_NAMES,
    TUNINGS,
    TUNING_LABELS,
    STRING_BASE_FREQ,
    CHORD_FORMULAS,
    noteToSemitone,
    detectChords
  };
})(window);
