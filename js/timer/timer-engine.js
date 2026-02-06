// js/timer/timer-engine.js
export class TimerEngine {
  constructor(onTick, onEnd) {
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.remaining = 0;
    this.interval = null;
    this.paused = false;
  }

  start(seconds) {
    this.stop();
    this.remaining = seconds;
    this.paused = false;

    this.interval = setInterval(() => {
      if (this.paused) return;
      this.remaining--;
      this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        this.onEnd();
      }
    }, 1000);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  stop() {
    clearInterval(this.interval);
    this.interval = null;
  }
}

