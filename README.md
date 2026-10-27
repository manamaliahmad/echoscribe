# EchoScribe 🎙️ — Free Local Audio Transcriber (Chrome Extension)

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![Local Whisper](https://img.shields.io/badge/Whisper-local%20%2F%20no%20server-brightgreen)
![BYOK-free](https://img.shields.io/badge/cost-free%20%2F%20unlimited-brightgreen)

> **Transcribe any audio to text — free, unlimited, on your own PC.**
> Open-source Whisper runs locally inside your browser. No server, no account,
> no API key, no per-minute cost. Your audio **never leaves your device**.

If EchoScribe saves you transcription money, please ⭐ **star this repo**.

## ✨ What it does

- **Upload any audio** — MP3, WAV, M4A, OGG, WebM, FLAC, any length. Drag & drop
  or click to choose.
- **Transcribes locally** — the Whisper model runs on your CPU (or GPU via
  WebGPU when available). Nothing is uploaded anywhere.
- **Free & unlimited** — no API, no subscription, no credits. Transcribe 10
  minutes or 10 hours; the cost is only your PC's time.
- **Multilingual** — auto-detect, or pick English, Urdu, Hindi, Arabic,
  Spanish, French, German, Chinese.
- **Copy + download** — one-click copy, or save the transcript as `.txt`.
- **Timestamps** — optional timestamped segments view.

## 🧭 How it works

```text
Audio file ──▶ decoded + resampled to 16 kHz mono (in this tab)
                        │
                        ▼
              Whisper model (ONNX, via Transformers.js)
              running on WebGPU if available, else CPU/WASM
                        │
                        ▼
              Transcript + timestamps ──▶ Copy / Download .txt
```

1. Click the EchoScribe toolbar icon → the transcriber tab opens.
2. Pick a model + language, drop an audio file.
3. **First run only:** the model downloads from Hugging Face (free) and is
   cached by the browser. After that it works **offline**.
4. Press **Transcribe**. Keep the tab open while it works.

## 📦 Models — size vs quality (honest table)

Whisper is open-source (MIT) by OpenAI. These are the `onnx-community`
quantized builds used by EchoScribe:

| Model | Download | RAM while running | Speed on a normal CPU | Quality |
|---|---|---|---|---|
| **Tiny** | ~40 MB | ~0.5–1 GB | Faster than realtime | Good for clear speech |
| **Base** (recommended) | ~75 MB | ~1–2 GB | ~Realtime | Very good, best balance |
| **Small** | ~250 MB | ~2–4 GB | Slower (0.3–1× realtime) | Best on CPU, near world-class |
| **Large-v3** (world-class) | ~3 GB | 8 GB+ (16 GB recommended) | Slow on CPU, fast on GPU | The best Whisper gets |

Rules of thumb:

- **4 GB RAM PC** → Tiny only.
- **8 GB RAM PC** → Base comfortably, Small works.
- **16 GB RAM PC** → Small comfortably, Large-v3 works (GPU strongly recommended).
- **A GPU + WebGPU in Chrome** → everything gets much faster; Small feels realtime, Large-v3 becomes practical.
- **Which model should I pick?** Daily notes, lectures, meetings → **Base**.
  Noisy audio, accents, mixed languages → **Small**. Final subtitles, professional
  transcripts, hard audio → **Large-v3** (and let it run — quality is worth the wait).

## 🧠 The Big Model (Large-v3) — deeply explained

This is the model people mean when they say "the 3 GB Whisper". Here is
everything about it, honestly.

### What it is

**OpenAI Whisper `large-v3`** — the largest, most accurate model in the
Whisper family. It is an **encoder-decoder Transformer** (the same architecture
family as modern language models, specialized for speech):

- **~1.55 billion parameters** — the "knowledge" of the model, learned from
  **680,000 hours** of multilingual audio (the largest training set in the
  Whisper family).
- **99 languages** — it transcribes and translates across nearly every major
  language, including English, Urdu, Hindi, Arabic and dozens more.
- **Why it is better:** bigger models hear better. Large-v3 handles accents,
  background noise, mumbling, fast speech and code-switching (mixing two
  languages) far better than Tiny/Base/Small. Its word-error rate (the standard
  accuracy measure — lower is better) is the lowest of any open Whisper model.
  That is what "world-class" means here: not a marketing word, a measurable gap.

### Why it is ~3 GB

A model's size is roughly **parameters × bytes per parameter**:

- The standard large-v3 checkpoint stores weights at ~2 bytes per parameter
  (fp16 precision) → 1.55 billion × 2 bytes ≈ **3.1 GB**. That is the famous
  "3 GB" figure.
- **fp32** (4 bytes per parameter) would be ~6 GB — EchoScribe does not use it;
  it is slower with no accuracy gain for transcription.
- **fp16** (~3 GB) is what the extension downloads on a GPU (WebGPU).
- **int8 quantized** (~1.5 GB) is what the extension downloads on CPU (WASM):
  weights are compressed to 1 byte per parameter with a small, usually
  unnoticeable accuracy cost, and it runs much faster on CPU.
- The download is split into files the engine loads separately: an **encoder**
  (turns audio into features) and a **decoder** (turns features into text),
  plus tokenizer/config files. The progress bar shows the exact total on your
  first run — the "~3 GB" is approximate because the exact mix depends on the
  precision your device uses.

### What it needs from your PC

- **RAM:** 8 GB minimum, 16 GB recommended. The model itself plus audio buffers
  and the browser easily pass 8 GB on long files.
- **CPU:** it works, but slowly — roughly 0.1–0.3× realtime on a normal laptop
  CPU (a 10-minute file can take 30–90 minutes). This is normal, not a bug:
  1.55 billion parameters is a lot of math per second of audio.
- **GPU (WebGPU):** strongly recommended for Large-v3. On a decent GPU it runs
  several times faster and becomes practical for real work.
- **Disk:** the download is cached by the browser after the first run, so you
  pay the ~3 GB download once and then transcribe offline, unlimited.

### Why the model is NOT stored inside this git repo

This is a platform limit, not a choice:

- **GitHub blocks any single file over 100 MB** in a git push (with a warning
  from 50 MB). Large-v3's files are hundreds of megabytes each — a push would
  be rejected outright.
- **GitHub's website upload caps at 25 MB per file** — also far too small.
- **Git LFS (Large File Storage)** could technically hold it, but GitHub's free
  LFS quota is 1 GB of storage — a 3 GB model exceeds it and would need a paid
  data pack, plus every user cloning the repo would still download 3 GB.
- **GitHub Releases cap at 2 GB per file** — a single 3 GB file does not fit
  there either.

So the entire industry does it the way EchoScribe does: **code lives in git,
models live on the Hugging Face Hub** (`onnx-community/whisper-large-v3`), and
the app downloads the model once, on demand, into the browser cache. The user
experience is identical — pick "Large-v3" from the dropdown, wait for the one
download, transcribe forever — while the repo stays small, cloneable and free
to host. Nothing is hidden: the model id, the download size and the cache
behavior are all visible in the UI and in this README.

## 🔒 Privacy & security

| Question | Answer |
|---|---|
| Where does my audio go? | Nowhere. It is decoded and transcribed inside this browser tab. |
| Is there a server? | No. The only network use is downloading the model once from Hugging Face. |
| Is there an account, key, or limit? | No. No account, no API key, no credits, no limits. |
| What permissions? | `storage` (remembers your model/language choice) and Hugging Face (model download). |
| What about the engine file? | The ONNX runtime needs one `.wasm` engine file (`lib/ort-wasm-simd-threaded.jsep.wasm`, 21.6 MB). It ships in the release zip; for GitHub installs, download it from the link at the bottom of the transcriber page (or the jsDelivr link in the repo's `lib/` note) and place it in `lib/`. |

## 🚀 Install

### Option A — Chrome Web Store (coming soon)

Search **"EchoScribe"** and click **Add to Chrome**.

### Option B — Load unpacked (works right now)

1. Download the release (or this repo) and unzip it.
2. Make sure `lib/ort-wasm-simd-threaded.jsep.wasm` is inside `lib/`
   (the release zip includes it; for a GitHub clone, download it from
   the jsDelivr link below and place it there).
3. Open Chrome → `chrome://extensions` → turn on **Developer mode**.
4. Click **Load unpacked** → select the unzipped folder.
5. Click the EchoScribe icon → drop an audio file → Transcribe.

**WASM engine file (for GitHub installs):**
`https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/ort-wasm-simd-threaded.jsep.wasm`
→ save it as `lib/ort-wasm-simd-threaded.jsep.wasm` inside the extension folder.

Works in Chrome, Edge, Brave and any Chromium browser with WebGPU/WASM support.

## 🛠 Project structure

```text
echoscribe/
├── manifest.json     # Manifest V3: metadata, permissions, CSP (wasm-unsafe-eval)
├── background.js     # Toolbar click → opens transcribe.html
├── transcribe.html   # Full-page UI (English)
├── transcribe.js     # Decode, resample, Whisper pipeline, render
├── lib/
│   ├── transformers.web.min.js          # @huggingface/transformers (web build)
│   ├── ort.all.min.mjs                  # onnxruntime-web (ESM)
│   ├── ort-common/                      # onnxruntime-common (ESM)
│   ├── ort-wasm-simd-threaded.jsep.mjs  # ONNX runtime glue
│   └── ort-wasm-simd-threaded.jsep.wasm # ONNX runtime engine (21.6 MB, binary)
├── icons/            # Extension icons (16 / 48 / 128 px)
├── LICENSE           # MIT License
└── README.md         # You are here
```

Note: `lib/transformers.web.min.js` is vendored from the npm package, with its
two bare imports (`onnxruntime-common`, `onnxruntime-web`) rewritten to the
relative files above, so the extension needs no import map and no remote code
(MV3 forbids remote code).

## 🧰 Tech stack

- **Manifest V3**, vanilla JavaScript, zero build step
- **@huggingface/transformers v3** (web build) + **onnxruntime-web**
- **OpenAI Whisper** (`onnx-community/whisper-{tiny,base,small}`), MIT licensed
- Web Audio API for decode + 16 kHz resampling; Cache API for offline models

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| Error mentions `wasm` / `jsep` | The engine file is missing from `lib/` — see the install step above. |
| Model download is slow | First run only; Tiny is ~40 MB, Small ~250 MB. After that, cached offline. |
| "Could not decode this file" | Chrome can't decode that container — convert to MP3/WAV and retry. |
| Transcription is slow | Normal on CPU — Small on a weak CPU is slower than realtime. Use Tiny/Base, or a PC with WebGPU. |
| Tab frozen during long files | The model works in chunks; keep the tab in focus. A background-worker version is on the roadmap. |
| Wrong language | Pick the language manually instead of Auto-detect. |

## 🗺 Roadmap

- [ ] Microphone recording (transcribe as you speak)
- [ ] Background worker (no UI freeze on long files)
- [ ] `.srt` subtitle export
- [ ] Chrome Web Store listing
- [ ] Firefox port

## 🤝 Contributing

Ideas, bug reports and pull requests are welcome:

1. Fork → branch → commit → Pull Request
2. Found a bug? Open an **Issue** with your Chrome version, model, and a screenshot.

## 👤 Author

Built by **Ali Ahmad** — builder of cute robots, websites and open-source toys.

- GitHub: https://github.com/manamaliahmad
- Instagram: https://instagram.com/manamaliahmad
- X (Twitter): https://x.com/manamaliahmad

## 📄 License

MIT License — see [LICENSE](LICENSE). Use it, remix it, ship it.
