// ═══════════════════════════════════════════
// EXPORT: SVG, PNG, EMBED
// Exposes window.Exporter
// ═══════════════════════════════════════════
(function (global) {
  'use strict';

  function cleanSvg(state, opts) {
    opts = opts || {};
    return global.Fretboard.buildSvgMarkup(state, {
      interactive: false,
      background: opts.background || '#ffffff',
      title: opts.title === undefined ? state.title : opts.title,
      watermark: opts.watermark || ''
    });
  }

  function safeName(state, ext) {
    const base = (state.title || 'chord-diagram').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'chord-diagram';
    return base + '.' + ext;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadSVG(state) {
    const svg = cleanSvg(state);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), safeName(state, 'svg'));
  }

  function rasterize(svg, scale) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const encoded = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      img.onload = () => {
        const w = Math.round((img.naturalWidth || 240) * scale);
        const h = Math.round((img.naturalHeight || 300) * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const c = canvas.getContext('2d');
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG encoding failed'));
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Could not load SVG for rasterizing'));
      img.src = encoded;
    });
  }

  function downloadPNG(state, scale) {
    return rasterize(cleanSvg(state), scale || 3)
      .then((blob) => downloadBlob(blob, safeName(state, 'png')));
  }

  function imageEmbed(state) {
    const svg = cleanSvg(state);
    const encoded = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    const alt = global.Fretboard.escapeXml(state.title || 'Guitar chord diagram');
    return '<img src="' + encoded + '" alt="' + alt + '" width="' +
      global.Fretboard.dimensions(state, { title: !!state.title }).width + '" />';
  }

  function svgEmbed(state) {
    return cleanSvg(state);
  }

  global.Exporter = { cleanSvg, downloadSVG, downloadPNG, imageEmbed, svgEmbed, rasterize };
})(window);