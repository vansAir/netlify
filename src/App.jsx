import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, ConfigProvider, Input, Modal, Tooltip, message } from 'antd';
import { StreetScene } from './StreetScene.js';
import { addMessage, isMock, MAX_LEN, MAX_SIGN, randomMessage } from './api.js';
import { chime, startWind, stopWind } from './sound.js';

const DEFAULT_SIGN = '一朵匿名的邪恶夸夸花';

const INSPIRATIONS = [
  '用最真诚的语气，夸一件最离谱的事。',
  '比如：你的已读不回很有艺术感，让人每次都在猜测里成长。',
  '比如：你说"就看五分钟"的时候，眼里有光。',
  '比如：你的拖延症非常稳定，是这个世界难得的确定性。',
  '夸到对方哭笑不得，就算成功。',
];

const WEEK = '日一二三四五六';
const fmtNow = (d) => `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`;

function fmtWhen(iso) {
  const d = new Date(iso);
  const now = new Date();
  const day0 = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(now) - day0(d)) / 86400000);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diff === 0) return `今天 ${hm}`;
  if (diff === 1) return `昨天 ${hm}`;
  if (diff < 7) return `${diff} 天前`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 信笺 ---------------- */
function Letter({ letter, onClose, onAgain, busy }) {
  if (!letter) return null;
  return (
    <div className="letter-mask" onClick={onClose}>
      <div className="letter" onClick={(e) => e.stopPropagation()}>
        {letter.note && <div className="letter-note">{letter.note}</div>}
        <div className="letter-body">{letter.content}</div>
        <div className="letter-sign">—— {letter.sign || DEFAULT_SIGN}</div>
        <div className="letter-date">{fmtWhen(letter.created_at)}</div>
        <div className="letter-stamp">夸</div>
        <div className="letter-actions">
          <Button type="text" onClick={onClose}>放回风里</Button>
          <Button type="primary" ghost loading={busy} onClick={onAgain}>再来一封</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 写信 ---------------- */
function WriteModal({ open, onClose, onSent }) {
  const [content, setContent] = useState('');
  const [sign, setSign] = useState('');
  const [sending, setSending] = useState(false);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setTip((i) => (i + 1) % INSPIRATIONS.length), 4000);
    return () => clearInterval(id);
  }, [open]);

  const submit = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await addMessage(content, sign);
      setContent('');
      setSign('');
      onSent(true);
    } catch {
      onSent(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      destroyOnHidden
      width={460}
      className="write-modal"
      title="写一封邪恶夸夸"
      footer={
        <Button type="primary" size="large" block loading={sending} disabled={!content.trim()} onClick={submit}>
          折好，交给风
        </Button>
      }
    >
      <p className="write-tip">{INSPIRATIONS[tip]}</p>
      <Input.TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_LEN}
        showCount
        autoSize={{ minRows: 5, maxRows: 9 }}
        placeholder="你真是……"
        className="write-area"
        autoFocus
      />
      <Input
        value={sign}
        onChange={(e) => setSign(e.target.value)}
        maxLength={MAX_SIGN}
        placeholder={`署名（可不填，默认「${DEFAULT_SIGN}」）`}
        className="write-sign"
        onPressEnter={submit}
      />
      <p className="write-rule">匿名投递 · 不点名道姓 · 不人身攻击，坏心眼要坏得可爱</p>
    </Modal>
  );
}

/* ---------------- 主页面 ---------------- */
export default function App() {
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const busyRef = useRef(false);
  const lastScope = useRef('all');
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState(null);
  const [writing, setWriting] = useState(false);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const [amb, setAmb] = useState(null);
  const [noGL, setNoGL] = useState(false);
  const [msg, msgHolder] = message.useMessage();

  /* 收一封信：取信和信笺飞行同时进行 */
  const receive = useCallback(async (scope) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setLetter(null);
    lastScope.current = scope;
    const fetching = (async () => {
      let m = await randomMessage(scope);
      let note = null;
      if (!m && scope === 'today') {
        m = await randomMessage('all');
        if (m) note = '今天还没有人写信，风先捎来一封往日的';
      }
      return m && { ...m, note };
    })();
    const flight = sceneRef.current ? sceneRef.current.flyIn() : sleep(300);
    try {
      const [m] = await Promise.all([fetching, flight]);
      if (!m) {
        msg.info('墙上还空空的，来写第一封吧');
        setWriting(true);
        return;
      }
      if (soundRef.current) chime();
      setLetter(m);
    } catch {
      msg.error('风太大，信没送到，过会儿再试试');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [msg]);

  const receiveRef = useRef(receive);
  receiveRef.current = receive;

  // 创建 three 场景；先等字体加载，canvas 贴图上的字才好看
  useEffect(() => {
    let scene = null;
    let cancelled = false;
    const fonts = document.fonts?.load
      ? Promise.all([
        document.fonts.load('64px "Ma Shan Zheng"', '夸夸マート点我收信止まれ'),
        document.fonts.load('32px "ZCOOL XiaoWei"', '夸'),
      ])
      : Promise.resolve();
    Promise.race([fonts, sleep(2500)]).catch(() => {}).then(() => {
      if (cancelled) return;
      try {
        scene = new StreetScene(stageRef.current, {
          onPersonClick: () => receiveRef.current('all'),
          onAmbience: setAmb,
        });
        sceneRef.current = scene;
      } catch (e) {
        console.error(e);
        setNoGL(true);
      }
    });
    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    soundRef.current = next;
    if (next) startWind();
    else stopWind();
  };

  const onSent = (ok) => {
    if (!ok) {
      msg.error('没寄出去，再试一次？');
      return;
    }
    setWriting(false);
    sceneRef.current?.flyAway();
    if (soundRef.current) chime();
    msg.success('你的夸夸已经随风飘走了');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#d6336c',
          borderRadius: 10,
          fontFamily: '"ZCOOL XiaoWei", "PingFang SC", "Microsoft YaHei", serif',
        },
      }}
    >
      {msgHolder}
      <div ref={stageRef} className={`stage${noGL ? ' stage-fallback' : ''}`} />

      <header className="brand">
        <h1>邪恶夸夸花</h1>
        <p>街角便利店 · 匿名留言墙</p>
        <p className="brand-amb">
          {fmtNow(new Date())}
          {amb && ` · ${amb.phase} · ${amb.weatherName}`}
        </p>
      </header>

      <Tooltip title={sound ? '关掉风声' : '听听风声'} placement="left">
        <button className={`sound-btn${sound ? ' on' : ''}`} onClick={toggleSound} aria-label="风声">
          {sound ? '🎐' : '🔇'}
        </button>
      </Tooltip>

      <nav className="dock">
        <Button size="large" loading={busy && lastScope.current === 'today'} disabled={busy} onClick={() => receive('today')}>
          今日一封
        </Button>
        <Button size="large" loading={busy && lastScope.current === 'all'} disabled={busy} onClick={() => receive('all')}>
          随缘一封
        </Button>
        <Button size="large" type="primary" onClick={() => setWriting(true)}>
          写一封
        </Button>
        <div className="dock-hint">
          {noGL ? '你的浏览器不支持 3D，按钮也能收信' : '或者，点一下坐在便利店门口的人'}
        </div>
      </nav>

      {isMock && <div className="mock-tag">本地预览 · 留言只存在你的浏览器里</div>}

      <Letter
        letter={letter}
        busy={busy}
        onClose={() => setLetter(null)}
        onAgain={() => receive(lastScope.current)}
      />
      <WriteModal open={writing} onClose={() => setWriting(false)} onSent={onSent} />
    </ConfigProvider>
  );
}
