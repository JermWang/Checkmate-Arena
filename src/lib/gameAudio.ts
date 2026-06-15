type GameSound = "piece-hover" | "piece-select" | "piece-move";

const MASTER_VOLUME = 0.12;

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lastHoverAt = 0;
const fallbackCache = new Map<GameSound, string>();

function getAudioContext() {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    audioContext = new AudioContextCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
}

export async function primeGameAudio() {
  const ctx = getAudioContext();
  if (!ctx) {
    primeFallbackAudio();
    return;
  }
  if (ctx.state !== "suspended") return;

  try {
    await ctx.resume();
  } catch {
    // Browsers can reject resume until the next direct user gesture.
  }
}

function primeFallbackAudio() {
  const audio = createAudioElement(getFallbackUrl("piece-hover"));
  if (!audio) return;
  audio.volume = 0;
  void audio.play().then(() => audio.pause()).catch(() => {});
}

function getFallbackUrl(sound: GameSound) {
  const cached = fallbackCache.get(sound);
  if (cached) return cached;

  const tones =
    sound === "piece-hover"
      ? [{ frequency: 980, gain: 0.11 }]
      : sound === "piece-select"
        ? [
            { frequency: 720, gain: 0.17 },
            { frequency: 1080, gain: 0.07 },
          ]
        : [
            { frequency: 210, gain: 0.22 },
            { frequency: 320, gain: 0.08 },
          ];
  const duration = sound === "piece-hover" ? 0.045 : sound === "piece-select" ? 0.07 : 0.105;
  const url = createWavUrl(tones, duration);
  fallbackCache.set(sound, url);
  return url;
}

function createWavUrl(tones: { frequency: number; gain: number }[], duration: number) {
  const sampleRate = 22050;
  const sampleCount = Math.max(1, Math.floor(sampleRate * duration));
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (sampleRate * 0.006)) * Math.max(0, 1 - i / sampleCount);
    const sample =
      tones.reduce((sum, toneDef) => sum + Math.sin(2 * Math.PI * toneDef.frequency * t) * toneDef.gain, 0) *
      envelope;
    view.setInt16(44 + i * bytesPerSample, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function playFallbackSound(sound: GameSound) {
  const audio = createAudioElement(getFallbackUrl(sound));
  if (!audio) return;
  audio.volume = 0.55;
  void audio.play().catch(() => {});
}

function createAudioElement(src: string) {
  if (typeof document === "undefined") return null;
  const audio = document.createElement("audio");
  audio.preload = "auto";
  audio.src = src;
  return audio;
}

function tone(frequency: number, duration: number, options?: { type?: OscillatorType; gain?: number; detune?: number }) {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => tone(frequency, duration, options)).catch(() => {});
    return;
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = options?.type ?? "sine";
  osc.frequency.setValueAtTime(frequency, now);
  if (options?.detune) osc.detune.setValueAtTime(options.detune, now);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, now);
  filter.Q.setValueAtTime(0.35, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(options?.gain ?? 0.7, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playGameSound(sound: GameSound) {
  if (!getAudioContext()) {
    playFallbackSound(sound);
    return;
  }

  if (sound === "piece-hover") {
    const now = performance.now();
    if (now - lastHoverAt < 70) return;
    lastHoverAt = now;
    tone(980, 0.038, { gain: 0.24, type: "triangle" });
    return;
  }

  if (sound === "piece-select") {
    tone(720, 0.055, { gain: 0.38, type: "triangle" });
    tone(1080, 0.045, { gain: 0.16, type: "sine", detune: -4 });
    return;
  }

  tone(210, 0.08, { gain: 0.52, type: "triangle" });
  tone(320, 0.06, { gain: 0.2, type: "sine", detune: 6 });
}
