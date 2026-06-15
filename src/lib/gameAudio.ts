type GameSound = "piece-hover" | "piece-select" | "piece-move";

const MASTER_VOLUME = 0.035;

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lastHoverAt = 0;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
}

export function primeGameAudio() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "suspended") return;
  void ctx.resume();
}

function tone(frequency: number, duration: number, options?: { type?: OscillatorType; gain?: number; detune?: number }) {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === "suspended") void ctx.resume();

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
