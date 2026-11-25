// All sound is synthesized with WebAudio — no audio files, no network.
// One job: the little noises that make chopping, sizzling and serving feel
// immediate, plus a tiny looping stall jingle you can mute with M.

const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, E5: 659.25, G5: 783.99 };

export function createAudio() {
  let context = null;
  let master = null;
  let musicOn = true;
  let musicTimer = null;
  let step = 0;

  // The stall jingle: a cheerful 8-step loop, quiet enough to sit under the game.
  const MELODY = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.E4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.D4];

  function ensure() {
    if (context) return true;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, seconds, type, volume, when = 0) {
    if (!context || !master) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noise(seconds, volume, lowpass) {
    if (!context || !master) return;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function startMusic() {
    if (!context || musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (!musicOn || document.hidden) return;
      tone(MELODY[step % MELODY.length], 0.32, 'triangle', 0.05);
      if (step % 2 === 0) tone(MELODY[step % MELODY.length] / 2, 0.3, 'sine', 0.04);
      step += 1;
    }, 340);
  }

  return {
    /** Call from the first user gesture; browsers block audio before one. */
    unlock() {
      if (!ensure()) return;
      if (context.state === 'suspended') context.resume().catch(() => {});
      startMusic();
    },
    toggleMusic() {
      musicOn = !musicOn;
      return musicOn;
    },
    chop() {
      noise(0.08, 0.35, 900);
      tone(180, 0.07, 'square', 0.12);
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.12);
    },
    place() {
      tone(340, 0.09, 'triangle', 0.14);
      noise(0.05, 0.12, 1200);
    },
    sizzle() {
      noise(0.35, 0.16, 3200);
    },
    ding() {
      tone(880, 0.35, 'sine', 0.2);
      tone(1318, 0.4, 'sine', 0.12, 0.08);
    },
    coin() {
      tone(988, 0.1, 'square', 0.1);
      tone(1319, 0.22, 'square', 0.1, 0.07);
    },
    error() {
      tone(140, 0.22, 'sawtooth', 0.14);
    },
    expire() {
      tone(392, 0.18, 'triangle', 0.14);
      tone(311, 0.3, 'triangle', 0.14, 0.16);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.35, 'triangle', 0.16, i * 0.11));
    },
  };
}
