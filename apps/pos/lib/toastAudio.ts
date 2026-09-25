'use client';

export function playToastAudio(type: 'add' | 'delete' | 'scan' | 'print') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'print') {
      // Authentic POS Cash Register "Cha-Ching" & Bill Completion Bell
      // Note 1: First strike (B5 - 987.77 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: High Metallic "Ching" (E6 - 1318 Hz + Overtone 2637 Hz) at +0.07s
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'triangle';
      osc3.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.07);
      osc3.frequency.setValueAtTime(2637.02, now + 0.07);

      gain2.gain.setValueAtTime(0.45, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc2.connect(gain2);
      osc3.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.07);
      osc3.start(now + 0.07);
      osc2.stop(now + 0.55);
      osc3.stop(now + 0.55);
    } else if (type === 'add') {
      // Pleasant high double-beep chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'delete') {
      // Low deletion notification tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'scan') {
      // Distinct crisp POS Laser Scanner High Beep (1975.5 Hz - B6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1975.5, now);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (err) {
    console.error('[Audio] Playback error:', err);
  }
}
