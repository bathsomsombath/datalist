// Google Cloud Text-to-Speech proxy. Key stays server-side: set secret GOOGLE_TTS_KEY.
// POST { text, voice?, lang?, rate? } -> { audio: <base64 mp3> }
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = Deno.env.get("GOOGLE_TTS_KEY");
  if (!key) return json({ error: "GOOGLE_TTS_KEY not set" }, 500);

  let body: { text?: string; voice?: string; lang?: string; rate?: number };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const text = (body.text ?? "").trim();
  if (!text) return json({ error: "text required" }, 400);
  if (text.length > 1000) return json({ error: "text too long (max 1000 chars per call)" }, 413);

  const lang = body.lang ?? "th-TH";
  const voice = body.voice ?? "th-TH-Neural2-C";
  const rate = Math.min(2, Math.max(0.5, body.rate ?? 1));

  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: lang, name: voice },
      audioConfig: { audioEncoding: "MP3", speakingRate: rate },
    }),
  });
  const data = await r.json();
  if (!r.ok) return json({ error: data?.error?.message ?? "google error" }, r.status);
  return json({ audio: data.audioContent });
});
