// ═══════════════════════════════════════════
// FRETBOARD RENDERING + HIT TESTING
// Exposes window.Fretboard
// ═══════════════════════════════════════════
(function (global) {
  'use strict';

  const GEO = {
    stringSpacing: 34,
    fretSpacing: 42,
    leftPad: 38,
    rightPad: 38,
    topPad: 40,
    bottomPad: 30,
    dotRadius: 10,
    barreHeight: 20,
    titlePad: 34
  };

  const FRET_MARKERS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1, 24: 2 };

  function xFor(s) { return GEO.leftPad + s * GEO.stringSpacing; }
  function yLine(f) { return GEO.topPad + f * GEO.fretSpacing; }
  function yCenter(rel) { return GEO.topPad + (rel - 0.5) * GEO.fretSpacing; }

  function relFret(state, abs) {
    return state.startFret === 1 ? abs : abs - state.startFret + 1;
  }

  function boardWidth(state) {
    return GEO.leftPad + 5 * GEO.stringSpacing + GEO.rightPad;
  }
  function boardHeight(state) {
    return GEO.topPad + state.numFrets * GEO.fretSpacing + GEO.bottomPad;
  }

  function dimensions(state, opts) {
    opts = opts || {};
    const pad = opts.title ? GEO.titlePad : 0;
    return { width: boardWidth(state), height: boardHeight(state) + pad };
  }

  function escapeXml(str) {
    return String(str == null ? '' : str).replace(/[<>&'"]/g, (c) => (
      { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
    ));
  }

  function coveredByBarre(state, string, fret) {
    return state.barres.some((b) => b.fret === fret && string >= b.from && string <= b.to);
  }

  function tuningLabels(state) {
    const labels = (global.Theory && global.Theory.TUNING_LABELS[state.tuning]) || ['E', 'A', 'D', 'G', 'B', 'E'];
    return labels;
  }

  // Build a standalone SVG string from state.
  // opts: { interactive, title, background, watermark }
  function buildSvgMarkup(state, opts) {
    opts = opts || {};
    const interactive = !!opts.interactive;
    const W = boardWidth(state);
    const H = boardHeight(state);
    const pad = opts.title ? GEO.titlePad : 0;
    const totalH = H + pad;
    const parts = [];

    parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + totalH +
      '" width="' + W + '" height="' + totalH + '" class="fretboard-svg" ' +
      (interactive ? 'style="max-width:100%;height:auto;touch-action:none;"' : '') + '>');

    if (opts.background) {
      parts.push('<rect x="0" y="0" width="' + W + '" height="' + totalH + '" fill="' + opts.background + '"/>');
    }

    parts.push('<g transform="translate(0,' + pad + ')">');

    if (opts.title) {
      parts.push('<text x="' + (W / 2) + '" y="-12" text-anchor="middle" ' +
        'font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#333333">' +
        escapeXml(opts.title) + '</text>');
    }

    // ── Fret marker dots ──
    const first = state.startFret;
    const last = state.startFret + state.numFrets - 1;
    const markerX = xFor(2) + GEO.stringSpacing / 2;
    for (let abs = first; abs <= last; abs++) {
      const count = FRET_MARKERS[abs];
      if (!count) continue;
      const cy = yCenter(relFret(state, abs));
      const xs = count === 2 ? [markerX - 5, markerX + 5] : [markerX];
      xs.forEach((cx) => {
        parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#dddddd"/>');
      });
    }

    // ── Fret lines ──
    for (let f = 0; f <= state.numFrets; f++) {
      const isNut = (f === 0 && state.startFret === 1);
      parts.push('<line x1="' + xFor(0) + '" y1="' + yLine(f) + '" x2="' + xFor(5) + '" y2="' + yLine(f) +
        '" stroke="' + (isNut ? '#222222' : '#555555') + '" stroke-width="' + (isNut ? 6 : 1.5) + '"/>');
    }

    // ── Strings (thicker on the low side) ──
    for (let s = 0; s < 6; s++) {
      const w = 2.6 - s * 0.3;
      parts.push('<line x1="' + xFor(s) + '" y1="' + yLine(0) + '" x2="' + xFor(s) + '" y2="' + yLine(state.numFrets) +
        '" stroke="#777777" stroke-width="' + w.toFixed(2) + '"/>');
    }

    // ── Starting-fret number ──
    if (state.startFret > 1) {
      parts.push('<text x="' + (xFor(0) - 15) + '" y="' + (yCenter(1) + 4) + '" text-anchor="end" ' +
        'font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#555555">' + state.startFret + '</text>');
    }

    // ── Open / muted markers ──
    const labels = tuningLabels(state);
    for (let s = 0; s < 6; s++) {
      const st = state.strings[s];
      const cx = xFor(s);
      const cy = GEO.topPad - 16;
      if (interactive) {
        parts.push('<rect data-marker-string="' + s + '" x="' + (cx - 13) + '" y="' + (cy - 14) +
          '" width="26" height="28" fill="transparent" style="cursor:pointer"/>');
      }
      if (st.state === 'open' || st.state === 'mute') {
        const isMute = st.state === 'mute';
        parts.push('<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" ' +
          'font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" ' +
          'fill="' + (isMute ? '#cc3333' : '#555555') + '">' + (isMute ? 'X' : 'O') + '</text>');
      }
    }

    // ── String note labels ──
    const labelY = yLine(state.numFrets) + 20;
    for (let s = 0; s < 6; s++) {
      parts.push('<text x="' + xFor(s) + '" y="' + labelY + '" text-anchor="middle" ' +
        'font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#888888">' + escapeXml(labels[s]) + '</text>');
    }

    // ── Barres ──
    state.barres.forEach((b) => {
      const rel = relFret(state, b.fret);
      if (rel < 1 || rel > state.numFrets) return;
      const x1 = xFor(b.from) - GEO.dotRadius;
      const x2 = xFor(b.to) + GEO.dotRadius;
      parts.push('<rect x="' + x1 + '" y="' + (yCenter(rel) - GEO.barreHeight / 2) + '" width="' + (x2 - x1) +
        '" height="' + GEO.barreHeight + '" rx="' + (GEO.barreHeight / 2) + '" fill="#333333"/>');
      if (b.finger) {
        parts.push('<text x="' + ((x1 + x2) / 2) + '" y="' + yCenter(rel) + '" text-anchor="middle" ' +
          'dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="13" ' +
          'font-weight="bold" fill="#ffffff">' + b.finger + '</text>');
      }
    });

    // ── Dots ──
    for (let s = 0; s < 6; s++) {
      const st = state.strings[s];
      if (st.state !== 'fretted') continue;
      const rel = relFret(state, st.fret);
      if (rel < 1 || rel > state.numFrets) continue;
      if (coveredByBarre(state, s, st.fret)) continue;
      const cx = xFor(s);
      const cy = yCenter(rel);
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + GEO.dotRadius + '" fill="#333333"/>');
      if (st.finger) {
        parts.push('<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" ' +
          'font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">' +
          st.finger + '</text>');
      }
    }

    // ── Watermark ──
    if (opts.watermark) {
      parts.push('<text x="' + (W / 2) + '" y="' + (H - GEO.bottomPad - 6) + '" text-anchor="middle" ' +
        'font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#c9c9c9">' +
        escapeXml(opts.watermark) + '</text>');
    }

    parts.push('</g></svg>');
    return parts.join('');
  }

  function clientToSvg(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }

  // Map a screen point to a {string, absFret, relFret} cell, or null.
  function hitTest(state, svg, clientX, clientY) {
    const p = clientToSvg(svg, clientX, clientY);
    if (!p) return null;
    // Reject clicks that fall outside the board (small vertical margin allowed).
    if (p.y < GEO.topPad - 6 || p.y > yLine(state.numFrets) + 6) return null;
    const string = Math.round((p.x - GEO.leftPad) / GEO.stringSpacing);
    if (string < 0 || string > 5) return null;
    const relRaw = Math.floor((p.y - GEO.topPad) / GEO.fretSpacing) + 1;
    const rel = Math.max(1, Math.min(state.numFrets, relRaw));
    const absFret = state.startFret === 1 ? rel : state.startFret + rel - 1;
    return { string, absFret, relFret: rel };
  }

  // Client-space position of a dot (for popover placement).
  function dotClientPos(state, svg, string, absFret) {
    const rel = relFret(state, absFret);
    const pt = svg.createSVGPoint();
    pt.x = xFor(string);
    pt.y = yCenter(rel);
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const screen = pt.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
  }

  global.Fretboard = {
    GEO,
    buildSvgMarkup,
    dimensions,
    hitTest,
    dotClientPos,
    relFret,
    xFor,
    yCenter,
    escapeXml
  };
})(window);
