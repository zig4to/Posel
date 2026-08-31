/* Izriše ikone (SVG + PNG) iz iste risbe kot ostali projekti v PROJEKTI/ —
   brez zunanjih odvisnosti. Zagon: node tools/make-icons.js  (npm run icons)

   Hišni slog: zaobljen kvadrat z diagonalnim prelivom (14.7%,6.4% -> 85.3%,93.6%)
   + en bel Lucide-slog simbol. Za Posel: bela AKTOVKA na jeklenem prelivu. */
var zlib = require('zlib'), fs = require('fs'), path = require('path');

var ROOT = path.join(__dirname, '..');
var PUB_ICONS = path.join(ROOT, 'public', 'icons');
var SS = 4; // nadvzorčenje za mehke robove

var GRAD_START = [0x93, 0xa2, 0xc6]; // hladna slate-blue  #93a2c6
var GRAD_END = [0x28, 0x2c, 0x47];   // globok indigo-slate #282c47
var LINE = [0xff, 0xff, 0xff];

/* ------------------------------------------------------------ izvorni SVG
   Edini ročno vzdrževani vir oblike; PNG geometrija spodaj ga zrcali
   (24-mreža * 8 = 192-mreža). Minimalen tanek obris aktovke: telo + ročaj. */
var SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
  '  <defs>',
  '    <linearGradient id="g" x1="14.7%" y1="6.4%" x2="85.3%" y2="93.6%">',
  '      <stop offset="0%" stop-color="#93a2c6"/>',
  '      <stop offset="100%" stop-color="#282c47"/>',
  '    </linearGradient>',
  '  </defs>',
  '  <rect width="24" height="24" rx="7" fill="url(#g)"/>',
  '  <g fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
  '    <rect x="3.6" y="8.4" width="16.8" height="11.6" rx="3.4"/>',
  '    <path d="M9.4 8.4V7a2.4 2.4 0 0 1 2.4-2.4h0.4a2.4 2.4 0 0 1 2.4 2.4v1.4"/>',
  '  </g>',
  '</svg>',
  ''
].join('\n');

// --------------------------------------------------------------- geometrija
function insideRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  var cx = Math.min(Math.max(x, r), w - r);
  var cy = Math.min(Math.max(y, r), h - r);
  var dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/* Zaobljen pravokotnik na poljubnem mestu (rx,ry,rw,rh) z radijem r. */
function inRR(x, y, rx, ry, rw, rh, r) {
  return insideRoundRect(x - rx, y - ry, rw, rh, Math.max(0, Math.min(r, rw / 2, rh / 2)));
}

/* Obris zaobljenega pravokotnika debeline 2*halfW (sredinica = rx,ry,rw,rh,r). */
function inRRRing(x, y, rx, ry, rw, rh, r, halfW) {
  var out = inRR(x, y, rx - halfW, ry - halfW, rw + 2 * halfW, rh + 2 * halfW, r + halfW);
  var inn = inRR(x, y, rx + halfW, ry + halfW, rw - 2 * halfW, rh - 2 * halfW, r - halfW);
  return out && !inn;
}

/* Diagonalen preliv (ujema SVG linearGradient 14.7%,6.4% -> 85.3%,93.6%). */
function gradColor(x, y, n) {
  var gx1 = 0.147 * n, gy1 = 0.064 * n, gx2 = 0.853 * n, gy2 = 0.936 * n;
  var dx = gx2 - gx1, dy = gy2 - gy1, len2 = dx * dx + dy * dy;
  var t = len2 ? ((x - gx1) * dx + (y - gy1) * dy) / len2 : 0;
  t = Math.min(1, Math.max(0, t));
  return [
    Math.round(GRAD_START[0] + (GRAD_END[0] - GRAD_START[0]) * t),
    Math.round(GRAD_START[1] + (GRAD_END[1] - GRAD_START[1]) * t),
    Math.round(GRAD_START[2] + (GRAD_END[2] - GRAD_START[2]) * t)
  ];
}

// ------------------------------------------------------------------ risanje
function Bitmap(size) { this.size = size; this.px = new Uint8Array(size * size * 4); }

Bitmap.prototype.fill = function (test, color) {
  var n = this.size, p = this.px;
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    if (test(x + 0.5, y + 0.5)) {
      var o = (y * n + x) * 4;
      p[o] = color[0]; p[o + 1] = color[1]; p[o + 2] = color[2]; p[o + 3] = 255;
    }
  }
};

Bitmap.prototype.fillFn = function (test, colorFn) {
  var n = this.size, p = this.px;
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    if (test(x + 0.5, y + 0.5)) {
      var c = colorFn(x + 0.5, y + 0.5), o = (y * n + x) * 4;
      p[o] = c[0]; p[o + 1] = c[1]; p[o + 2] = c[2]; p[o + 3] = 255;
    }
  }
};

function downsample(big, size) {
  var out = new Uint8Array(size * size * 4), n = big.size, f = n / size, area = f * f;
  for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
    var r = 0, g = 0, b = 0, a = 0;
    for (var sy = 0; sy < f; sy++) for (var sx = 0; sx < f; sx++) {
      var o = ((y * f + sy) * n + (x * f + sx)) * 4;
      if (big.px[o + 3]) { r += big.px[o]; g += big.px[o + 1]; b += big.px[o + 2]; a += 255; }
    }
    var d = (y * size + x) * 4;
    if (a) {
      out[d] = Math.round(r / (a / 255)); out[d + 1] = Math.round(g / (a / 255));
      out[d + 2] = Math.round(b / (a / 255)); out[d + 3] = Math.round(a / area);
    }
  }
  return out;
}

/* Aktovka v koordinatah 0..192 (= icon.svg * 8). Minimalen tanek obris:
   telo   rect  x28.8..163.2  y67.2..160  r27.2   (sredinica pravokotnika)
   ročaj  zaobljen U          x75.2..116.8  vrh y36.8   (obris, odrezan pod y67.2) */
var ART = { cx: 96, cy: 98 };
var SWH = 6.0;   // pol-debelina črte (1.5 * 8 / 2)

function drawGlyph(bmp, X, Y, S) {
  var hw = SWH * S;

  // telo — obris zaobljenega pravokotnika
  bmp.fill(function (x, y) {
    return inRRRing(x, y, X(28.8), Y(67.2), 134.4 * S, 92.8 * S, 27.2 * S, hw);
  }, LINE);

  // ročaj — obris zaobljenega U, odrezan tik pod vrhom telesa
  bmp.fill(function (x, y) {
    return y < Y(67.2) + hw &&
      inRRRing(x, y, X(75.2), Y(36.8), 41.6 * S, 80 * S, 19.2 * S, hw);
  }, LINE);
}

function drawIcon(size, maskable) {
  var n = size * SS, bmp = new Bitmap(n), unit = n / 192;
  var scale = maskable ? 0.72 : 1;
  var ox = maskable ? ART.cx : 96, oy = maskable ? ART.cy : 96;
  function X(u) { return ((u - ox) * scale + 96) * unit; }
  function Y(v) { return ((v - oy) * scale + 96) * unit; }
  var S = scale * unit;

  var bgTest = maskable
    ? function () { return true; }
    : function (x, y) { return insideRoundRect(x, y, n, n, 40 * unit); };
  bmp.fillFn(bgTest, function (x, y) { return gradColor(x, y, n); });

  drawGlyph(bmp, X, Y, S);
  return downsample(bmp, size);
}

// ----------------------------------------------------------------- zapis PNG
var CRC = (function () {
  var t = new Int32Array(256);
  for (var i = 0; i < 256; i++) {
    var c = i;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  var c = -1;
  for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  var head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  var crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.slice(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(size, rgba) {
  var stride = size * 4;
  var raw = Buffer.alloc((stride + 1) * size);
  for (var y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --------------------------------------------------------------------- zagon
if (!fs.existsSync(PUB_ICONS)) fs.mkdirSync(PUB_ICONS, { recursive: true });

fs.writeFileSync(path.join(PUB_ICONS, 'icon.svg'), SVG);
console.log('  public/icons/icon.svg');

[
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true }
].forEach(function (spec) {
  var buf = encodePng(spec.size, drawIcon(spec.size, spec.maskable));
  fs.writeFileSync(path.join(PUB_ICONS, spec.file), buf);
  console.log('  public/icons/' + spec.file + '  (' + spec.size + 'x' + spec.size + ', ' + Math.round(buf.length / 1024) + ' kB)');
});
