---
description: Use when Sombath types "oil change [model]" (e.g. "oil change vigo"), a quotation in chat (customer, phone, plate, WIP, car model or items with prices), says "QT", "QTT", "make quotation", "quote pdf" or "draft whatsapp for quote". Builds the PDF with the saved scripts and drafts the WhatsApp message. Never sends.
name: qtt-pdf
---

# QT / QTT from chat to PDF and WhatsApp draft

Two saved scripts in `qtt/`. Run them; do not rewrite them and do not build an HTML app.

## Which script
- **Oil service quote** (car model is on the menu, or he gives parts with code, description, qty, USD): `node qtt/make_qt.js spec.json outDir`. It draws the Lao Quick Lane / Autoline-style QT (logo, customer block, vehicle bands, items with Lao labels for oil, filter and labour, totals, USD and KIP, bank details, signature boxes). Menu of 18 models in `qtt/menu.json`. Labour defaults: 1 hour, 20 USD/h, 25% discount. VAT 10%. Rate default 22,646 (he may say another rate).
- **Any other quote** (free-form items, customer-friendly layout): `node qtt/make_qtt.js spec.json outDir`.

## Steps
1. Fill a spec JSON in the scratchpad. `make_qt.js` keys: `model, wip, date, acct, terms, reg, regdate, vin, mile, yr, job, sa, cname, ca1, ca2, ca3, contact, phone, lh, lr, ld, rate, lines[[code,desc,qty,usd]]`. `make_qtt.js` keys: see the header of that file. `oil change vigo` → `{"model":"Toyota VIGO / HILUX / FORTUNER","date":"<today>"}`.
2. Missing WIP, plate, customer, phone or any price: ask only for that. Never invent a price, a part number or a phone number. An unknown model: show the menu names and ask.
3. Run the script with the scratchpad as outDir (customer data stays out of git). File name: `QTT wip<WIP> car<plate>.pdf`, or `QT oil change <model>.pdf` when there is no WIP and no plate. Send the PDF to him with SendUserFile.
4. Reply in Thai: parts, labour, net, VAT, total USD and KIP, the phone as +856..., and the WhatsApp draft text. Ask him to check; on changes, edit the spec and rerun.
5. WhatsApp draft: `make_qtt.js` writes the draft file and a `wa.me` link. For `make_qt.js`, write the message yourself (Thai, short, with QT number, plate, total USD and KIP, validity 7 days). After he says ok, give the `wa.me` link. He attaches the PDF and presses send himself.

## Rules
- Claude cannot send WhatsApp. Never say a message was sent.
- Assets in `qtt/assets/`: `logo.png` (from the Autoline QT) and the Lao labels `lao_oil.png`, `lao_filter.png`, `lao_labour.png`. Filter and labour labels were rendered with DejaVu Sans (`qtt/make_lao_labels.js` regenerates them); ask him if a Lao word looks wrong.
- Stamp and signature are a separate step (qt-kip-overlay skill). Check against an Autoline QT with the qt-cross-check skill when he has one.
