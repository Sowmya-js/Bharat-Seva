// Pure synthetic sound effect engine utilizing Web Audio API.
// Complete offline operation with absolute zero external dependencies.

let isSoundEnabled = true;

// Load mute preference from localStorage if available
try {
  const saved = localStorage.getItem('bharat_seva_sfx_enabled');
  if (saved !== null) {
    isSoundEnabled = saved === 'true';
  }
} catch (e) {
  console.warn('LocalStorage not accessible for sound settings:', e);
}

export function getSoundEnabled(): boolean {
  return isSoundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  isSoundEnabled = enabled;
  try {
    localStorage.setItem('bharat_seva_sfx_enabled', String(enabled));
  } catch (e) {
    // fallback
  }
}

// Internal helper to create audio nodes and output sounds
function playSynthSound(freqs: number[], durations: number[], type: OscillatorType = 'sine', volume: number = 0.1) {
  if (!isSoundEnabled) return;

  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;

    // Create a master gain node to regulate volume and prevent clipping
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(volume, now + 0.02);
    masterGain.connect(ctx.destination);

    let totalDuration = 0;
    freqs.forEach((freq, idx) => {
      const start = now + totalDuration;
      const dur = durations[idx] || 0.1;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      // Simple pitch envelope sweep for retro sound feel
      if (type === 'triangle' || type === 'sawtooth') {
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, start + dur);
      }

      noteGain.gain.setValueAtTime(volume, start);
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(start);
      osc.stop(start + dur);

      totalDuration += dur - 0.02; // overlap slightly for musicality
    });

    // Clean up master node after playback completes
    setTimeout(() => {
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      ctx.close();
    }, (totalDuration + 0.5) * 1000);
  } catch (err) {
    console.warn('Web Audio playback failed or blocked:', err);
  }
}

// 1. Success sound: Uplifting major arpeggio (C4 -> E4 -> G4 -> C5)
export function playSuccessChime() {
  playSynthSound([261.63, 329.63, 392.00, 523.25], [0.12, 0.12, 0.12, 0.25], 'sine', 0.15);
}

// 2. XP Gain: Quick sparkling twin-tone
export function playXpGainSound() {
  playSynthSound([523.25, 783.99], [0.08, 0.15], 'triangle', 0.1);
}

// 3. Level Up: Grand celebratory scale arpeggio with high pitch sweep
export function playLevelUpFanfare() {
  playSynthSound(
    [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50],
    [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.4],
    'sine',
    0.2
  );
}

// 4. Click feedback: Short muted click
export function playClickBeep() {
  playSynthSound([600], [0.04], 'sine', 0.06);
}

// 5. Warning / Error: Low descending buzz
export function playErrorBuzz() {
  playSynthSound([150, 100], [0.15, 0.25], 'sawtooth', 0.12);
}

// 6. Action Completed / Verification Success: High positive chime
export function playUnlockSucceed() {
  playSynthSound([440, 554.37, 659.25, 880.00], [0.08, 0.08, 0.08, 0.2], 'triangle', 0.12);
}
