#!/usr/bin/env python3
"""
Records the voice pack: every clip in scripts/voice/lines.json becomes
public/voice/<id>.mp3, and src/lib/voice-pack.ts lists what exists.

  English  Kokoro-82M (Apache-2.0), offline. Luna = af_heart (warm adult
           female); the child model voice = af_bella. Letter sounds are fed
           as IPA phonemes, so /bə/ is a sound, not the letter name "bee".
  Hebrew   Google Cloud Text-to-Speech, when GOOGLE_TTS_API_KEY is set
           (prefers Chirp 3 HD, then Neural2, then WaveNet female voices).
           Without a key Hebrew is skipped and the app keeps its fallback.

Existing clips are kept (pass --force to re-record); clips no longer in the
list are removed. Run via `npm run voice` after `npm run voice:setup`.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".cache" / "voice"
OUT = ROOT / "public" / "voice"
PACK_TS = ROOT / "src" / "lib" / "voice-pack.ts"
LINES = ROOT / "scripts" / "voice" / "lines.json"

EN_VOICES = {"guide": "af_heart", "child": "af_bella"}
EN_SPEED = {"line": 0.92, "word": 0.82, "sound": 0.8}
SR = 24_000


def voice_key(lang: str, kind: str, voice: str, text: str) -> str:
    """FNV-1a 64, identical to voiceKey() in src/lib/tts.ts."""
    h = 0xCBF29CE484222325
    for b in f"{lang}|{kind}|{voice}|{text}".encode("utf-8"):
        h ^= b
        h = (h * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return f"{h:016x}"


def tidy(audio: np.ndarray) -> np.ndarray:
    """Trim silence, add a short natural pad, normalise to -1 dBFS."""
    a = np.asarray(audio, dtype=np.float32).reshape(-1)
    loud = np.flatnonzero(np.abs(a) > 0.01)
    if loud.size:
        a = a[max(0, loud[0] - int(0.03 * SR)) : loud[-1] + int(0.08 * SR)]
    peak = float(np.max(np.abs(a))) if a.size else 0.0
    if peak > 0:
        a = a * (0.89 / peak)
    pad = np.zeros(int(0.05 * SR), dtype=np.float32)
    return np.concatenate([pad, a, pad])


def plausible(audio: np.ndarray, clip: dict) -> bool:
    """Catch Kokoro's occasional empty or truncated outputs."""
    secs = len(audio) / SR
    if clip["kind"] == "sound":
        return secs >= 0.2
    letters = sum(ch.isalpha() for ch in clip["text"])
    return secs >= max(0.3, 0.045 * letters) and float(np.sqrt(np.mean(audio**2))) > 0.01


class KokoroEnglish:
    """
    Runs Kokoro directly (not via kokoro_onnx.create) on a model that also
    returns per-token durations. Kokoro renders the leading padding token as
    ~0.5 s that often contains an invented vowel ("a-blue"); we cut the audio
    exactly where the first real phoneme starts, and trim the trailing pad.
    """

    FRAME = 600  # samples per duration frame at 24 kHz

    def __init__(self) -> None:
        import onnxruntime as ort
        from kokoro_onnx.tokenizer import Tokenizer

        voices = CACHE / "voices"
        npz = CACHE / "voices.npz"
        if not npz.exists():
            np.savez(
                npz,
                **{
                    f.stem: np.fromfile(f, dtype=np.float32).reshape(-1, 1, 256)
                    for f in voices.glob("*.bin")
                },
            )
        self.voices = np.load(npz)
        self.tokenizer = Tokenizer()
        model = CACHE / "kokoro-fp16-dur.onnx"
        if not model.exists():
            raise SystemExit("Run `npm run voice:setup` first (builds kokoro-fp16-dur.onnx).")
        self.sess = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])

    def _run(self, phonemes: str, voice: str, speed: float, style_offset: int = 0) -> np.ndarray:
        tokens = self.tokenizer.tokenize(phonemes)
        if not tokens:
            raise RuntimeError(f"No phonemes for {phonemes!r}")
        style = self.voices[voice][min(max(len(tokens) + style_offset, 1), 510) - 1]
        wav, dur = self.sess.run(
            None,
            {
                "input_ids": np.array([[0, *tokens, 0]], dtype=np.int64),
                "style": style.astype(np.float32),
                "speed": np.array([speed], dtype=np.float32),
            },
        )
        wav = np.asarray(wav, dtype=np.float32).ravel()
        if not np.isfinite(wav).all():
            return np.zeros(0, dtype=np.float32)  # fp16 overflow on this take — caller retries
        dur = np.asarray(dur).ravel().astype(int)
        # Keep 1 frame before the first phoneme for a natural onset, and
        # 4 frames of the end pad for the final consonant's release.
        start = max(0, dur[0] - 1) * self.FRAME
        end = min(len(wav), (int(dur[:-1].sum()) + min(4, int(dur[-1]))) * self.FRAME)
        return wav[start:end]

    def synth(self, clip: dict) -> np.ndarray:
        voice = EN_VOICES[clip["voice"]]
        speed = EN_SPEED[clip["kind"]]
        phonemes = clip["ipa"] if clip["kind"] == "sound" else self.tokenizer.phonemize(clip["text"], "en-us")
        # Takes to try, best first. The fp16 model occasionally returns NaN
        # for one speed/style pair; a nearby pair is fine.
        attempts = [(speed + ds, off) for ds in (0, -0.02, 0.03, -0.05, 0.06) for off in (0, 1)]
        last = np.zeros(0, dtype=np.float32)
        for sp, off in attempts:
            raw = self._run(phonemes, voice, sp, off)
            if not raw.size:
                continue
            last = tidy(raw)
            if plausible(last, clip):
                return last
        raise RuntimeError(f"Kokoro produced implausible audio for {clip['text']!r} ({len(last) / SR:.2f}s)")


class GoogleHebrew:
    API = "https://texttospeech.googleapis.com/v1"

    def __init__(self, key: str) -> None:
        self.key = key
        self.voice = os.environ.get("GOOGLE_TTS_VOICE_HE") or self._pick_voice()
        print(f"Hebrew voice: {self.voice}")

    def _call(self, path: str, body: dict | None = None) -> dict:
        req = urllib.request.Request(
            f"{self.API}/{path}{'&' if '?' in path else '?'}key={self.key}",
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.load(res)

    def _pick_voice(self) -> str:
        voices = self._call("voices?languageCode=he-IL").get("voices", [])
        female = [v["name"] for v in voices if v.get("ssmlGender") == "FEMALE"]
        for tier in ("Chirp3-HD", "Neural2", "Wavenet"):
            match = [n for n in female if tier in n]
            if match:
                return sorted(match)[0]
        if not female:
            raise RuntimeError("No Hebrew voices returned by Google TTS")
        return sorted(female)[0]

    def synth_mp3(self, clip: dict) -> bytes:
        body = {
            "input": {"text": clip["text"]},
            "voice": {"languageCode": "he-IL", "name": self.voice},
            "audioConfig": {"audioEncoding": "MP3", "sampleRateHertz": SR, "speakingRate": 0.95},
        }
        if "Chirp3-HD" in self.voice:
            body["audioConfig"].pop("speakingRate")  # not supported by Chirp 3 HD
        return base64.b64decode(self._call("text:synthesize", body)["audioContent"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-record existing clips")
    ap.add_argument("--lang", choices=["en", "he"], help="only this language")
    args = ap.parse_args()

    clips = json.loads(LINES.read_text())
    for c in clips:
        if voice_key(c["lang"], c["kind"], c["voice"], c["text"]) != c["key"]:
            raise SystemExit(f"Key mismatch for {c['text']!r}: TS and Python hashing disagree")

    OUT.mkdir(parents=True, exist_ok=True)
    english = None
    google_key = os.environ.get("GOOGLE_TTS_API_KEY")
    hebrew = GoogleHebrew(google_key) if google_key and args.lang != "en" else None
    if not hebrew and args.lang != "en":
        print("GOOGLE_TTS_API_KEY not set: skipping Hebrew (the app falls back for those lines).")

    made = kept = skipped = 0
    t0 = time.time()
    for c in clips:
        path = OUT / f"{c['key']}.mp3"
        if args.lang and c["lang"] != args.lang:
            kept += path.exists()
            continue
        if path.exists() and not args.force:
            kept += 1
            continue
        if c["lang"] == "en":
            english = english or KokoroEnglish()
            sf.write(path, english.synth(c), SR, format="MP3", compression_level=0.25)
        elif hebrew:
            path.write_bytes(hebrew.synth_mp3(c))
        else:
            skipped += 1
            continue
        made += 1
        if made % 25 == 0:
            print(f"  {made} recorded…")

    wanted = {c["key"] for c in clips}
    for f in OUT.glob("*.mp3"):
        if f.stem not in wanted:
            f.unlink()
    present = sorted(f.stem for f in OUT.glob("*.mp3"))
    PACK_TS.write_text(
        "// Generated by scripts/voice/generate.py — do not edit by hand.\n"
        "// Ids of pre-recorded clips in public/voice/ (see src/lib/tts.ts voiceKey).\n"
        f"export const VOICE_PACK: ReadonlySet<string> = new Set({json.dumps(present, indent=2)});\n"
    )
    (OUT / "manifest.json").write_text(json.dumps([f"/voice/{k}.mp3" for k in present]) + "\n")
    size = sum(f.stat().st_size for f in OUT.glob("*.mp3")) / 1e6
    print(f"Recorded {made}, kept {kept}, skipped {skipped} in {time.time() - t0:.0f}s — {len(present)} clips, {size:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
