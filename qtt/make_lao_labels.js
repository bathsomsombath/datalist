#!/usr/bin/env node
// Approximate regeneration of lao_filter.png and lao_labour.png (Lao text in DejaVu Sans, transparent PNG; size can differ a little from the approved files).
// Usage: node qtt/make_lao_labels.js   (needs Playwright + DejaVu Sans; no network)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const LABELS = { filter: 'ໄສ້ກອງນ້ຳມັນເຄື່ອງ', labour: 'ຄ່າແຮງງານ ປ່ຽນນ້ຳມັນເຄື່ອງ ແລະ ໄສ້ກອງນ້ຳມັນເຄື່ອງ' };
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ deviceScaleFactor: 3 });
  for (const [k, t] of Object.entries(LABELS)) {
    await pg.setContent(`<body style="margin:0;background:transparent"><span id="s" style="display:inline-block;font:20px 'DejaVu Sans';color:#000;padding:2px;white-space:pre">${t}</span></body>`);
    await pg.locator('#s').screenshot({ path: path.join(__dirname, 'assets', `lao_${k}.png`), omitBackground: true });
  }
  await b.close();
})();
