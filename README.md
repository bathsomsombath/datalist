# Quick Lane Tools (datalist)

| App | File | Supabase |
|---|---|---|
| Card Maker (Lift / Tool No. cards) | `quicklane-card-maker.html` | `ql_staff` (pick staff), `ql_cards` (saved cards), Storage `ql_files/cards/` (photos) |
| Read Aloud (Google Thai voice) | `read-aloud.html` | reads `ql_kb` urgent items; calls Edge Function `tts` (`supabase/functions/tts`) |

Project: `tbwkbtslmtxvwnqcqljx` · always live (no offline mode) · copy of latest version kept in `ql_agent_files`.

## Read Aloud setup
1. Google Cloud: enable Cloud Text-to-Speech API, create an API key.
2. Supabase: set secret `GOOGLE_TTS_KEY`, then deploy `supabase/functions/tts`.
3. Until deployed, `read-aloud.html` falls back to the browser's own Thai voice.
