# Language

- Always answer Sombath in Thai, also when he writes in English. Text written into the database or sent to the team is English + Lao, as the task needs.
- Keep any table formats required by a skill (for example ql-pending), but write the content in Thai.

# Quick Lane working rules

- Source of record is Supabase project `tbwkbtslmtxvwnqcqljx` (name: `operation`). Check it before answering about WIPs, cash, AR, parts or tasks. Do not answer from memory.
- Before answering, check data freshness (see the `ql-supabase-sync` skill). Say which tables are stale and what Sombath must send.
- Every task, decision or payment Sombath gives you is saved to `ql_kb` in the same turn, unless he says not to. Ask before any delete.
- Never guess account codes, prices, invoice numbers or dates. Ask, or leave a visible blank.
- Cannot send WhatsApp, email or TPlus. Draft the text and say it must be sent by Sombath.
- Routine: skill `ql-daily-routine`; freshness: skill `ql-supabase-sync`.
- Agents (`.claude/agents/`): `ql-morning-check`, `ql-report-intake`, `ql-finance-checker`, `ql-workshop-followup`, `ql-reminder-triage`. Agents except `ql-report-intake` are read-only; the main session does the writes after Sombath agrees.

# Learning

- When Sombath corrects a Thai word or phrase, or teaches a reusable rule, save it without asking: add a row to the learning log in `.claude/skills/thai-reply/SKILL.md` (or the relevant skill), then commit and push to the working branch.
- When he describes a task he repeats, create a project skill under `.claude/skills/` for it and tell him what was saved.
- Tell him in one line what was saved after each save.

# QTT quotation to PDF and WhatsApp draft

- When Sombath gives a quotation in chat (customer, phone, plate, WIP, items with qty and USD price), write a spec JSON and run `node qtt/make_qtt.js spec.json`. Output goes to `qtt/out/` (not committed: it holds customer data).
- The PDF is named `QTT wip<WIP> car<plate>.pdf`. Rate defaults to 22,646 LAK per USD and validity to 7 days unless he says otherwise.
- Show him the total, the normalized phone number and the full WhatsApp draft in chat and ask him to approve. Never claim a message was sent: Claude cannot send WhatsApp. After he approves, give him the `wa.me` link from the draft file; he attaches the PDF and presses send himself.
- Stamp and signature are a separate step (qt-kip-overlay skill). The script writes English labels only because no Lao font is installed.

# QT oil change PDF (Autoline-style) — where everything is saved

- The full copy lives in git: branch `claude/festive-galileo-c4l9jn`, folder `qtt/` (make_qt.js, menu.json, make_lao_labels.js, assets/ with logo and Lao labels). The skill is `.claude/skills/qtt-pdf/SKILL.md`.
- If `qtt/make_qt.js` is missing in a new chat: `git fetch origin claude/festive-galileo-c4l9jn` and check out `qtt/`, `.claude/` and `CLAUDE.md` from it, then run `node qtt/make_qt.js spec.json`.
- Supabase table `ql_qt_files` holds only a partial copy (menu, logo, oil and filter labels). The scripts are not there: the sandbox cannot reach supabase.co and long files cannot be pasted reliably through SQL.
- Command he types: `oil change vigo` → spec `{"model":"Toyota VIGO / HILUX / FORTUNER","date":"<today>"}`. Default rate 22,646. Send the PDF with SendUserFile and reply in Thai.

# What goes to GitHub

- Only code and small config go to GitHub (scripts, menu, skills, agents, CLAUDE.md, logo/label PNGs the script needs). Never commit PDFs, Excel/Word/PowerPoint/CSV files, photos, videos, zips or WhatsApp drafts: they hold customer data. `.gitignore` blocks them. Give those files to him in chat with SendUserFile; he saves them himself.
- 24 Oct 2026: the branches that held documents (`claude/compassionate-curie-lhsncp` 5S checklist, `claude/dreamy-lovelace-n9tua5` DMF Lao translation, `claude/zealous-albattani-mb7vf6` AR and Ranger Excel) were deleted after the files were sent to him in chat. Their agents and skills were moved to this branch.
