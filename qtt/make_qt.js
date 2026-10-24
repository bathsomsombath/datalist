#!/usr/bin/env node
// Lao Quick Lane QT (Autoline-style quotation) from a JSON spec. Port of the QT Generator web app layout.
// Usage: node qtt/make_qt.js spec.json [outDir]
//
// spec.json (all optional except model or lines):
//   { "model":"Ford RANGER T6 / EVEREST 2.0-2.2L", "wip":"27185", "date":"2026-10-24", "acct":"C0006", "terms":"MN",
//     "reg":"1633", "regdate":"30/06/2022", "vin":"", "mile":"", "yr":"", "job":"", "sa":"Sombath Bounmany",
//     "cname":"Beerlao LBC", "ca1":"", "ca2":"", "ca3":"", "contact":"", "phone":"020 5555 1234",
//     "lh":1, "lr":20, "ld":25, "rate":22750,
//     "lines":[ ["CODE","DESCRIPTION",qty,unitUSD], ... ]   // overrides the menu parts
//   }
// Needs Chromium via Playwright. Optional logos: qtt/assets/logo.png and qtt/assets/wordmark.png.
// Lao oil/filter/labour label images from the web app are not included.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node qtt/make_qt.js spec.json [outDir]'); process.exit(2); }
const outDir = process.argv[3] || path.join(__dirname, 'out');
const S = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const MENU = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));

const get = (k, d = '') => (S[k] == null ? d : S[k]);
const today = new Date().toISOString().slice(0, 10);
const rows = S.lines || MENU[S.model] || [];
if (!rows.length) { console.error('Unknown model and no "lines" given. Models: ' + Object.keys(MENU).join(' | ')); process.exit(2); }
const lines = rows.map(r => ({ code: String(r[0]), desc: String(r[1]), qty: +r[2] || 0, unit: +r[3] || 0 }));

const lh = +get('lh', 1), lr = +get('lr', 20), ld = +get('ld', 25), rate = +get('rate', 22646);
const parts = lines.reduce((a, r) => a + r.qty * r.unit, 0);
const lab = lh * lr * (1 - ld / 100);
const net = parts + lab, vat = net * 0.1, tot = net + vat;
const f = { parts: +parts.toFixed(2), lab: +lab.toFixed(2), net: +net.toFixed(2), vat: +vat.toFixed(2), tot: +tot.toFixed(2), rate };
const cm = v => Math.trunc(v).toLocaleString('en-US');

const L = 28, R = 567, CN = R - 4, SEP = [L + 320, L + 362, L + 415, L + 448, L + 487];
const o = [];
const T = (s, x, y, fs, fam, bold, al) => o.push({ k: 't', s: String(s == null ? '' : s), x, y, fs, fam: fam || 'h', bold: !!bold, al: al || 'l' });
const RECT = (x, y, w, h, fill) => o.push({ k: 'r', x, y, w, h, fill: fill || null });
const LN = (x1, y1, x2, y2, lw) => o.push({ k: 'l', x1, y1, x2, y2, lw: lw || 0.8 });
const IMG = (file, x, y, w, h) => { const p = path.join(__dirname, 'assets', file); if (fs.existsSync(p)) o.push({ k: 'i', src: 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'), x, y, w, h }); return fs.existsSync(p); };

// Lao label images (optional files in qtt/assets): lao_oil.png, lao_filter.png, lao_labour.png
const laoKey = r => { const t = (r.code + ' ' + r.desc).toUpperCase(); if (/FILTER|ELEMENT|FLTR/.test(t)) return 'filter'; if (/OIL|MOTORCRAFT|CASTROL|SYN|5W|10W|15W|20W/.test(t)) return 'oil'; return null; };
const LAOI = (key, x, y, hh) => {
  const p = path.join(__dirname, 'assets', 'lao_' + key + '.png'); if (!key || !fs.existsSync(p)) return;
  const b = fs.readFileSync(p), w0 = b.readUInt32BE(16), h0 = b.readUInt32BE(20);
  o.push({ k: 'i', src: 'data:image/png;base64,' + b.toString('base64'), x, y: y - hh, w: hh * w0 / h0, h: hh });
};

// header
RECT(L, 30, R - L, 72);
const hasLogo = IMG('logo.png', L + 6, 44, 127, 37);
const hasWord = false;
if (hasLogo) T('Lao Quick Lane', L + 146, 66, 9.5, 'c', true); else T('QUICK LANE', L + 12, 78, 20, 'h', true);
['Unit 3, Saphanthong Neua Village,', 'Sisattanak District,', 'Vientiane Capital, Lao P.D.R', 'Tel: (+856) 21 263 999, 20 22 239 757']
  .forEach((t, i) => T(t, L + 350, 46 + i * 9.5, 7.2, 'c'));
T('For Customer', R, 114, 7.2, 'h', 0, 'r');
RECT(L + 300, 122, R - L - 300, 30); LN(L + 430, 122, L + 430, 152, 1.1);
T('QUOTATION', L + 312, 142, 10.5, 'c');
T(get('wip'), (L + 430 + R) / 2, 142, 12, 'c', 1, 'c');

T('Invoice Name & Address:', L, 168, 7.6, 'h', 1);
T('Customer Name & Address:', L + 175, 168, 7.6, 'h', 1);
[get('cname'), get('ca1'), get('ca2'), get('ca3')].forEach((t, i) => {
  T(t, L + 2, 180 + i * 10, 7.4, 'c'); T(t, L + 177, 180 + i * 10, 7.4, 'c');
  LN(L, 183 + i * 10, L + 165, 183 + i * 10, 0.4); LN(L + 175, 183 + i * 10, L + 300, 183 + i * 10, 0.4);
});
const date = get('date', today);
const dt = date ? date.split('-').reverse().join('/') : '';
[['Wip No:', get('wip')], ['Date:', dt], ['Account:', get('acct', 'C0006') + '   USD'], ['Order no:', ''], ['Terms:', get('terms', 'MN')], ['Due Date:', '']]
  .forEach(([k, v], i) => { T(k, L + 398, 168 + i * 10, 7.4, 'c', 0, 'r'); T(v, L + 406, 168 + i * 10, 7.4, 'c'); LN(L + 404, 170 + i * 10, R, 170 + i * 10, 0.4); });

const band = (top, cols, vals) => {
  RECT(L, top, R - L, 28);
  cols.forEach(([x, t]) => T(t, x, top + 9, 7.6, 'h', 1));
  LN(L, top + 12, R, top + 12, 0.4);
  (vals || []).forEach(([x, t]) => T(t, x, top + 22, 7.4, 'c'));
};
band(236, [[L + 4, 'Job No.'], [L + 78, 'Time'], [L + 150, 'Stock No.'], [L + 250, 'Tag No.'], [L + 330, 'Repair Date'], [L + 445, 'Service Advisor']],
  [[L + 6, get('job')], [L + 332, dt], [L + 447, String(get('sa', 'Sombath Bounmany')).slice(0, 20)]]);
band(269, [[L + 4, 'Reg.Date'], [L + 78, 'Reg No.'], [L + 150, 'Make & Model'], [L + 330, 'Vin No.'], [L + 445, 'Engine No.']],
  [[L + 6, get('regdate')], [L + 80, get('reg')], [L + 152, String(get('model')).slice(0, 33)], [L + 332, get('vin')]]);
band(302, [[L + 4, 'Mileage'], [L + 78, 'Year'], [L + 150, 'Driver'], [L + 330, 'Contact Name:'], [L + 445, 'Phone Number']],
  [[L + 6, get('mile')], [L + 80, get('yr')], [L + 332, get('contact')], [L + 447, get('phone')]]);

// items
const top = 335, bot = 584, HH = 14;
RECT(L, top, R - L, HH, '#e6e6e6');
T('Description of Goods / Services', L + 165, top + 10, 7.4, 'h', 1, 'c');
T('Qty.', L + 328, top + 10, 7.4, 'h', 1); T('Unit Price', L + 366, top + 10, 7.4, 'h', 1);
T('Unit', L + 420, top + 10, 7.4, 'h', 1); T('Disc%', L + 452, top + 10, 7.4, 'h', 1); T('Net Total', CN, top + 10, 7.4, 'h', 1, 'r');
let y = top + 26;
T('L', L + 2, y, 7.3, 'c'); T('1', L + 12, y, 7.3, 'c'); T('SER', L + 24, y, 7.3, 'c');
T('REPLACE ENGINE OIL AND OIL FILTER', L + 24, y + 9, 7.3, 'c');
LAOI('labour', L + 215, y + 9, 6.6);
T(lh.toFixed(2), L + 358, y, 7.3, 'c', 0, 'r'); T('HOUR', L + 420, y, 7.3, 'c');
if (ld) T(ld.toFixed(2), L + 483, y, 7.3, 'c', 0, 'r');
T(f.lab.toFixed(2), CN, y, 7.3, 'c', 0, 'r');
y += 20;
lines.forEach((r, i) => {
  T('P', L + 2, y, 7.3, 'c'); T(i + 1, L + 12, y, 7.3, 'c');
  T(r.code.slice(0, 18), L + 24, y, 7.3, 'c'); T(r.desc.slice(0, 20), L + 150, y, 7.3, 'c');
  LAOI(laoKey(r), L + 248, y, 6.4);
  T(r.qty, L + 352, y, 7.3, 'c', 0, 'r'); T(r.unit.toFixed(2), L + 411, y, 7.3, 'c', 0, 'r');
  T('EACH', L + 420, y, 7.3, 'c'); T((r.qty * r.unit).toFixed(2), CN, y, 7.3, 'c', 0, 'r');
  y += 10;
});
RECT(L, top, R - L, bot - top); LN(L, top + HH, R, top + HH, 0.9);
SEP.forEach(x => LN(x, top + HH, x, bot, 0.9));

// totals
const ty = bot + 14;
[['Parts', f.parts], ['Surcharge', 0], ['Labour', f.lab], ['Sublet', 0], ['Menus', 0]]
  .forEach(([k, v], i) => { T(k, L + 330, ty + i * 10, 7.6, 'c', 0, 'r'); T(Number(v).toFixed(2), L + 400, ty + i * 10, 7.6, 'c', 0, 'r'); });
[['Net', f.net], ['V.A.T.', f.vat], ['Total', f.tot], ['Paid', 0], ['Owing', f.tot]]
  .forEach(([k, v], i) => { T(k, L + 470, ty + i * 10, 7.6, 'c', 0, 'r'); T(Number(v).toFixed(2), CN, ty + i * 10, 7.6, 'c', 0, 'r'); });
const ky = ty + 62;
T('Rate ' + rate.toLocaleString('en-US'), L + 440, ky - 11, 8, 'c', 1, 'r');
[['Net', f.net], ['V.A.T.', f.vat], ['Total', f.tot]].forEach(([k, v], i) => {
  T(k, L + 440, ky + i * 10, 8, 'c', 1, 'r'); T(cm(v * rate), CN - 24, ky + i * 10, 8, 'c', 1, 'r'); T('KIP', CN - 22, ky + i * 10, 8, 'c', 1);
});
['Company name: LFC CO.,LTD', 'Bank Name: Lao Development Bank', 'Bank Account (USD): 0302.0010.1000.1904', 'Bank Account (THB): 0302.0020.1000.2052',
  'Bank Account (LAK): 0302.0000.1000.4583', 'Bank Account (CNY): 0302.0108.4000.0002', 'Bank address: 013 Souphanouvong Road, Sihom Village,',
  '     Chanthabouly Dist, VTE', 'Swift code:  LDBBLALA'].forEach((t, i) => T(t, L, ty + i * 8, 6.1, 'h'));
T('IF ANY DELAY OF THE PAYMENT INTEREST WILL BE CHARGED @2% PER MONTH', L, 734, 6.6, 'h');
const fy = 748, fh = 62, w = [(R - L) * 0.28, (R - L) * 0.26, (R - L) * 0.22, (R - L) * 0.24];
const cells = [['', ['Delivered by']], ['', ["Customer's Singnature", 'Date........./......../........']], ['', ['Cashier  Date........./......../........']], ['For Lao Quick Lane', ['Manager']]];
let x = L;
cells.forEach((c0, i) => {
  RECT(x, fy, w[i], fh);
  if (c0[0]) T(c0[0], x + 6, fy + 12, 6.6, 'h');
  T('..................................................', x + w[i] / 2, fy + 45, 6, 'h', 0, 'c');
  c0[1].forEach((t, j) => T(t, x + w[i] / 2, fy + 53 + j * 6.4, 6, 'h', 0, 'c'));
  x += w[i];
});

// render
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const html = o.map(p => {
  if (p.k === 'r') return `<div style="left:${p.x}pt;top:${p.y}pt;width:${p.w}pt;height:${p.h}pt;${p.fill ? 'background:' + p.fill : 'border:.8pt solid #000'}"></div>`;
  if (p.k === 'l') { const h = Math.max(p.lw, 0.5); return Math.abs(p.y1 - p.y2) < 0.01
    ? `<div style="left:${p.x1}pt;top:${p.y1}pt;width:${p.x2 - p.x1}pt;height:${h}pt;background:#000"></div>`
    : `<div style="left:${p.x1}pt;top:${p.y1}pt;width:${h}pt;height:${p.y2 - p.y1}pt;background:#000"></div>`; }
  if (p.k === 'i') return `<img src="${p.src}" style="left:${p.x}pt;top:${p.y}pt;width:${p.w}pt;height:${p.h}pt">`;
  const fam = p.fam === 'c' ? "'Liberation Mono','Courier New',monospace" : "'Liberation Sans',Arial,Helvetica,sans-serif";
  const tr = p.al === 'r' ? 'transform:translateX(-100%);' : p.al === 'c' ? 'transform:translateX(-50%);' : '';
  return `<div class="t" style="left:${p.x}pt;top:${p.y - p.fs * 0.82}pt;font-family:${fam};font-size:${p.fs}pt;font-weight:${p.bold ? 700 : 400};${tr}">${esc(p.s)}</div>`;
}).join('');
const page = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}html,body{margin:0}
#p{position:relative;width:595.28pt;height:841.89pt;background:#fff}#p div,#p img{position:absolute;box-sizing:border-box}.t{white-space:pre;line-height:1}</style></head>
<body><div id="p">${html}</div></body></html>`;

const safe = s => String(s == null || s === '' ? 'x' : s).trim().replace(/[\\/:*?"<>|]/g, '-');
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const pdf = path.join(outDir, (get('wip') || get('reg')) ? `QTT wip${safe(get('wip'))} car${safe(get('reg'))}.pdf` : `QT oil change ${safe(get('model')).split(' / ')[0]}.pdf`);
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.setContent(page, { waitUntil: 'load' });
  await pg.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log(JSON.stringify({ pdf, parts: f.parts, labour: f.lab, net: f.net, vat: f.vat, total_usd: f.tot, total_kip: cm(f.tot * rate), rate, logo: hasLogo }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
