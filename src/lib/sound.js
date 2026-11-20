import { usePrefsStore } from "../store/usePrefsStore";

let context;
const audio = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  context ??= new AudioContext();
  return context;
};

// The click of a flap landing: a 25 ms burst of filtered noise. Synthesised, so no file to load.
export function clack(volume = 0.05) {
  if (!usePrefsStore.getState().soundOn) return;
  const ctx = audio();
  if (!ctx) return;
  const length = Math.floor(ctx.sampleRate * 0.025);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.9;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

const notification = typeof Audio !== "undefined" ? new Audio("/sounds/notification.mp3") : null;

export function chime() {
  if (!usePrefsStore.getState().soundOn || !notification) return;
  notification.currentTime = 0;
  notification.play().catch(() => {}); // browsers refuse sound before the first tap; that's fine
}
