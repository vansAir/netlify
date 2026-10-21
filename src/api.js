/*
 * 留言接口层
 *
 * 后端还没好：未配置 VITE_API_BASE 时用 localStorage 模拟（只有自己可见）。
 * 后端就绪后在 .env.local 里设置 VITE_API_BASE=https://xxx 即可切换。
 *
 * 约定的接口（后端按这个实现即可，字段可以再商量）：
 *   GET  {BASE}/messages/random?scope=today   → 200 Message | 204 无内容
 *   GET  {BASE}/messages/random?scope=all     → 200 Message | 204 无内容
 *   POST {BASE}/messages  body: { content, sign } → 201 Message
 *
 *   Message = { id, content: string, sign: string | null, created_at: ISO8601 }
 *   "today" 的边界建议按 Asia/Shanghai 自然日算。
 */

const BASE = import.meta.env.VITE_API_BASE;
export const isMock = !BASE;

export const MAX_LEN = 200;
export const MAX_SIGN = 16;

/* ---------------- 真实后端 ---------------- */
async function http(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json();
}

/* ---------------- 本地 mock ---------------- */
const LS_KEY = 'kuakua-wall-mock';
const DAY = 86400000;

const SEEDS = [
  ['你摸鱼的样子太专业了，连鱼都觉得是自己在摸你。', '池塘管理员'],
  ['恭喜你又一次成功地把今天的事拖到了明天，时间管理大师非你莫属。', null],
  ['你的已读不回很有艺术感，让人每次都在猜测里成长。', '一位被成长的人'],
  ['你点外卖从不看价格，这份对资本主义的信任令人动容。', null],
  ['你说"我就看五分钟"的时候，眼里有光，像一个要去改变世界的人。', '凌晨三点的手机'],
  ['你的头发虽然少了，但每一根都很有主见。', null],
  ['你做的饭难吃得很有记忆点，三年过去了我还记得。', '前室友'],
  ['你在会上一句话不说，却让所有人都觉得你在思考宇宙。', '隔壁工位'],
  ['你的拖延症非常稳定，是这个动荡世界里难得的确定性。', null],
  ['你买的健身卡已经替你健身一年了，它很努力，你也很努力。', '健身房前台'],
  ['你吐槽老板的时候文采斐然，建议直接出书，书名就叫《我不干了》，虽然你还在干。', null],
  ['你的厨房干净得像没人住过，因为确实没人在里面做过饭。', '邪恶夸夸花'],
].map(([content, sign], i) => ({
  id: `seed-${i}`,
  content,
  sign,
  created_at: new Date(Date.now() - (i + 1) * DAY * 1.7).toISOString(),
}));

const load = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* 坏数据就重置 */ }
  return [...SEEDS];
};
const save = (list) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* 满了 */ }
};
const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mock = {
  async random(scope) {
    await sleep(200);
    const list = load();
    if (scope === 'all') return pick(list);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pick(list.filter((m) => new Date(m.created_at) >= today));
  },
  async add(content, sign) {
    await sleep(200);
    const row = { id: `local-${Date.now()}`, content, sign, created_at: new Date().toISOString() };
    save([...load(), row]);
    return row;
  },
};

/* ---------------- 对外 ---------------- */
/** scope: 'today' | 'all'；没有留言时返回 null */
export function randomMessage(scope) {
  if (isMock) return mock.random(scope);
  return http(`/messages/random?scope=${scope}`);
}

export function addMessage(content, sign) {
  content = content.trim().slice(0, MAX_LEN);
  sign = (sign || '').trim().slice(0, MAX_SIGN) || null;
  if (!content) return Promise.reject(new Error('empty'));
  if (isMock) return mock.add(content, sign);
  return http('/messages', { method: 'POST', body: JSON.stringify({ content, sign }) });
}
