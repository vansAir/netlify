/* 风声（滤波后的褐噪声）和风铃，全部用 WebAudio 合成，不需要音频文件 */
let ctx = null;
let wind = null;

const getCtx = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

export function startWind() {
  const c = getCtx();
  c.resume();
  if (wind) return;
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.35, c.currentTime + 2);
  // 慢慢起伏的阵风
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(filter.frequency);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
  lfo.start();
  wind = { src, lfo, gain };
}

export function stopWind() {
  if (!wind || !ctx) return;
  const { src, lfo, gain } = wind;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  src.stop(ctx.currentTime + 0.7);
  lfo.stop(ctx.currentTime + 0.7);
  wind = null;
}

/** 叮——风铃 */
export function chime() {
  const c = getCtx();
  const base = 2300 + Math.random() * 500;
  [0, 0.16, 0.42].forEach((delay, i) => {
    const t = c.currentTime + delay;
    [1, 2.76].forEach((ratio, j) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = base * ratio * (1 + i * 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(j ? 0.012 : 0.05, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 1.9);
    });
  });
}
