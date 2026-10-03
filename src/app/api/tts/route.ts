/**
 * GET /api/tts?text=&lang=he|en&kind=line|word|sound&voice=guide|child
 *
 * Synthesises speech with Azure AI Speech neural voices and returns MP3.
 * Responses are immutable for a given URL, so Vercel's CDN (and the app's
 * service worker) serve repeats without calling Azure again.
 *
 * Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION. Without them it answers
 * 501 and the app falls back to the device's own voices.
 */
import { buildSsml, parseTtsRequest, voiceName } from "@/lib/tts";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
const hits = new Map<string, { start: number; count: number }>();

/** Best-effort per-instance limit so the key can't be burned by a script. */
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  h.count += 1;
  return h.count > MAX_PER_WINDOW;
}

export async function GET(req: Request): Promise<Response> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return Response.json({ error: "tts_not_configured" }, { status: 501, headers: { "Cache-Control": "no-store" } });
  }

  const r = parseTtsRequest(new URL(req.url).searchParams);
  if (!r) return Response.json({ error: "bad_request" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });

  const upstream = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "kochavim-english",
    },
    body: buildSsml(r, voiceName(r, process.env)),
  }).catch(() => null);

  if (!upstream?.ok) {
    return Response.json({ error: "tts_failed", status: upstream?.status ?? 0 }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
