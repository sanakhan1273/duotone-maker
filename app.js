/* Duotone Press — two-ink image processor. No dependencies, no build step. */

(function () {
  'use strict';

  /* ============================================================
     CONFIG — add or edit ink pairs here and they appear as chips.
     `s` is the shadow ink, `h` the highlight ink.
     ============================================================ */

  const PRESETS = [
    { name: 'Club red',  s: '#000000', h: '#e8171f' },
    { name: 'Newsprint', s: '#101820', h: '#f2f0e6' },
    { name: 'Mint',      s: '#12002e', h: '#00e0a4' },
    { name: 'Safety',    s: '#1a0a00', h: '#ff8a00' },
    { name: 'Cyanotype', s: '#001c3d', h: '#a8d8f0' },
    { name: 'Risograph', s: '#2b1a45', h: '#ff5470' }
  ];

  // Longest edge the canvas will work at. Raise for print-res exports,
  // lower if sliders feel sluggish on big photos.
  const MAX_EDGE = 1800;

  const EXPORT_NAME = 'duotone.png';

  /* ============================================================ */

  const $ = id => document.getElementById(id);

  const drop = $('drop'), canvas = $('canvas'), file = $('file');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const ui = {
    shadow: $('shadow'), highlight: $('highlight'),
    contrast: $('contrast'), midpoint: $('midpoint'), invert: $('invert'),
    grain: $('grain'), dither: $('dither'), dotsize: $('dotsize')
  };

  let source = null;  // ImageData with luminance baked into the red channel
  let noise = null;   // fixed noise field, so sliders don't reshuffle the grain

  // 4x4 Bayer matrix, normalised to 0..1
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    .map(v => (v + 0.5) / 16);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ---------- loading ---------- */

  function loadFile(f) {
    if (!f || !f.type.startsWith('image/')) return;

    const url = URL.createObjectURL(f);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      source = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const d = source.data;
      noise = new Float32Array(canvas.width * canvas.height);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        d[i] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        noise[p] = Math.random() - 0.5;
      }

      drop.classList.add('hidden');
      canvas.classList.remove('hidden');
      $('download').disabled = false;
      $('reset').disabled = false;
      URL.revokeObjectURL(url);
      render();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("That file couldn't be read as an image.");
    };

    img.src = url;
  }

  /* ---------- the effect ---------- */

  function render() {
    if (!source) return;

    const w = canvas.width, h = canvas.height;
    const src = source.data;
    const out = ctx.createImageData(w, h);
    const dst = out.data;

    const [sr, sg, sb] = hexToRgb(ui.shadow.value);
    const [hr, hg, hb] = hexToRgb(ui.highlight.value);

    const k = +ui.contrast.value / 6;      // curve steepness
    const mid = +ui.midpoint.value / 100;
    const flip = ui.invert.checked;
    const grain = +ui.grain.value / 100;
    const useDither = ui.dither.checked;
    const dot = +ui.dotsize.value;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const i = p * 4;

        let lum = src[i] / 255;
        if (flip) lum = 1 - lum;
        if (grain) lum += noise[p] * grain;

        // steepen the response curve around the midpoint
        let t = (lum - mid) * k + 0.5;

        if (useDither) {
          const bx = ((x / dot) | 0) & 3;
          const by = ((y / dot) | 0) & 3;
          // only dither the genuinely mid-tone band, so flats stay clean
          const band = 1 - Math.min(1, Math.abs(t - 0.5) * 2);
          const hard = t > BAYER[by * 4 + bx] ? 1 : 0;
          t = t * (1 - band) + hard * band;
        }

        t = t < 0 ? 0 : t > 1 ? 1 : t;

        dst[i]     = sr + (hr - sr) * t;
        dst[i + 1] = sg + (hg - sg) * t;
        dst[i + 2] = sb + (hb - sb) * t;
        dst[i + 3] = 255;
      }
    }

    ctx.putImageData(out, 0, 0);
  }

  let frame = null;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = null; render(); });
  }

  /* ---------- wiring ---------- */

  const readouts = {
    contrast: v => v,
    midpoint: v => (v / 100).toFixed(2),
    grain: v => v,
    dotsize: v => v
  };

  Object.keys(ui).forEach(key => {
    ui[key].addEventListener('input', () => {
      if (readouts[key]) $(key + 'Out').textContent = readouts[key](+ui[key].value);
      schedule();
    });
  });

  // build the preset chips from PRESETS
  const presetBox = $('presets');
  PRESETS.forEach(p => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    const sw = document.createElement('i');
    sw.style.background = p.h;
    b.append(sw, document.createTextNode(p.name));
    b.addEventListener('click', () => {
      ui.shadow.value = p.s;
      ui.highlight.value = p.h;
      render();
    });
    presetBox.appendChild(b);
  });

  $('swap').addEventListener('click', () => {
    const a = ui.shadow.value;
    ui.shadow.value = ui.highlight.value;
    ui.highlight.value = a;
    render();
  });

  drop.addEventListener('click', () => file.click());
  drop.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); }
  });
  $('reset').addEventListener('click', () => file.click());
  file.addEventListener('change', e => {
    loadFile(e.target.files[0]);
    e.target.value = '';   // so picking the same file twice still fires
  });

  ['dragenter', 'dragover'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hot'); }));
  ['dragleave', 'drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hot'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

  // once a photo is loaded the drop zone is hidden, so accept drops page-wide
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
  });

  $('download').addEventListener('click', () => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = EXPORT_NAME;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  });
})();
