import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSsml, parseTtsRequest, ttsUrl, voiceName } from "./tts";
import { GET } from "@/app/api/tts/route";

const q = (o: Record<string, string>) => new URLSearchParams(o);

describe("parseTtsRequest", () => {
  it("accepts lines, words and letter sounds", () => {
    expect(parseTtsRequest(q({ text: "שלום!", lang: "he" }))).toMatchObject({ kind: "line", voice: "guide" });
    expect(parseTtsRequest(q({ text: "apple", lang: "en", kind: "word", voice: "child" }))).toBeTruthy();
    expect(parseTtsRequest(q({ text: "b", lang: "en", kind: "sound" }))).toBeTruthy();
  });

  it("rejects anything outside the rules", () => {
    expect(parseTtsRequest(q({ text: "hi", lang: "fr" }))).toBeNull();
    expect(parseTtsRequest(q({ text: "", lang: "en" }))).toBeNull();
    expect(parseTtsRequest(q({ text: "x".repeat(241), lang: "en" }))).toBeNull();
    expect(parseTtsRequest(q({ text: "bb", lang: "en", kind: "sound" }))).toBeNull();
    expect(parseTtsRequest(q({ text: "hi", lang: "en", voice: "robot" }))).toBeNull();
    expect(parseTtsRequest(q({ text: "שלום", lang: "he", voice: "child" }))).toBeNull();
  });

  it("round-trips through the client URL", () => {
    const r = { text: "thank you", lang: "en", kind: "word", voice: "guide" } as const;
    expect(parseTtsRequest(new URL(ttsUrl(r), "http://x").searchParams)).toEqual(r);
  });
});

describe("buildSsml", () => {
  it("uses IPA phonemes for letter sounds and escapes text", () => {
    expect(buildSsml({ text: "b", lang: "en", kind: "sound", voice: "guide" }, "v")).toContain('ph="bə"');
    const ssml = buildSsml({ text: `Tom & "Jerry" <3`, lang: "en", kind: "line", voice: "guide" }, "v");
    expect(ssml).toContain("Tom &amp; &quot;Jerry&quot; &lt;3");
    expect(ssml).toContain('style="friendly"');
  });

  it("picks the Hebrew, guide and child voices, with env overrides", () => {
    expect(voiceName({ text: "x", lang: "he", kind: "line", voice: "guide" })).toBe("he-IL-HilaNeural");
    expect(voiceName({ text: "x", lang: "en", kind: "word", voice: "child" })).toBe("en-US-AnaNeural");
    expect(voiceName({ text: "x", lang: "en", kind: "line", voice: "guide" }, { AZURE_TTS_VOICE_EN: "en-US-AvaNeural" })).toBe("en-US-AvaNeural");
  });
});

describe("GET /api/tts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("answers 501 when no key is configured", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    const res = await GET(new Request("http://x/api/tts?text=hi&lang=en"));
    expect(res.status).toBe(501);
  });

  it("validates, calls Azure with SSML and returns cacheable audio", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "k");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await GET(new Request("http://x/api/tts?text=hi&lang=xx"))).status).toBe(400);

    const res = await GET(new Request("http://x/api/tts?text=apple&lang=en&kind=word"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1");
    expect(String(init.body)).toContain("en-US-JennyNeural");
    expect((init.headers as Record<string, string>)["Ocp-Apim-Subscription-Key"]).toBe("k");
  });

  it("reports upstream failures without caching them", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "k");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    const res = await GET(new Request("http://x/api/tts?text=hi&lang=en"));
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
