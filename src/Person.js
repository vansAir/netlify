import * as THREE from 'three';

/*
 * 坐在便利店门口的人。
 * 简单的手臂骨骼：肩 → 肘 → 手，手里可以拿不同道具；
 * 每隔一会儿随机来一个小动作：喝咖啡 / 喝饮料 / 吃关东煮 / 吃便当 / 看手机 / 伸懒腰 / 撸猫。
 *
 * 角度约定（身体朝 +z）：
 *   肩/肘 rotation.x 为负 → 手臂向前抬；肩 rotation.z 控制手臂内收/外展
 *   头 rotation.x 正 → 低头，负 → 抬头；rotation.y 正 → 转向自己的左边（世界 +x）
 */

const UPPER = 0.28;
const FORE = 0.26;
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------- 姿势 ---------- */
// r/l: [肩x, 肩y, 肩z, 肘x]；head: [x, y]；lean: 身体前倾
const REST = { r: [-0.55, 0, 0.25, -0.75], l: [-0.55, 0, -0.25, -0.75], head: [0.08, 0], lean: 0 };
const R_CHEST = [-0.85, 0, 0.4, -1.2];
const R_MOUTH = [-1.05, 0, 0.5, -2.05];
const R_SIP = [-1.15, 0, 0.5, -2.35];
const R_TO_LEFT = [-0.8, 0, 0.75, -1.05]; // 伸到左手边夹东西
const L_HOLD = [-0.5, 0, -0.35, -1.1];
const L_HOLD_HIGH = [-0.75, 0, -0.45, -1.15];

const pose = (p) => ({ ...REST, ...p });

/* 动作表：keys 为 [秒, 姿势]，props 为本次要显示的道具，events 在特定时间触发 */
const ACTIONS = {
  coffee: {
    props: ['coffee'],
    keys: [
      [0, pose({})],
      [0.9, pose({ r: R_MOUTH })],
      [1.3, pose({ r: R_SIP, head: [-0.28, 0] })],
      [2.6, pose({ r: R_SIP, head: [-0.28, 0] })],
      [3.3, pose({ r: R_CHEST, head: [0.05, 0.2] })],
      [5.2, pose({ r: R_CHEST, head: [0.0, 0.45] })],
      [6.0, pose({ r: R_MOUTH })],
      [6.4, pose({ r: R_SIP, head: [-0.25, 0] })],
      [7.4, pose({ r: R_SIP, head: [-0.25, 0] })],
      [8.4, pose({})],
    ],
    steam: true,
  },
  can: {
    props: ['can'],
    keys: [
      [0, pose({})],
      [0.8, pose({ r: R_MOUTH })],
      [1.2, pose({ r: R_SIP, head: [-0.45, 0] })],
      [2.8, pose({ r: R_SIP, head: [-0.45, 0] })],
      [3.5, pose({ r: R_CHEST, head: [0.1, 0] })],
      [4.6, pose({})],
    ],
  },
  oden: {
    props: ['odenCup', 'skewer'],
    keys: [
      [0, pose({})],
      [0.9, pose({ l: L_HOLD_HIGH, r: R_TO_LEFT, head: [0.35, 0.15] })],
      [1.6, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.05, 0] })],
      [2.3, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.12, 0] })],
      [3.0, pose({ l: L_HOLD_HIGH, r: R_CHEST, head: [0.1, -0.1] })],
      [3.6, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.05, 0] })],
      [4.3, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.12, 0] })],
      [5.1, pose({ l: L_HOLD_HIGH, r: R_TO_LEFT, head: [0.3, 0.1] })],
      [5.8, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.05, 0] })],
      [6.5, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.12, 0] })],
      [7.5, pose({ l: L_HOLD, head: [0.05, 0.3] })],
      [8.4, pose({})],
    ],
    events: [[2.1, 'bite'], [4.1, 'bite'], [6.3, 'bite']],
    steam: true,
  },
  bento: {
    props: ['bento', 'chopsticks'],
    keys: [
      [0, pose({})],
      [0.9, pose({ l: L_HOLD_HIGH, r: R_TO_LEFT, head: [0.4, 0.1] })],
      [1.5, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.15, 0] })],
      [2.0, pose({ l: L_HOLD_HIGH, r: R_TO_LEFT, head: [0.4, 0.1] })],
      [2.6, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.15, 0] })],
      [3.1, pose({ l: L_HOLD_HIGH, r: R_TO_LEFT, head: [0.4, 0.1] })],
      [3.7, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.15, 0] })],
      [4.6, pose({ l: L_HOLD_HIGH, r: R_CHEST, head: [0.0, 0.35] })],
      [5.6, pose({ l: L_HOLD_HIGH, r: R_TO_LEFT, head: [0.4, 0.1] })],
      [6.2, pose({ l: L_HOLD_HIGH, r: R_MOUTH, head: [0.15, 0] })],
      [7.2, pose({ l: L_HOLD, r: R_CHEST })],
      [8.0, pose({})],
    ],
  },
  phone: {
    props: ['phone'],
    keys: [
      [0, pose({})],
      [0.8, pose({ r: [-0.85, 0, 0.42, -1.45], l: [-0.8, 0, -0.42, -1.4], head: [0.5, 0] })],
      [3.5, pose({ r: [-0.88, 0, 0.42, -1.5], l: [-0.8, 0, -0.42, -1.4], head: [0.48, 0.05] })],
      [4.3, pose({ r: [-0.85, 0, 0.42, -1.45], l: [-0.8, 0, -0.42, -1.4], head: [0.1, 0.3] })], // 抬头看一眼
      [5.0, pose({ r: [-0.85, 0, 0.42, -1.45], l: [-0.8, 0, -0.42, -1.4], head: [0.5, 0] })],
      [7.0, pose({ r: [-0.88, 0, 0.42, -1.5], l: [-0.8, 0, -0.42, -1.4], head: [0.5, -0.05] })],
      [7.8, pose({})],
    ],
  },
  stretch: {
    props: [],
    keys: [
      [0, pose({})],
      [1.0, pose({ r: [-2.9, 0, 0.35, -0.5], l: [-2.9, 0, -0.35, -0.5], head: [-0.35, 0], lean: -0.15 })],
      [2.3, pose({ r: [-3.0, 0, 0.25, -0.2], l: [-3.0, 0, -0.25, -0.2], head: [-0.4, 0], lean: -0.2 })],
      [3.4, pose({})],
    ],
  },
  pet: {
    props: [],
    keys: [
      [0, pose({})],
      [1.0, pose({ l: [-0.35, 0, -0.95, -0.45], head: [0.35, 0.7], lean: 0.05 })],
      [3.8, pose({ l: [-0.35, 0, -0.95, -0.45], head: [0.35, 0.7], lean: 0.05 })],
      [4.8, pose({})],
    ],
    stroke: true,
  },
  wave: {
    props: [],
    keys: [
      [0, pose({})],
      [0.4, pose({ r: [-0.5, 0, -2.3, -0.4], head: [-0.1, -0.15] })],
      [1.8, pose({ r: [-0.5, 0, -2.3, -0.4], head: [-0.1, -0.15] })],
      [2.4, pose({})],
    ],
    waving: true,
  },
};
const IDLE_POOL = ['coffee', 'can', 'oden', 'bento', 'phone', 'stretch', 'pet', 'coffee', 'oden', 'phone'];
// 调试：?act=oden 让他一直重复某个动作
const FORCED = new URLSearchParams(window.location.search).get('act');

/* ---------- 构建 ---------- */
export class Person {
  constructor(ctx) {
    this.ctx = ctx; // { lambert, geo, mat, tex }
    const { lambert, geo } = ctx;
    this.group = new THREE.Group();
    this.action = null;
    this.next = FORCED ? 0.3 : rand(3, 6);
    this.last = null;

    const hoodie = lambert('#3e4a70');
    const pants = lambert('#23222e');
    const skin = lambert('#f0c8a6');
    const hair = lambert('#1c1a24');
    const shoe = lambert('#ecebe8');
    this.skin = skin;

    const body = new THREE.Group();
    this.group.add(body);
    this.body = body;
    const torso = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.2, 0.32, 4, 10)), hoodie);
    torso.position.set(0, 0.38, -0.02);
    torso.rotation.x = 0.12;
    body.add(torso);
    const hood = new THREE.Mesh(geo(new THREE.SphereGeometry(0.17, 12, 8)), hoodie);
    hood.position.set(0, 0.66, -0.13);
    hood.scale.set(1.15, 0.8, 0.9);
    body.add(hood);

    const head = new THREE.Group();
    head.position.set(0, 0.8, 0.04);
    body.add(head);
    this.head = head;
    head.add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 16, 12)), skin));
    const cap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.172, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), hair);
    cap.rotation.x = -0.35;
    cap.position.set(0, 0.015, -0.01);
    head.add(cap);
    const fringe = new THREE.Mesh(geo(new THREE.BoxGeometry(0.28, 0.07, 0.06)), hair);
    fringe.position.set(0, 0.08, 0.13);
    fringe.rotation.x = 0.3;
    head.add(fringe);
    // 眼睛（会眨）
    const eyeMat = ctx.mat(new THREE.MeshBasicMaterial({ color: '#1a1622' }));
    this.eyes = [-1, 1].map((s) => {
      const e = new THREE.Mesh(geo(new THREE.SphereGeometry(0.016, 8, 6)), eyeMat);
      e.position.set(s * 0.055, 0.0, 0.148);
      head.add(e);
      return e;
    });
    this.blinkAt = rand(2, 5);

    // 腿
    for (const s of [-1, 1]) {
      ctx.box(0.15, 0.14, 0.46, pants, s * 0.1, 0.06, 0.2, this.group);
      ctx.box(0.13, 0.36, 0.13, pants, s * 0.1, -0.12, 0.42, this.group);
      ctx.box(0.14, 0.08, 0.24, shoe, s * 0.1, -0.26, 0.47, this.group);
    }

    // 手臂：s=-1 右手（世界 -x），s=1 左手
    const makeArm = (s) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.22, 0.6, -0.02);
      body.add(shoulder);
      const upper = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.058, UPPER - 0.06, 4, 8)), hoodie);
      upper.position.y = -UPPER / 2;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -UPPER;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.052, FORE - 0.06, 4, 8)), hoodie);
      fore.position.y = -FORE / 2;
      elbow.add(fore);
      const hand = new THREE.Group();
      hand.position.y = -FORE;
      elbow.add(hand);
      hand.add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.045, 10, 8)), skin));
      return { shoulder, elbow, hand };
    };
    this.r = makeArm(-1);
    this.l = makeArm(1);

    // 塑料袋
    const bag = new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 10, 8)), lambert('#f3f3f3'));
    bag.scale.set(1, 0.85, 0.7);
    bag.position.set(0.45, 0.1, 0.05);
    this.group.add(bag);

    this.buildProps();
    this.buildSteam();
    this.applyPose(REST);
  }

  /* 道具都挂在手上，沿手的局部 +z 方向（手腕翻过来时正好朝向嘴巴） */
  buildProps() {
    const { geo, lambert, mat, tex } = this.ctx;
    const upright = (obj) => { obj.rotation.x = Math.PI / 2; return obj; };
    const P = {};

    // 咖啡纸杯
    const coffee = new THREE.Group();
    const cup = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.042, 0.033, 0.13, 14)), lambert('#f6f1ea'));
    cup.position.y = 0.04;
    coffee.add(cup);
    const sleeve = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.041, 0.037, 0.05, 14)), lambert('#9a6a45'));
    sleeve.position.y = 0.03;
    coffee.add(sleeve);
    const lid = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 14)), lambert('#3a2a24'));
    lid.position.y = 0.112;
    coffee.add(lid);
    P.coffee = upright(coffee);
    this.r.hand.add(coffee);

    // 罐装饮料
    const can = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12)), lambert('#e04a6a', { emissive: '#3a0a18' }));
    can.position.z = 0.03;
    P.can = upright(can);
    this.r.hand.add(can);

    // 关东煮杯（左手）+ 串（右手）
    const oden = new THREE.Group();
    const ocup = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.075, 0.055, 0.1, 16, 1, true)), lambert('#fff6e8', { side: THREE.DoubleSide }));
    ocup.position.y = 0.04;
    oden.add(ocup);
    const soup = new THREE.Mesh(geo(new THREE.CircleGeometry(0.07, 16)), lambert('#c98a3a', { emissive: '#3a2008' }));
    soup.rotation.x = -Math.PI / 2;
    soup.position.y = 0.075;
    oden.add(soup);
    const daikon = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12)), lambert('#f0d9a0'));
    daikon.position.set(0.02, 0.085, -0.01);
    oden.add(daikon);
    const egg2 = new THREE.Mesh(geo(new THREE.SphereGeometry(0.022, 10, 8)), lambert('#b9783a'));
    egg2.position.set(-0.025, 0.088, 0.015);
    oden.add(egg2);
    P.odenCup = upright(oden);
    this.l.hand.add(oden);

    const skewer = new THREE.Group();
    const stick = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.004, 0.004, 0.26, 5)), lambert('#d9b98a'));
    stick.position.y = 0.1;
    skewer.add(stick);
    this.skewerItems = [
      [new THREE.SphereGeometry(0.026, 10, 8), '#a8763e', 0.2], // 鱼丸
      [new THREE.ConeGeometry(0.03, 0.04, 3), '#6a5a58', 0.15], // 魔芋
      [new THREE.SphereGeometry(0.024, 10, 8), '#c08a48', 0.1], // 卤蛋
    ].map(([g, c, y]) => {
      const m = new THREE.Mesh(geo(g), lambert(c));
      m.position.y = y;
      skewer.add(m);
      return m;
    });
    this.skewerItems[2].scale.set(1, 1.3, 1);
    skewer.rotation.set(Math.PI / 2 - 0.35, 0, 0.3);
    P.skewer = skewer;
    this.r.hand.add(skewer);

    // 便当（左手）+ 筷子（右手）
    const bentoTex = tex(this.ctx.canvasTex(128, 96, (g, w, h) => {
      g.fillStyle = '#222';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fafafa';
      g.fillRect(6, 6, w * 0.55, h - 12);
      g.fillStyle = '#d0342c';
      g.beginPath(); g.arc(w * 0.3, h / 2, 9, 0, Math.PI * 2); g.fill(); // 梅干
      g.fillStyle = '#e8a84a';
      g.fillRect(w * 0.62, 8, w * 0.32, h * 0.38); // 炸鸡
      g.fillStyle = '#5aa04a';
      g.fillRect(w * 0.62, h * 0.52, w * 0.32, h * 0.18);
      g.fillStyle = '#ffd84a';
      g.fillRect(w * 0.62, h * 0.74, w * 0.32, h * 0.16); // 玉子烧
    }));
    const side = lambert('#1d1b20');
    const bento = new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 0.15, 0.045)), [
      side, side, side, side, mat(new THREE.MeshLambertMaterial({ map: bentoTex })), side,
    ]);
    bento.position.z = 0.03;
    P.bento = bento;
    this.l.hand.add(bento);

    const chop = new THREE.Group();
    for (const dx of [-0.008, 0.008]) {
      const c = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.003, 0.004, 0.2, 5)), lambert('#c9a06a'));
      c.position.set(dx, 0.07, 0);
      chop.add(c);
    }
    chop.rotation.set(Math.PI / 2 - 0.5, 0, 0.2);
    P.chopsticks = chop;
    this.r.hand.add(chop);

    // 手机
    const phone = new THREE.Group();
    phone.add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.075, 0.14, 0.012)), lambert('#222')));
    this.screenMat = mat(new THREE.MeshBasicMaterial({ color: '#bfe0ff' }));
    const screen = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.066, 0.128)), this.screenMat);
    screen.position.z = 0.007;
    phone.add(screen);
    phone.position.set(0.05, -0.02, 0.03);
    phone.rotation.set(0.2, 0, -0.5);
    P.phone = phone;
    this.r.hand.add(phone);

    for (const k in P) P[k].visible = false;
    this.props = P;
  }

  buildSteam() {
    const { geo, mat } = this.ctx;
    this.steamMat = mat(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    this.steam = Array.from({ length: 5 }, (_, i) => {
      const m = new THREE.Mesh(geo(new THREE.SphereGeometry(0.025, 8, 6)), this.steamMat);
      m.userData.offset = i / 5;
      this.group.parent?.add(m);
      return m;
    });
  }

  attachSteam(scene) {
    this.steam.forEach((m) => scene.add(m));
  }

  /* ---------- 动作调度 ---------- */
  play(name) {
    const def = ACTIONS[name];
    if (!def) return;
    for (const k in this.props) this.props[k].visible = def.props.includes(k);
    if (name === 'oden') this.skewerItems.forEach((m) => (m.visible = true));
    this.action = { name, def, t: 0, fired: new Set() };
    this.last = name;
  }

  wave() {
    if (this.action && this.action.name !== 'wave' && this.action.def.props.length) return; // 吃东西时不打断
    this.play('wave');
  }

  update(dt, t) {
    // 眨眼
    this.blinkAt -= dt;
    const blinking = this.blinkAt < 0.12 && this.blinkAt > 0;
    this.eyes.forEach((e) => (e.scale.y = blinking ? 0.15 : 1));
    if (this.blinkAt <= 0) this.blinkAt = rand(2.5, 6);

    let p;
    const a = this.action;
    if (a) {
      a.t += dt;
      const keys = a.def.keys;
      const end = keys[keys.length - 1][0];
      for (const [time, ev] of a.def.events || []) {
        if (a.t >= time && !a.fired.has(time)) {
          a.fired.add(time);
          if (ev === 'bite') {
            const item = this.skewerItems.find((m) => m.visible);
            if (item) item.visible = false;
          }
        }
      }
      let i = 0;
      while (i < keys.length - 2 && keys[i + 1][0] <= a.t) i++;
      const [t0, p0] = keys[i];
      const [t1, p1] = keys[i + 1];
      p = mixPose(p0, p1, smooth(Math.min(1, Math.max(0, (a.t - t0) / (t1 - t0)))));
      if (a.def.stroke) p.l = [p.l[0] + Math.sin(a.t * 6) * 0.12, p.l[1], p.l[2], p.l[3]];
      if (a.def.waving) p.r = [p.r[0], p.r[1], p.r[2] + Math.sin(a.t * 12) * 0.25, p.r[3] - 0.3 + Math.sin(a.t * 12) * 0.35];
      if (a.t >= end) {
        for (const k in this.props) this.props[k].visible = false;
        this.action = null;
        this.next = FORCED ? 1 : rand(5, 12);
      }
    } else {
      // 发呆：慢慢左右看
      p = pose({ head: [0.08 + Math.sin(t * 0.4) * 0.05, Math.sin(t * 0.23) * 0.3] });
      this.next -= dt;
      if (this.next <= 0) {
        let name = ACTIONS[FORCED] ? FORCED : null;
        while (!name || (name === this.last && !FORCED)) name = IDLE_POOL[Math.floor(Math.random() * IDLE_POOL.length)];
        this.play(name);
      }
    }
    this.current = p;
    this.applyPose(p);
    this.body.scale.y = 1 + Math.sin(t * 1.6) * 0.01;
    this.screenMat.color.setHSL(0.58, 0.6, 0.78 + Math.sin(t * 3) * 0.05);
    this.updateSteam(dt, t);
  }

  updateSteam(dt, t) {
    const a = this.action;
    const hand = a?.name === 'oden' ? this.l.hand : this.r.hand;
    const on = a?.def.steam && a.t > 0.5 ? 1 : 0;
    this.steamMat.opacity += (on * 0.35 - this.steamMat.opacity) * Math.min(1, dt * 3);
    if (this.steamMat.opacity < 0.01) return;
    const origin = new THREE.Vector3(0, 0, 0.13).applyMatrix4(hand.matrixWorld);
    this.steam.forEach((m) => {
      const k = (t * 0.5 + m.userData.offset) % 1;
      m.position.set(origin.x + Math.sin(t * 2 + m.userData.offset * 9) * 0.03 + k * 0.08, origin.y + k * 0.35, origin.z);
      m.scale.setScalar(0.6 + k * 1.6);
    });
  }

  applyPose(p) {
    this.r.shoulder.rotation.set(p.r[0], p.r[1], p.r[2]);
    this.r.elbow.rotation.x = p.r[3];
    this.l.shoulder.rotation.set(p.l[0], p.l[1], p.l[2]);
    this.l.elbow.rotation.x = p.l[3];
    this.head.rotation.set(p.head[0], p.head[1], 0);
    this.body.rotation.x = p.lean;
  }

  /** 撸猫时猫尾巴摇得欢一点 */
  get pettingCat() {
    return this.action?.name === 'pet' && this.action.t > 0.8;
  }
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerpArr = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function mixPose(a, b, t) {
  return { r: lerpArr(a.r, b.r, t), l: lerpArr(a.l, b.l, t), head: lerpArr(a.head, b.head, t), lean: lerp(a.lean, b.lean, t) };
}
