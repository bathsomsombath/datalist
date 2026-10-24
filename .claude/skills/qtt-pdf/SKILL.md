---
name: qtt-pdf
description: Use when Sombath types a quotation in chat (customer, phone, plate, WIP, items with prices), says "QTT", "make quotation", "quote pdf" or "draft whatsapp for quote". Builds the PDF with the saved script and drafts the WhatsApp message. Never sends.
---

# QTT from chat to PDF and WhatsApp draft

The script is `qtt/make_qtt.js` in this repo. It is already saved, so run it; do not rewrite it and do not build an HTML app.

## Steps
1. Read his message and fill a spec JSON in the scratchpad:
   `customer, phone, plate, wip, vehicle, items[{d,q,p}]` plus optional `rate` (default 22550), `days` (default 7), `discount`, `notes`, `lang` (`th` default, `en` for English customers), `qno`, `date`.
2. If the phone, plate, WIP or any price is missing, ask for only that. Never invent a price or a phone number.
3. Run `node qtt/make_qtt.js <spec.json>`. Output lands in `qtt/out/` (git-ignored, customer data).
4. Reply in Thai with: the PDF path, total USD and LAK, the normalized phone (+856...), and the full WhatsApp draft text. Ask him to check and say "ok" or what to change.
5. On changes, edit the spec and run again. On "ok", give the `wa.me` link from the draft file. He attaches the PDF and presses send himself.

## Rules
- Claude cannot send WhatsApp. Never say a message was sent.
- The PDF has English labels only (no Lao font installed). Stamp and signature are a separate step (qt-kip-overlay skill).
- Cross-check against the Autoline QT with the qt-cross-check skill when he has one.
