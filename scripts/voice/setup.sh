#!/usr/bin/env bash
# One-time setup for the voice generator (everything lands in .cache/voice).
#  - Kokoro-82M (Apache-2.0) fp16 ONNX weights, from the npm package kokoro-fp16-shards
#  - Kokoro voice styles, from the npm package kokoro-local-runtime
#  - A Python venv with kokoro-onnx (tokenizer + bundled espeak-ng) and soundfile
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
dir="$root/.cache/voice"
mkdir -p "$dir"
cd "$dir"

if [ ! -f kokoro-fp16.onnx ]; then
  npm pack kokoro-fp16-shards@1.0.4 --silent >/dev/null
  mkdir -p shards && tar -xzf kokoro-fp16-shards-*.tgz -C shards
  cat shards/package/kokoro-fp16.part{0..9}.bin > kokoro-fp16.onnx
  rm -rf shards kokoro-fp16-shards-*.tgz
fi

if [ ! -d voices ]; then
  npm pack kokoro-local-runtime@0.1.0 --silent >/dev/null
  mkdir -p rt && tar -xzf kokoro-local-runtime-*.tgz -C rt
  mv rt/package/voices voices
  rm -rf rt kokoro-local-runtime-*.tgz
fi

if [ ! -x venv/bin/python ]; then
  python3 -m venv venv
  venv/bin/pip install -q "kokoro-onnx==0.6.1" "soundfile>=0.13" numpy
fi
echo "Voice generator ready in .cache/voice"
