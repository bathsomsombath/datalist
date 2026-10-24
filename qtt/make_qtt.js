#!/usr/bin/env node
// Quick Lane QTT maker: reads a JSON spec, writes a PDF and a WhatsApp draft.
// It never sends anything. The draft file holds a wa.me link for a person to open after checking.
//
// Usage: node qtt/make_qtt.js spec.json [outDir]
//
// spec.json:
//   { "qno":"QTT-20261024-001", "date":"2026-10-24", "customer":"Beerlao LBC", "phone":"020 5555 1234",
//     "plate":"1633", "wip":"27410", "vehicle":"Isuzu D-Max", "rate":22550, "days":7, "discount":0,
//     "notes":"...", "lang":"th",
//     "items":[ {"d":"Oil service", "q":1, "p":85} ] }

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node qtt/make_qtt.js spec.json [outDir]'); process.exit(2); }
const outDir = process.argv[3] || path.join(__dirname, 'out');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = n => Math.round(n).toLocaleString('en-US');
const fmtDate = v => { const p = String(v).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v; };

// Lao numbers are written 020 xxxx xxxx; WhatsApp wants 85620xxxxxxxx.
function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '856' + d.slice(1);
  return d;
}

const today = new Date().toISOString().slice(0, 10);
const items = (spec.items || []).map(i => ({ d: i.d || '', q: Number(i.q) || 0, p: Number(i.p) || 0 }));
const sub = items.reduce((s, i) => s + i.q * i.p, 0);
const disc = Math.min(Number(spec.discount) || 0, sub);
const usd = sub - disc;
const rate = Number(spec.rate) || 22550;
const lak = usd * rate;
const days = Number(spec.days) || 7;
const date = spec.date || today;
const qno = spec.qno || `QTT-${date.replace(/-/g, '')}-001`;

const rows = items.map((i, n) =>
  `<tr><td>${n + 1}</td><td>${esc(i.d)}</td><td class="r">${i.q}</td><td class="r">${money(i.p)}</td><td class="r">${money(i.q * i.p)}</td></tr>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 14mm 15mm; font-family: Loma, 'Noto Sans Thai', Arial, sans-serif; font-size: 11pt; color: #111; }
  .head { display: flex; justify-content: space-between; border-bottom: 4px solid #003876; padding-bottom: 4mm; }
  .brand { font-size: 26pt; font-weight: 700; color: #003876; letter-spacing: .04em; line-height: 1; }
  .brand span { color: #f47b20; }
  .brand small { display: block; font-size: 9pt; letter-spacing: 0; color: #555; font-weight: 400; margin-top: 2mm; }
  .doc { text-align: right; } .doc h1 { margin: 0; font-size: 17pt; color: #003876; } .doc div { font-size: 10pt; margin-top: 1mm; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; margin: 6mm 0; font-size: 10pt; }
  .meta b { display: inline-block; min-width: 24mm; color: #555; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { background: #003876; color: #fff; text-align: left; padding: 2.2mm; font-weight: 600; }
  td { padding: 2.2mm; border-bottom: 1px solid #d9dee3; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .tot { margin: 5mm 0 0 auto; width: 85mm; font-size: 11pt; }
  .tot div { display: flex; justify-content: space-between; padding: 1.2mm 0; }
  .grand { border-top: 2px solid #003876; font-weight: 700; font-size: 13pt; color: #003876; margin-top: 1mm; padding-top: 2.5mm !important; }
  .valid, .note { margin-top: 6mm; font-size: 9.5pt; color: #444; white-space: pre-wrap; }
</style></head><body>
  <div class="head">
    <div class="brand">QUICK <span>LANE</span><small>Ford Service Centre · Vientiane</small></div>
    <div class="doc"><h1>Quotation / ใบเสนอราคา</h1><div>No. ${esc(qno)}</div><div>Date ${esc(fmtDate(date))}</div></div>
  </div>
  <div class="meta">
    <div><b>Customer</b>${esc(spec.customer)}</div><div><b>Plate</b>${esc(spec.plate)}</div>
    <div><b>WIP</b>${esc(spec.wip)}</div><div><b>Vehicle</b>${esc(spec.vehicle)}</div>
  </div>
  <table>
    <thead><tr><th style="width:9mm">#</th><th>Description</th><th class="r" style="width:16mm">Qty</th><th class="r" style="width:28mm">Unit (USD)</th><th class="r" style="width:30mm">Total (USD)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="tot">
    <div><span>Subtotal</span><span>${money(sub)}</span></div>
    ${disc > 0 ? `<div><span>Discount</span><span>- ${money(disc)}</span></div>` : ''}
    <div class="grand"><span>Total (USD)</span><span>${money(usd)}</span></div>
    <div><span>Equivalent in LAK (rate ${whole(rate)})</span><b>${whole(lak)} LAK</b></div>
  </div>
  <div class="valid">This price is valid for ${days} days from the date of issue.</div>
  ${spec.notes ? `<div class="note">${esc(spec.notes)}</div>` : ''}
</body></html>`;

const safe = s => String(s == null || s === '' ? 'x' : s).trim().replace(/[\\/:*?"<>|]/g, '-');
const base = `QTT wip${safe(spec.wip)} car${safe(spec.plate)}`;

// WhatsApp draft: text only, for a person to read and approve.
const name = spec.customer || (spec.lang === 'en' ? 'Customer' : 'ลูกค้า');
const carLine = `${spec.plate || '-'}${spec.wip ? ` (WIP ${spec.wip})` : ''}`;
const msg = spec.lang === 'en'
  ? `Hello ${name},\n\nPlease find our quotation ${qno} for vehicle ${carLine} from Quick Lane.\n\nTotal: USD ${money(usd)} (approx. ${whole(lak)} LAK at ${whole(rate)}).\nThis price is valid for ${days} days.\n\nPlease review the attached PDF and let us know if you approve so we can start the work.\n\nThank you,\nQuick Lane`
  : `สวัสดีครับ ${name}\n\nใบเสนอราคา ${qno} สำหรับรถทะเบียน ${carLine} จาก Quick Lane\n\nยอดรวม USD ${money(usd)} (ประมาณ ${whole(lak)} กีบ ที่เรท ${whole(rate)})\nราคานี้มีผล ${days} วัน\n\nรบกวนตรวจสอบเอกสารที่แนบ และแจ้งยืนยันให้เราทราบ เพื่อเริ่มงานได้เลยครับ\n\nขอบคุณครับ\nQuick Lane`;
const phone = normPhone(spec.phone);
const phoneOk = phone.length >= 10 && phone.length <= 15;
const waLink = phoneOk ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : null;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, `${base}.pdf`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();

  const draftPath = path.join(outDir, `${base} whatsapp-draft.txt`);
  fs.writeFileSync(draftPath,
    `STATUS: DRAFT - NOT SENT. A person must check the message and attach the PDF.\n` +
    `To: ${phoneOk ? '+' + phone : 'INVALID PHONE: ' + (spec.phone || '(none)')}\n` +
    `Attach: ${base}.pdf\n\n${msg}\n\n` +
    `Open in WhatsApp (does not send): ${waLink || 'n/a'}\n`);

  console.log(JSON.stringify({ pdf: pdfPath, draft: draftPath, to: phoneOk ? '+' + phone : null, usd: money(usd), lak: whole(lak), lines: items.length }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
