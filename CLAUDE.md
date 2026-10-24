# Language

- When Sombath writes in English, reply in Thai.
- Keep any table formats required by a skill (for example ql-pending), but write the content in Thai.

# Learning

- When Sombath corrects a Thai word or phrase, or teaches a reusable rule, save it without asking: add a row to the learning log in `.claude/skills/thai-reply/SKILL.md` (or the relevant skill), then commit and push to the working branch.
- When he describes a task he repeats, create a project skill under `.claude/skills/` for it and tell him what was saved.
- Tell him in one line what was saved after each save.

# QTT quotation to PDF and WhatsApp draft

- When Sombath gives a quotation in chat (customer, phone, plate, WIP, items with qty and USD price), write a spec JSON and run `node qtt/make_qtt.js spec.json`. Output goes to `qtt/out/` (not committed: it holds customer data).
- The PDF is named `QTT wip<WIP> car<plate>.pdf`. Rate defaults to 22,550 LAK per USD and validity to 7 days unless he says otherwise.
- Show him the total, the normalized phone number and the full WhatsApp draft in chat and ask him to approve. Never claim a message was sent: Claude cannot send WhatsApp. After he approves, give him the `wa.me` link from the draft file; he attaches the PDF and presses send himself.
- Stamp and signature are a separate step (qt-kip-overlay skill). The script writes English labels only because no Lao font is installed.
