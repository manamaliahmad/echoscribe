/* EchoScribe v1.0.0 — local Whisper transcription via @huggingface/transformers.
   Everything runs in this tab: audio is decoded + resampled locally, the model
   runs on the user's CPU/GPU, nothing is uploaded. The model downloads once
   from Hugging Face and is cached by the browser for offline use. */
import { pipeline, env } from './lib/transformers.web.min.js';

env.allowLocalModels = false;

var $ = function (id) { return document.getElementById(id); };
var statusEl = $('status'), barWrap = $('barWrap'), barFill = $('barFill');
var transcriber = null, loadedModel = null, loadedDevice = null;
var audioData = null, audioDuration = 0, audioName = '';
var lastResult = null;

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind || '';
}
function setBar(pct) {
  barWrap.style.display = pct == null ? 'none' : 'block';
  if (pct != null) barFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
}
function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function savePrefs() {
  chrome.storage.local.set({ model: $('modelSelect').value, lang: $('langSelect').value });
}
chrome.storage.local.get({ model: 'onnx-community/whisper-base', lang: '' }, function (items) {
  $('modelSelect').value = items.model;
  $('langSelect').value = items.lang;
});
$('modelSelect').addEventListener('change', function () { savePrefs(); transcriber = null; loadedModel = null; });
$('langSelect').addEventListener('change', savePrefs);

/* ---------- audio: decode + resample to 16 kHz mono ---------- */
async function fileTo16kMono(file) {
  var buf = await file.arrayBuffer();
  var actx = new (window.AudioContext || window.webkitAudioContext)();
  var decoded = await actx.decodeAudioData(buf);
  await actx.close();
  var targetRate = 16000;
  var frames = Math.ceil(decoded.duration * targetRate);
  var off = new OfflineAudioContext(1, frames, targetRate);
  var src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start(0);
  var rendered = await off.startRendering();
  return { data: rendered.getChannelData(0), duration: decoded.duration };
}

var drop = $('dropZone'), input = $('fileInput');
drop.addEventListener('click', function () { input.click(); });
['dragover', 'dragenter'].forEach(function (ev) {
  drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
});
['dragleave', 'drop'].forEach(function (ev) {
  drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
});
drop.addEventListener('drop', function (e) {
  var f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handleFile(f);
});
input.addEventListener('change', function () {
  if (input.files[0]) handleFile(input.files[0]);
});

async function handleFile(file) {
  audioData = null;
  $('transcribeBtn').disabled = true;
  $('fileInfo').textContent = 'Reading ' + file.name + '…';
  setStatus('Decoding audio…');
  try {
    var r = await fileTo16kMono(file);
    audioData = r.data;
    audioDuration = r.duration;
    audioName = file.name;
    $('fileInfo').textContent = file.name + ' — ' + fmtTime(r.duration)
      + ' — ' + (file.size / 1048576).toFixed(1) + ' MB — decoded to 16 kHz mono, ready.';
    $('transcribeBtn').disabled = false;
    setStatus('Ready. Press Transcribe.');
  } catch (err) {
    $('fileInfo').textContent = '';
    setStatus('Could not decode this file in Chrome (' + (err.message || err) + '). Try MP3, WAV or M4A.', 'err');
  }
}

/* ---------- model loading: WebGPU first, CPU fallback ---------- */
function progressHandler(p) {
  if (p.status === 'progress' && p.total) {
    setBar(Math.round((p.loaded / p.total) * 100));
    setStatus('Downloading model: ' + (p.file || '') + ' — ' + Math.round((p.loaded / p.total) * 100) + '% (once only, then cached offline)');
  } else if (p.status === 'done') {
    setStatus('Model ready. Transcribing…');
  } else if (p.status === 'initiate') {
    setStatus('Downloading model: ' + (p.file || '') + '… (once only, then cached offline)');
    setBar(0);
  }
}

async function loadTranscriber(modelId) {
  var devices = [];
  if (navigator.gpu) devices.push({ device: 'webgpu', dtype: 'fp16', label: 'WebGPU (GPU)' });
  devices.push({ device: 'wasm', dtype: 'q8', label: 'CPU (WASM)' });
  var lastErr = null;
  for (var i = 0; i < devices.length; i++) {
    var d = devices[i];
    try {
      setStatus('Loading ' + modelId + ' on ' + d.label + '…');
      setBar(0);
      var t = await pipeline('automatic-speech-recognition', modelId, {
        device: d.device, dtype: d.dtype, progress_callback: progressHandler
      });
      transcriber = t; loadedModel = modelId; loadedDevice = d.label;
      return;
    } catch (e) {
      lastErr = e;
      try {
        setStatus('Retrying ' + modelId + ' with default settings…');
        var t2 = await pipeline('automatic-speech-recognition', modelId, {
          device: d.device, progress_callback: progressHandler
        });
        transcriber = t2; loadedModel = modelId; loadedDevice = d.label;
        return;
      } catch (e2) { lastErr = e2; }
    }
  }
  throw lastErr || new Error('Could not load the model.');
}

function wasmHint(err) {
  var m = String((err && err.message) || err || '');
  if (/wasm|jsep|Failed to fetch|script error/i.test(m)) {
    return ' If it mentions wasm/jsep, the engine file is missing: download ort-wasm-simd-threaded.jsep.wasm (link at the bottom of this page) into the extension lib/ folder and reload.';
  }
  return '';
}

$('transcribeBtn').addEventListener('click', async function () {
  if (!audioData) return;
  var btn = $('transcribeBtn');
  btn.disabled = true;
  $('outCard').style.display = 'none';
  var modelId = $('modelSelect').value;
  var lang = $('langSelect').value;
  try {
    if (!transcriber || loadedModel !== modelId) {
      if (transcriber && typeof transcriber.dispose === 'function') {
        try { await transcriber.dispose(); } catch (e) { /* ignore */ }
      }
      transcriber = null;
      await loadTranscriber(modelId);
    }
    setStatus('Transcribing on ' + loadedDevice + '… (keep this tab open)');
    setBar(null);
    var t0 = performance.now();
    var opts = {
      chunk_length_s: 30, stride_length_s: 5, task: 'transcribe', return_timestamps: true
    };
    if (lang) opts.language = lang;
    var result = await transcriber(audioData, opts);
    var secs = ((performance.now() - t0) / 1000).toFixed(1);
    lastResult = result;
    $('output').value = result.text || '';
    $('outCard').style.display = 'block';
    $('metaRow').style.display = 'flex';
    $('metaModel').textContent = 'Model: ' + modelId.split('/').pop();
    $('metaDevice').textContent = 'Engine: ' + loadedDevice;
    $('metaTime').textContent = 'Transcribed in ' + secs + 's';
    $('metaAudio').textContent = 'Audio: ' + fmtTime(audioDuration);
    renderChunks();
    setStatus('Done — ' + fmtTime(audioDuration) + ' of audio transcribed in ' + secs + 's, fully offline on your PC.', 'ok');
    setBar(null);
  } catch (err) {
    setStatus('Transcription failed: ' + (err.message || err) + wasmHint(err), 'err');
    setBar(null);
  } finally {
    btn.disabled = false;
  }
});

function renderChunks() {
  var show = $('tsToggle').checked;
  $('chunksEl').style.display = show ? 'block' : 'none';
  if (!show || !lastResult || !lastResult.chunks) return;
  $('chunksEl').innerHTML = '';
  lastResult.chunks.forEach(function (c) {
    var div = document.createElement('div');
    var ts = c.timestamp || [0, 0];
    var b = document.createElement('b');
    b.textContent = '[' + fmtTime(ts[0]) + ' – ' + fmtTime(ts[1]) + '] ';
    div.appendChild(b);
    div.appendChild(document.createTextNode(c.text || ''));
    $('chunksEl').appendChild(div);
  });
}
$('tsToggle').addEventListener('change', renderChunks);

function copyText(text, btn) {
  function done() {
    var old = btn.textContent; btn.textContent = 'Copied!';
    setTimeout(function () { btn.textContent = old; }, 1200);
  }
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
  else fallback();
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove(); done();
  }
}
$('copyBtn').addEventListener('click', function () { copyText($('output').value, $('copyBtn')); });
$('downloadBtn').addEventListener('click', function () {
  var base = (audioName || 'transcript').replace(/\.[^.]+$/, '');
  var blob = new Blob([$('output').value], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = base + '.txt';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
});
