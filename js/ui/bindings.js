// js/ui/bindings.js

import { AudioEngine } from "../audio/audio-engine.js";
import { TimerEngine } from "../timer/timer-engine.js";
import { PlayerState } from "../state/player-state.js";

const audio = new AudioEngine();
let state = PlayerState.STOPPED;

const timer = new TimerEngine(
  (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    document.getElementById("time").innerText = `${m}:${s}`;
  },
  () => stop()
);

export function play() {
  if (state === PlayerState.PLAYING) return;
  audio.play(7);
  timer.start(5 * 60);
  state = PlayerState.PLAYING;
}

export function pause() {
  if (state !== PlayerState.PLAYING) return;
  audio.pause();
  timer.pause();
  state = PlayerState.PAUSED;
}

export function resume() {
  if (state !== PlayerState.PAUSED) return;
  audio.resume();
  timer.resume();
  state = PlayerState.PLAYING;
}

export function stop() {
  audio.stop();
  timer.stop();
  document.getElementById("time").innerText = "05:00";
  state = PlayerState.STOPPED;
}

