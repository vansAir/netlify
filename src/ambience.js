import { Color } from 'three';

/*
 * 时间 & 天气
 * 场景跟随访客本地时间：黎明 → 上午 → 正午 → 傍晚 → 黄昏 → 深夜。
 * 天气每 4 小时换一次，由「日期 + 时段」哈希决定，同一时刻大家看到的天气一样。
 * 调试：URL 加 ?hour=18.5&weather=rain（weather: clear | cloudy | rain）
 */

// night: 0 白天 ~ 1 深夜，用来控制灯光、星星、窗户
const KEYS = [
  { h: 0, name: '深夜', top: '#060920', mid: '#241c4a', bottom: '#6e4470', fog: '#2c2244', hemi: ['#6a68b8', '#231b2e', 1.2], sun: ['#a9b8ff', 0.6], night: 1, exposure: 1.05 },
  { h: 4.8, name: '凌晨', top: '#0d1438', mid: '#3a3266', bottom: '#8a5a7e', fog: '#3a3058', hemi: ['#7a78c0', '#2a2234', 1.3], sun: ['#b0b8ff', 0.5], night: 0.9, exposure: 1.05 },
  { h: 6.2, name: '黎明', top: '#3d5a9e', mid: '#c98aa8', bottom: '#ffc49a', fog: '#c99aa8', hemi: ['#ffd2c0', '#4a3a48', 1.8], sun: ['#ffb27a', 1.4], night: 0.35, exposure: 1.0 },
  { h: 8, name: '早晨', top: '#5d9ce8', mid: '#a9d0f2', bottom: '#f4e6dc', fog: '#c8dcec', hemi: ['#e8f2ff', '#6a6070', 2.4], sun: ['#fff0d8', 2.2], night: 0, exposure: 0.95 },
  { h: 12.5, name: '正午', top: '#3f86e0', mid: '#8fc2f0', bottom: '#e6f2fa', fog: '#bcd8ee', hemi: ['#ffffff', '#6c6676', 2.7], sun: ['#ffffff', 2.6], night: 0, exposure: 0.92 },
  { h: 16, name: '午后', top: '#4f88d6', mid: '#a6c8ec', bottom: '#f6e2c8', fog: '#d4d6dc', hemi: ['#fff4e4', '#6a5e6a', 2.4], sun: ['#ffe2b0', 2.2], night: 0, exposure: 0.95 },
  { h: 17.6, name: '傍晚', top: '#4a5ca8', mid: '#e8949a', bottom: '#ffb070', fog: '#e0a08e', hemi: ['#ffc8a8', '#4e3a46', 2.0], sun: ['#ff9a5a', 1.8], night: 0.2, exposure: 1.0 },
  { h: 19, name: '黄昏', top: '#1a1f52', mid: '#5a3a78', bottom: '#d8708a', fog: '#5a3c64', hemi: ['#9a88c8', '#2e2236', 1.5], sun: ['#c08ad0', 0.7], night: 0.75, exposure: 1.05 },
  { h: 21, name: '夜晚', top: '#070a24', mid: '#2c2156', bottom: '#8a5078', fog: '#30264a', hemi: ['#6e6cc0', '#251d30', 1.3], sun: ['#aabaff', 0.65], night: 1, exposure: 1.05 },
  { h: 24, name: '深夜', top: '#060920', mid: '#241c4a', bottom: '#6e4470', fog: '#2c2244', hemi: ['#6a68b8', '#231b2e', 1.2], sun: ['#a9b8ff', 0.6], night: 1, exposure: 1.05 },
];

export const WEATHER_NAMES = { clear: '晴', cloudy: '多云', rain: '小雨' };

const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};

function weatherAt(date) {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${Math.floor(date.getHours() / 4)}`;
  const r = hash(key);
  return r < 0.55 ? 'clear' : r < 0.83 ? 'cloudy' : 'rain';
}

const params = new URLSearchParams(window.location.search);
const forcedHour = params.has('hour') ? Number(params.get('hour')) : null;
const forcedWeather = WEATHER_NAMES[params.get('weather')] ? params.get('weather') : null;

const c = (hex) => new Color(hex);
const mixColor = (a, b, t) => c(a).lerp(c(b), t);
const GRAY = { top: '#5a6272', mid: '#7f8794', bottom: '#9aa0a8', fog: '#8a9098' };

/** 计算某一时刻的环境参数 */
export function ambienceAt(date = new Date()) {
  const hour = forcedHour ?? date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const weather = forcedWeather ?? weatherAt(date);
  let i = 0;
  while (KEYS[i + 1].h <= hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = (hour - a.h) / (b.h - a.h);
  const lerp = (x, y) => x + (y - x) * t;

  // 阴天 / 下雨：天空掺灰，光线变弱，雾变近
  const gray = weather === 'rain' ? 0.8 : weather === 'cloudy' ? 0.35 : 0;
  const dark = weather === 'rain' ? 0.5 : weather === 'cloudy' ? 0.8 : 1;
  const night = lerp(a.night, b.night);
  const grayAmt = gray * (1 - night * 0.6);
  const sky = (k) => mixColor(a[k], b[k], t).lerp(c(GRAY[k]), grayAmt).multiplyScalar(dark * 0.3 + 0.7);

  // 太阳 / 月亮的高度角：6 点升起 18 点落下；夜里换成月亮
  const sunArc = ((hour - 6) / 12) * Math.PI;
  const isDay = hour >= 5.6 && hour <= 18.6;
  const moonArc = (((hour + 24 - 18.5) % 24) / 11.5) * Math.PI;

  return {
    hour,
    weather,
    weatherName: WEATHER_NAMES[weather],
    phase: t < 0.5 ? a.name : b.name,
    top: sky('top'),
    mid: sky('mid'),
    bottom: sky('bottom'),
    fog: sky('fog'),
    fogNear: weather === 'rain' ? 12 : weather === 'cloudy' ? 18 : 24,
    fogFar: weather === 'rain' ? 48 : weather === 'cloudy' ? 62 : 75,
    hemiSky: mixColor(a.hemi[0], b.hemi[0], t),
    hemiGround: mixColor(a.hemi[1], b.hemi[1], t),
    hemiIntensity: lerp(a.hemi[2], b.hemi[2]) * (0.6 + 0.4 * dark),
    sunColor: mixColor(a.sun[0], b.sun[0], t),
    sunIntensity: lerp(a.sun[1], b.sun[1]) * dark * dark,
    isDay,
    sunArc: isDay ? Math.min(Math.max(sunArc, 0.04), Math.PI - 0.04) : Math.min(Math.max(moonArc, 0.2), Math.PI - 0.2),
    night,
    exposure: lerp(a.exposure, b.exposure),
    starOpacity: Math.max(0, night - 0.4) / 0.6 * (weather === 'clear' ? 0.85 : weather === 'cloudy' ? 0.25 : 0),
    clouds: weather === 'clear' ? 4 : weather === 'cloudy' ? 14 : 18,
    cloudColor: mixColor('#ffffff', a.fog, 0.35).lerp(c('#3a3a48'), night * 0.7).lerp(c('#8a8e98'), gray * 0.6),
    rain: weather === 'rain',
  };
}
