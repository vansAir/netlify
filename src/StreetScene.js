import * as THREE from 'three';
import { Person } from './Person.js';
import { ambienceAt } from './ambience.js';

/*
 * 日式街角：一家便利店、门口坐着一个人、樱花被风吹着飘。
 * 天色和天气跟随真实时间变化（见 ambience.js）。
 * 坐标约定：地面 y=0；马路沿 x 轴；便利店在 z<0 一侧，正门朝 +z；
 * 相机站在马路对面 (z≈11) 看过去；风从 -x 吹向 +x，略带向镜头的分量。
 */

const rand = (a, b) => a + Math.random() * (b - a);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* ---------------- canvas 贴图 ---------------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const BRUSH = '"Ma Shan Zheng", "ZCOOL XiaoWei", "Hiragino Mincho ProN", "Songti SC", serif';

function radialTex(inner, outer = 'rgba(0,0,0,0)') {
  return canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

// 便利店橱窗：亮堂堂的货架
function shelfTex(seed) {
  return canvasTex(512, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#dfeaf7');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let x = 30; x < w; x += 120) g.fillRect(x, 6, 70, 6); // 顶灯
    const colors = ['#ff6b8b', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5', '#ef476f', '#ffffff'];
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let row = 0; row < 4; row++) {
      const y = 40 + row * 52;
      g.fillStyle = '#b8c4d4';
      g.fillRect(0, y + 34, w, 5);
      for (let x = 4; x < w - 10; ) {
        const pw = 8 + r() * 16;
        const ph = 14 + r() * 18;
        g.fillStyle = colors[Math.floor(r() * colors.length)];
        g.fillRect(x, y + 34 - ph, pw, ph);
        x += pw + 2 + r() * 3;
      }
    }
    // 一个店员的剪影
    if (seed % 2) {
      g.fillStyle = 'rgba(60,70,95,0.55)';
      g.beginPath();
      g.arc(390, 120, 16, 0, Math.PI * 2);
      g.fill();
      g.fillRect(372, 138, 36, 70);
    }
    // 玻璃反光
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath();
    g.moveTo(60, 0); g.lineTo(140, 0); g.lineTo(40, h); g.lineTo(-40, h);
    g.fill();
  });
}

function signTex() {
  return canvasTex(2048, 200, (g, w, h) => {
    g.fillStyle = '#fffaf6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff6f9c';
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = '#2b1d3a';
    g.font = `bold 120px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('夸夸マート', w / 2, h / 2 - 12);
    g.font = 'bold 34px "Helvetica Neue", Arial, sans-serif';
    g.fillStyle = '#ff6f9c';
    g.fillText('24H', w - 200, h / 2 - 34);
    g.font = '22px "Helvetica Neue", Arial, sans-serif';
    g.fillStyle = '#7a6a88';
    g.fillText('EVIL PRAISE', w - 200, h / 2 + 8);
  });
}

function vendingTex() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#f4f7fb';
    g.fillRect(0, 0, w, h);
    const cans = ['#e63946', '#2a9d8f', '#f4a261', '#264653', '#ffffff', '#8ecae6', '#ffb703', '#6a4c93'];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 6; i++) {
        const x = 16 + i * 38;
        const y = 24 + row * 78;
        g.fillStyle = cans[(row * 3 + i * 5) % cans.length];
        g.fillRect(x, y, 26, 46);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(x + 4, y + 4, 5, 38);
        g.fillStyle = '#ff3355';
        g.fillRect(x + 6, y + 54, 14, 6);
      }
    }
    g.fillStyle = '#20232a';
    g.fillRect(20, 360, w - 40, 40);
    g.fillStyle = '#1a1a1a';
    g.fillRect(30, 430, w - 60, 56);
  });
}

function shojiTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffd89a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,40,20,0.75)';
    g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke();
    }
    for (let i = 0; i <= 3; i++) {
      g.beginPath(); g.moveTo(0, (i * h) / 3); g.lineTo(w, (i * h) / 3); g.stroke();
    }
  });
}

function stopTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = 'rgba(240,240,240,0.85)';
    g.font = `bold 170px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('止まれ', w / 2, h / 2 + 10);
  });
}

function hintTex() {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = 'rgba(255,240,246,0.92)';
    g.beginPath();
    g.roundRect(8, 8, w - 16, h - 16, 56);
    g.fill();
    g.strokeStyle = '#ff7aa8';
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = '#5a2340';
    g.font = `64px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('✉ 点我收信', w / 2, h / 2 + 4);
  });
}

function envelopeTex() {
  return canvasTex(512, 340, (g, w, h) => {
    g.fillStyle = '#f7eedb';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9b48f';
    g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.beginPath();
    g.moveTo(6, 6); g.lineTo(w / 2, h * 0.58); g.lineTo(w - 6, 6);
    g.stroke();
    // 樱花纹
    g.fillStyle = 'rgba(255,140,175,0.55)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.ellipse(70 + Math.cos(a) * 16, 270 + Math.sin(a) * 16, 13, 9, a, 0, Math.PI * 2);
      g.fill();
    }
    // 封蜡
    g.fillStyle = '#c0283f';
    g.beginPath();
    g.arc(w / 2, h * 0.58, 42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fbe4e8';
    g.font = `bold 52px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('夸', w / 2, h * 0.58 + 3);
  });
}

/* ---------------- 场景 ---------------- */
export class StreetScene {
  constructor(container, { onPersonClick, onAmbience } = {}) {
    this.container = container;
    this.onPersonClick = onPersonClick;
    this.onAmbience = onAmbience;
    this.time = 0;
    this.last = performance.now();
    this.wind = 0; // 额外阵风，0~1
    this.mouse = new THREE.Vector2();
    this.camSway = new THREE.Vector2();
    this.flights = [];
    this.disposables = [];
    this.textures = [];
    this.pools = []; // 地上的光斑，夜里才明显
    this.nightLit = []; // 夜里更亮的自发光材质 { mat, day, night }

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#3a2b52', 22, 70);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    this.camBase = new THREE.Vector3(-0.6, 2.5, 13.2);
    this.lookAt = new THREE.Vector3(-0.8, 2.3, -1);
    this.mobile = window.matchMedia('(pointer: coarse)').matches;

    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildKonbini();
    this.buildPerson();
    this.buildCat();
    this.buildHouses();
    this.buildPoles();
    this.buildTrees();
    this.buildPetals();
    this.buildClouds();
    this.buildRain();
    this.buildEnvelope();

    this.amb = ambienceAt();
    this.ambTimer = 0;
    this.applyAmbience(1);
    this.onAmbience?.(this.amb);

    this.raycaster = new THREE.Raycaster();
    this.hover = false;
    this.bindEvents();
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /* ---------- 工具 ---------- */
  tex(t) { this.textures.push(t); return t; }
  mat(m) { this.disposables.push(m); return m; }
  geo(g) { this.disposables.push(g); return g; }
  lambert(color, extra = {}) { return this.mat(new THREE.MeshLambertMaterial({ color, ...extra })); }
  basic(opts) { return this.mat(new THREE.MeshBasicMaterial(opts)); }
  /** 夜里发光、白天变成普通颜色的材质 */
  glowing(opts, day = '#c9ccd2') {
    const m = this.basic(opts);
    this.nightLit.push({ mat: m, day: new THREE.Color(day), night: new THREE.Color(opts.color || '#ffffff') });
    return m;
  }
  box(w, h, d, material, x = 0, y = 0, z = 0, parent = this.scene) {
    const m = new THREE.Mesh(this.geo(new THREE.BoxGeometry(w, h, d)), material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  lightPool(x, z, size, color, y = 0.02, dayLevel = 0) {
    const mat = this.basic({
      map: this.tex(radialTex(color)),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const m = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(size, size)), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    this.scene.add(m);
    this.pools.push({ mat, dayLevel });
    return m;
  }

  /* ---------- 天空 ---------- */
  buildSky() {
    this.skyMat = this.mat(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color() },
        mid: { value: new THREE.Color() },
        bottom: { value: new THREE.Color() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vP;
        void main() {
          vP = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
        varying vec3 vP;
        void main() {
          float h = vP.y;
          vec3 c = mix(bottom, mid, smoothstep(-0.02, 0.14, h));
          c = mix(c, top, smoothstep(0.14, 0.55, h));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    this.scene.add(new THREE.Mesh(this.geo(new THREE.SphereGeometry(150, 32, 16)), this.skyMat));

    // 星星
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rand(0, Math.PI * 2);
      const ph = rand(0.12, 1.4);
      pos.set([Math.cos(th) * Math.cos(ph) * 140, Math.sin(ph) * 140, Math.sin(th) * Math.cos(ph) * 140], i * 3);
    }
    const sg = this.geo(new THREE.BufferGeometry());
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = this.mat(new THREE.PointsMaterial({
      color: '#ffffff', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    this.scene.add(new THREE.Points(sg, this.starMat));

    // 太阳 / 月亮共用一个圆盘
    this.orbMat = this.basic({ color: '#fff4e0', fog: false, transparent: true });
    this.orb = new THREE.Mesh(this.geo(new THREE.CircleGeometry(4, 40)), this.orbMat);
    this.scene.add(this.orb);
    this.haloMat = this.mat(new THREE.SpriteMaterial({
      map: this.tex(radialTex('rgba(255,235,215,0.6)')), fog: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.halo = new THREE.Sprite(this.haloMat);
    this.scene.add(this.halo);

    // 远山剪影
    const shape = new THREE.Shape();
    shape.moveTo(-160, 0);
    for (let x = -160; x <= 160; x += 8) shape.lineTo(x, 9 + Math.sin(x * 0.05) * 5 + Math.sin(x * 0.13) * 2.5);
    shape.lineTo(160, 0);
    const hills = new THREE.Mesh(this.geo(new THREE.ShapeGeometry(shape)), this.lambert('#3a3450'));
    hills.position.set(0, -1, -95);
    this.scene.add(hills);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#7b78c8', '#2b2034', 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#aabaff', 0.7);
    this.scene.add(this.sun);
    this.storeLight = new THREE.PointLight('#f2f8ff', 40, 14, 2);
    this.storeLight.position.set(0, 2.4, 1.2);
    this.scene.add(this.storeLight);
    this.lampLight = new THREE.PointLight('#ffc77a', 30, 12, 2);
    this.lampLight.position.set(8, 5.6, 1.2);
    this.scene.add(this.lampLight);
  }

  /* ---------- 地面 ---------- */
  buildGround() {
    const ground = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(200, 200)), this.lambert('#3a3640'));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    this.box(200, 0.12, 2.4, this.lambert('#7a7584'), 0, 0.06, 0); // 便利店侧人行道
    this.box(200, 0.14, 0.18, this.lambert('#a09aa8'), 0, 0.07, 1.25); // 路缘石
    this.box(200, 0.12, 2, this.lambert('#6a6672'), 0, 0.06, 8.6); // 近侧人行道

    const dash = this.lambert('#e6e1d4', { emissive: '#2a2620' });
    for (let x = -60; x < 60; x += 4) this.box(2, 0.01, 0.12, dash, x, 0.005, 4.4);
    this.box(200, 0.01, 0.1, dash, 0, 0.005, 1.6);
    this.box(200, 0.01, 0.1, dash, 0, 0.005, 7.4);

    // 地上的“止まれ”
    const stop = new THREE.Mesh(
      this.geo(new THREE.PlaneGeometry(2.2, 1.1)),
      this.mat(new THREE.MeshLambertMaterial({ map: this.tex(stopTex()), transparent: true, depthWrite: false, emissive: '#222' })),
    );
    stop.rotation.x = -Math.PI / 2;
    stop.position.set(3.2, 0.012, 3.0);
    this.scene.add(stop);

    this.lightPool(0, 0.4, 11, 'rgba(220,235,255,0.55)', 0.13, 0.15);
    this.lightPool(0, 3.5, 12, 'rgba(200,220,255,0.22)');
    this.lightPool(8, 1.6, 8, 'rgba(255,190,110,0.45)', 0.13);
    this.lightPool(5.2, 0.2, 3, 'rgba(255,255,255,0.4)', 0.13, 0.1);
  }

  /* ---------- 便利店 ---------- */
  buildKonbini() {
    const g = new THREE.Group();
    g.position.set(0, 0, -3.5);
    this.scene.add(g);
    this.box(9.4, 3.6, 5, this.lambert('#e2ddd5'), 0, 1.8, 0, g);
    this.box(9.8, 0.25, 5.4, this.lambert('#6c6a74'), 0, 3.72, 0, g);
    const plain = this.lambert('#eee');
    this.box(9.4, 0.9, 0.3, [plain, plain, plain, plain, this.glowing({ map: this.tex(signTex()) }, '#e8e8e8'), plain], 0, 3.2, 2.62, g);
    const stripe = (c, y) => this.box(9.4, 0.12, 0.05, this.basic({ color: c }), 0, y, 2.53, g);
    stripe('#ff7aa8', 2.67);
    stripe('#ffffff', 2.55);
    stripe('#7a5cff', 2.43);
    const glass = (tex, w, x) => {
      const m = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(w, 2.15)), this.glowing({ map: tex }, '#b8c2cc'));
      m.position.set(x, 1.38, 2.51);
      g.add(m);
    };
    glass(this.tex(shelfTex(3)), 3.2, -2.85);
    glass(this.tex(shelfTex(8)), 3.2, 2.85);
    glass(this.tex(shelfTex(5)), 1.9, 0);
    const frame = this.lambert('#55535c');
    for (const x of [-4.5, -1.2, -0.02, 1.2, 4.5]) this.box(0.08, 2.2, 0.08, frame, x, 1.38, 2.53, g);
    this.box(9.2, 0.1, 0.08, frame, 0, 2.48, 2.53, g);
    this.box(9.2, 0.28, 0.1, frame, 0, 0.14, 2.53, g);
    // 门口台阶（那个人坐的地方）
    this.box(9.4, 0.3, 0.6, this.lambert('#a8a3b0'), 0, 0.15, 2.8, g);
    for (const [x, c] of [[3.6, '#3f7ae0'], [4.1, '#e0483f']]) {
      this.box(0.42, 0.75, 0.42, this.lambert(c), x, 0.68, 2.85, g);
      this.box(0.46, 0.06, 0.46, this.lambert('#eee'), x, 1.07, 2.85, g);
    }
    // 靠在墙边的一把透明伞
    const umb = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6)), this.lambert('#e8eef4'));
    umb.position.set(-4.2, 0.75, -0.75);
    umb.rotation.z = 0.15;
    this.scene.add(umb);

    // 自动贩卖机
    const vm = new THREE.Group();
    vm.position.set(5.4, 0.12, -0.6);
    this.scene.add(vm);
    this.box(1, 1.9, 0.8, this.lambert('#c7303f'), 0, 0.95, 0, vm);
    const vf = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(0.84, 1.7)), this.glowing({ map: this.tex(vendingTex()) }, '#c4c8cc'));
    vf.position.set(0, 0.95, 0.41);
    vm.add(vf);
  }

  /* ---------- 坐在门口的人 ---------- */
  buildPerson() {
    const person = new Person({
      lambert: this.lambert.bind(this),
      geo: this.geo.bind(this),
      mat: this.mat.bind(this),
      tex: this.tex.bind(this),
      box: this.box.bind(this),
      canvasTex,
    });
    person.group.position.set(-2.4, 0.3, -0.75);
    person.group.rotation.y = 0.55;
    person.group.scale.setScalar(1.2);
    this.scene.add(person.group);
    person.attachSteam(this.scene);
    this.person = person;

    // 透明的点击热区
    const hit = new THREE.Mesh(
      this.geo(new THREE.BoxGeometry(1.1, 1.5, 1.1)),
      this.basic({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hit.position.set(0.1, 0.4, 0.2);
    person.group.add(hit);
    this.hitTarget = hit;

    const hint = new THREE.Sprite(this.mat(new THREE.SpriteMaterial({ map: this.tex(hintTex()), transparent: true, depthWrite: false })));
    hint.scale.set(1.4, 0.35, 1);
    hint.position.set(-2.4, 2.05, -0.6);
    this.scene.add(hint);
    this.hint = hint;
  }

  buildCat() {
    const c = new THREE.Group();
    c.position.set(-1.6, 0.3, -0.8);
    c.rotation.y = -0.6;
    this.scene.add(c);
    const fur = this.lambert('#16141c');
    const body = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.13, 12, 10)), fur);
    body.scale.set(1, 1.2, 1.1);
    body.position.y = 0.13;
    c.add(body);
    const head = new THREE.Group();
    head.position.set(0, 0.33, 0.05);
    c.add(head);
    head.add(new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.09, 12, 10)), fur));
    this.catHead = head;
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(this.geo(new THREE.ConeGeometry(0.035, 0.07, 4)), fur);
      ear.position.set(s * 0.05, 0.09, -0.01);
      ear.rotation.z = s * -0.3;
      head.add(ear);
      const eye = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.014, 6, 6)), this.basic({ color: '#d8ff6a' }));
      eye.position.set(s * 0.035, 0.01, 0.08);
      head.add(eye);
    }
    const tail = new THREE.Group();
    tail.position.set(0, 0.05, -0.12);
    c.add(tail);
    const t = new THREE.Mesh(this.geo(new THREE.CapsuleGeometry(0.022, 0.3, 4, 6)), fur);
    t.position.set(0, 0.02, -0.15);
    t.rotation.x = 1.3;
    tail.add(t);
    this.catTail = tail;
  }

  /* ---------- 周围的民家 ---------- */
  buildHouses() {
    const lit = this.glowing({ map: this.tex(shojiTex()) }, '#8c8478');
    const dark = this.lambert('#2a2834');
    const walls = ['#6a6470', '#5a5866', '#74685e', '#5a6270'].map((c) => this.lambert(c));
    const roofs = ['#3b3d4c', '#4a3436', '#334052'].map((c) => this.lambert(c, { flatShading: true }));

    const house = (x, z, w, h, d, i) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.box(w, h, d, walls[i % walls.length], 0, h / 2, 0, g);
      const roof = new THREE.Mesh(this.geo(new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4)), roofs[i % roofs.length]);
      roof.scale.set((w / Math.SQRT2) * 1.25, 1.2, (d / Math.SQRT2) * 1.25);
      roof.position.y = h + 0.6;
      g.add(roof);
      const floors = Math.max(1, Math.round(h / 2.4));
      for (let f = 0; f < floors; f++) {
        for (let k = -1; k <= 1; k += 2) {
          const win = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(w * 0.26, 0.8)), Math.random() < 0.55 ? lit : dark);
          win.position.set(k * w * 0.22, 1.3 + f * 2.2, d / 2 + 0.01);
          g.add(win);
        }
      }
    };
    [
      [-9.5, -3.6, 5, 4.6, 5],
      [-15.5, -3.2, 6, 5.2, 5.5],
      [-22, -3.8, 5.5, 3.8, 5],
      [10.5, -3.5, 5, 5, 5],
      [16.5, -3.4, 6, 4, 5],
      [23, -3.6, 5, 5.6, 5],
      [-4, -12, 7, 6, 6],
      [6, -13, 8, 7, 6],
      [-14, -13, 7, 5, 6],
      [17, -14, 7, 6, 6],
    ].forEach((s, i) => house(...s, i));

    // 民家门口的红灯笼
    const lanternMat = this.glowing({ color: '#ff5a4a' }, '#c04a40');
    for (const x of [-10.8, -8.2]) {
      const l = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.22, 12, 10)), lanternMat);
      l.scale.y = 1.35;
      l.position.set(x, 2.3, -0.95);
      this.scene.add(l);
      this.box(0.18, 0.06, 0.18, this.lambert('#111'), x, 2.62, -0.95);
      this.lightPool(x, -0.4, 2.6, 'rgba(255,90,70,0.35)', 0.13);
    }
  }

  /* ---------- 电线杆 & 路灯 ---------- */
  buildPoles() {
    const poleMat = this.lambert('#8f8a90');
    const xs = [-19, -7, 8, 21];
    for (const x of xs) {
      const p = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.1, 0.14, 8, 8)), poleMat);
      p.position.set(x, 4, 0.9);
      this.scene.add(p);
      this.box(1.6, 0.1, 0.1, poleMat, x, 7.4, 0.9);
      this.box(1.2, 0.08, 0.08, poleMat, x, 6.8, 0.9);
    }
    const tr = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.25, 0.25, 0.7, 10)), this.lambert('#9a9aa0'));
    tr.position.set(-6.7, 5.8, 1.15);
    this.scene.add(tr);

    const wireMat = this.mat(new THREE.LineBasicMaterial({ color: '#1a1820' }));
    const wire = (a, b, sag) => {
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= sag;
      const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(24);
      this.scene.add(new THREE.Line(this.geo(new THREE.BufferGeometry().setFromPoints(pts)), wireMat));
    };
    for (let i = 0; i < xs.length - 1; i++) {
      for (const [y, dx] of [[7.45, -0.7], [7.45, 0.7], [6.85, -0.5], [6.85, 0.5]]) {
        wire(new THREE.Vector3(xs[i] + dx, y, 0.9), new THREE.Vector3(xs[i + 1] + dx, y, 0.9), 0.9);
      }
    }
    wire(new THREE.Vector3(8.7, 7.45, 0.9), new THREE.Vector3(14, 8.5, 20), 1.4);

    // 挂在电线杆上的路灯
    this.box(0.9, 0.06, 0.06, poleMat, 8.4, 5.9, 1.1);
    const head = new THREE.Mesh(this.geo(new THREE.BoxGeometry(0.5, 0.08, 0.22)), this.glowing({ color: '#fff0cc' }, '#bdbab4'));
    head.position.set(8.85, 5.83, 1.1);
    this.scene.add(head);
    this.lampGlow = new THREE.Sprite(this.mat(new THREE.SpriteMaterial({
      map: this.tex(radialTex('rgba(255,210,140,0.7)')), depthWrite: false, blending: THREE.AdditiveBlending,
    })));
    this.lampGlow.scale.setScalar(2.4);
    this.lampGlow.position.copy(head.position);
    this.scene.add(this.lampGlow);
  }

  /* ---------- 樱花树 ---------- */
  buildTrees() {
    const bark = this.lambert('#4a3436');
    this.blossomMats = ['#ffb7cf', '#f9a0bf', '#ffd0df', '#f48fb1', '#ffc4d6'].map((c) =>
      this.lambert(c, { flatShading: true, emissive: '#5a1f36' }),
    );
    const blob = this.geo(new THREE.IcosahedronGeometry(1, 1));
    this.canopies = [];

    const tree = (x, z, s) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.scale.setScalar(s);
      this.scene.add(g);
      const trunk = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.13, 0.24, 2.4, 7)), bark);
      trunk.position.y = 1.2;
      trunk.rotation.z = rand(-0.08, 0.08);
      g.add(trunk);
      for (let i = 0; i < 4; i++) {
        const br = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.05, 0.1, 1.6, 6)), bark);
        const a = (i / 4) * Math.PI * 2 + rand(-0.3, 0.3);
        br.position.set(Math.cos(a) * 0.45, 2.7, Math.sin(a) * 0.45);
        br.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8);
        g.add(br);
      }
      const canopy = new THREE.Group();
      canopy.position.y = 2.2;
      g.add(canopy);
      for (let i = 0; i < 22; i++) {
        const m = new THREE.Mesh(blob, this.blossomMats[i % this.blossomMats.length]);
        const a = rand(0, Math.PI * 2);
        const r = rand(0, 1.9);
        m.position.set(Math.cos(a) * r, rand(0.6, 2.0) - r * 0.2, Math.sin(a) * r);
        m.scale.setScalar(rand(0.45, 0.85));
        m.rotation.set(rand(0, 3), rand(0, 3), 0);
        canopy.add(m);
      }
      this.canopies.push({ g: canopy, phase: rand(0, 6) });
    };
    tree(-6.2, -1.4, 1.1);
    tree(-13, -1.2, 1);
    tree(13.2, -1.5, 1.15);
    tree(19, -1.3, 0.95);

    // 地上的落花
    const n = 450;
    const petals = new THREE.InstancedMesh(
      this.petalGeo(),
      this.mat(new THREE.MeshLambertMaterial({ color: '#ffc6d8', side: THREE.DoubleSide, emissive: '#55223a' })),
      n,
    );
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      d.position.set(rand(-18, 18), 0.135, rand(-1.15, 1.15));
      if (i % 3 === 0) d.position.set(rand(-14, 14), 0.01, rand(1.3, 9.5));
      d.rotation.set(-Math.PI / 2, 0, rand(0, 6.3));
      d.scale.setScalar(rand(0.8, 1.4));
      d.updateMatrix();
      petals.setMatrixAt(i, d.matrix);
    }
    this.scene.add(petals);
  }

  petalGeo() {
    if (this._petalGeo) return this._petalGeo;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.075, 0.05, 0.045, 0.13);
    s.lineTo(0, 0.11);
    s.lineTo(-0.045, 0.13);
    s.quadraticCurveTo(-0.075, 0.05, 0, 0);
    this._petalGeo = this.geo(new THREE.ShapeGeometry(s));
    this._petalGeo.translate(0, -0.06, 0);
    return this._petalGeo;
  }

  /* ---------- 飘落的樱花 ---------- */
  buildPetals() {
    const n = this.mobile ? 420 : 900;
    this.petalCount = n;
    this.petalMat = this.basic({ side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(this.petalGeo(), this.petalMat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const palette = ['#ffd6e4', '#ffc0d4', '#ffb0c8', '#fff0f5', '#f7a6c2'].map((c) => new THREE.Color(c));
    this.petalData = [];
    for (let i = 0; i < n; i++) {
      mesh.setColorAt(i, palette[i % palette.length]);
      this.petalData.push(this.spawnPetal({}, true));
    }
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.petals = mesh;
    this._d = new THREE.Object3D();
  }

  spawnPetal(p, anywhere) {
    p.x = anywhere ? rand(-18, 18) : rand(-26, -16);
    p.y = anywhere ? rand(0, 10) : rand(1, 11);
    p.z = rand(-5, 10.5);
    p.fall = rand(0.25, 0.6);
    p.drift = rand(0.6, 1.4);
    p.phase = rand(0, 6.3);
    p.spin = new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-3, 3));
    p.rot = new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6));
    p.size = rand(0.7, 1.3);
    return p;
  }

  updatePetals(dt, t, gust) {
    const d = this._d;
    const heavy = this.amb.rain ? 1.8 : 1; // 下雨时花瓣落得快一些
    for (let i = 0; i < this.petalCount; i++) {
      const p = this.petalData[i];
      p.x += (1.1 * gust * p.drift + Math.sin(t * 0.9 + p.phase) * 0.35) * dt;
      p.y += (-p.fall * heavy + Math.sin(t * 2.1 + p.phase) * 0.25 + this.wind * 0.6) * dt;
      p.z += (Math.cos(t * 0.7 + p.phase) * 0.3 + 0.12 * gust) * dt;
      p.rot.x += p.spin.x * dt * gust;
      p.rot.y += p.spin.y * dt;
      p.rot.z += p.spin.z * dt;
      if (p.x > 22 || p.y < 0.05 || p.z > 11.5) this.spawnPetal(p, false);
      d.position.set(p.x, p.y, p.z);
      d.rotation.copy(p.rot);
      d.scale.setScalar(p.size);
      d.updateMatrix();
      this.petals.setMatrixAt(i, d.matrix);
    }
    this.petals.instanceMatrix.needsUpdate = true;
  }

  /* ---------- 云 ---------- */
  buildClouds() {
    const tex = this.tex(radialTex('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)'));
    this.cloudMat = this.mat(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    this.clouds = Array.from({ length: 18 }, () => {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Sprite(this.cloudMat);
        s.position.set(rand(-9, 9), rand(-1.2, 1.5), rand(-2, 2));
        s.scale.set(rand(10, 18), rand(5, 8), 1);
        g.add(s);
      }
      g.position.set(rand(-110, 110), rand(30, 55), rand(-105, -70));
      g.userData.speed = rand(0.6, 1.4);
      g.visible = false;
      this.scene.add(g);
      return g;
    });
  }

  /* ---------- 雨 ---------- */
  buildRain() {
    const n = this.mobile ? 700 : 1600;
    this.rainData = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.rainData.set([rand(-16, 16), rand(0, 14), rand(-6, 11)], i * 3);
    const g = this.geo(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.rainMat = this.mat(new THREE.LineBasicMaterial({ color: '#dfe8f5', transparent: true, opacity: 0, depthWrite: false }));
    this.rain = new THREE.LineSegments(g, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    this.rainCount = n;
  }

  updateRain(dt, gust) {
    const target = this.amb.rain ? 0.6 : 0;
    this.rainMat.opacity += (target - this.rainMat.opacity) * Math.min(1, dt * 0.8);
    this.rain.visible = this.rainMat.opacity > 0.01;
    if (!this.rain.visible) return;
    const pos = this.rain.geometry.attributes.position.array;
    const d = this.rainData;
    const vx = 1.2 * gust;
    const vy = -11;
    for (let i = 0; i < this.rainCount; i++) {
      const k = i * 3;
      d[k] += vx * dt;
      d[k + 1] += vy * dt;
      if (d[k + 1] < 0) {
        d[k] = rand(-18, 16);
        d[k + 1] = rand(12, 15);
        d[k + 2] = rand(-6, 11);
      }
      const j = i * 6;
      pos[j] = d[k]; pos[j + 1] = d[k + 1]; pos[j + 2] = d[k + 2];
      pos[j + 3] = d[k] - vx * 0.045; pos[j + 4] = d[k + 1] - vy * 0.045; pos[j + 5] = d[k + 2];
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------- 时间 & 天气 ---------- */
  /** k: 向目标过渡的比例（1 = 立刻到位） */
  applyAmbience(k) {
    const a = this.amb;
    const L = (x, y) => x + (y - x) * k;
    const u = this.skyMat.uniforms;
    u.top.value.lerp(a.top, k);
    u.mid.value.lerp(a.mid, k);
    u.bottom.value.lerp(a.bottom, k);
    this.scene.fog.color.lerp(a.fog, k);
    this.scene.fog.near = L(this.scene.fog.near, a.fogNear);
    this.scene.fog.far = L(this.scene.fog.far, a.fogFar);
    this.hemi.color.lerp(a.hemiSky, k);
    this.hemi.groundColor.lerp(a.hemiGround, k);
    this.hemi.intensity = L(this.hemi.intensity, a.hemiIntensity);
    this.sun.color.lerp(a.sunColor, k);
    this.sun.intensity = L(this.sun.intensity, a.sunIntensity);
    this.renderer.toneMappingExposure = L(this.renderer.toneMappingExposure, a.exposure);

    const night = (this.night = L(this.night ?? a.night, a.night));
    const lampOn = Math.max(0, night - 0.2) / 0.8;
    this.starMat.opacity = L(this.starMat.opacity, a.starOpacity);
    this.storeLight.intensity = 8 + 34 * night;
    this.lampLight.intensity = 30 * lampOn;
    this.lampGlow.material.opacity = lampOn;
    for (const p of this.pools) p.mat.opacity = Math.max(p.dayLevel, night);
    for (const g of this.nightLit) g.mat.color.copy(g.day).lerp(g.night, Math.min(1, night * 1.3));
    for (const m of this.blossomMats) m.emissiveIntensity = 0.25 + 0.75 * night;
    this.petalMat.color.setScalar(0.85 + 0.15 * (1 - night));

    // 太阳 / 月亮：东边（左）升起，西边（右）落下
    this.orb.position.set(-Math.cos(a.sunArc) * 80, Math.sin(a.sunArc) * 50 + 4, -110);
    this.orb.lookAt(this.camera.position);
    this.orb.scale.setScalar(a.isDay ? 1.2 : 1);
    this.orbMat.color.set(a.isDay ? (night > 0.15 ? '#ffb27a' : '#fff6dc') : '#fff2dc');
    const orbVisible = a.weather === 'rain' ? 0 : a.weather === 'cloudy' ? 0.45 : 1;
    this.orbMat.opacity = L(this.orbMat.opacity, orbVisible);
    this.halo.position.copy(this.orb.position);
    this.halo.scale.setScalar(a.isDay ? 40 : 30);
    this.haloMat.opacity = this.orbMat.opacity;
    // 光从镜头这一侧斜照过来，不然房子正面全是背光
    this.sun.position.set(-Math.cos(a.sunArc) * 25, Math.sin(a.sunArc) * 25 + 6, 18);

    this.cloudMat.color.lerp(a.cloudColor, k);
    this.cloudMat.opacity = L(this.cloudMat.opacity, a.rain ? 0.95 : 0.75);
    this.clouds.forEach((c, i) => (c.visible = i < a.clouds));
  }

  /* ---------- 信笺 ---------- */
  buildEnvelope() {
    const env = new THREE.Mesh(
      this.geo(new THREE.PlaneGeometry(0.5, 0.33)),
      this.basic({ map: this.tex(envelopeTex()), side: THREE.DoubleSide, transparent: true }),
    );
    env.visible = false;
    this.scene.add(env);
    this.envelope = env;
  }

  /** 让一封信笺从门口那人手边乘风飘到你面前 */
  flyIn() {
    const pts = [
      new THREE.Vector3(-2.3, 0.75, -0.3),
      new THREE.Vector3(-1.6, 2.4, 0.6),
      new THREE.Vector3(0.6, 3.1, 2.6),
      new THREE.Vector3(1.6, 2.6, 5.6),
      new THREE.Vector3(0.2, 2.25, 8.1),
      this.endPoint(),
    ];
    return this.fly(new THREE.CatmullRomCurve3(pts), 3.1, { grow: true });
  }

  /** 写好的信笺被风吹走 */
  flyAway() {
    const pts = [
      this.endPoint(),
      new THREE.Vector3(1.4, 2.6, 6.8),
      new THREE.Vector3(4.6, 4.2, 2.5),
      new THREE.Vector3(9, 6.5, -3),
      new THREE.Vector3(17, 10, -12),
    ];
    return this.fly(new THREE.CatmullRomCurve3(pts), 3.4, { fade: true });
  }

  endPoint() {
    const p = this.camera.position.clone();
    const dir = this.lookAt.clone().sub(p).normalize();
    return p.add(dir.multiplyScalar(2.3)).add(new THREE.Vector3(0, -0.05, 0));
  }

  fly(curve, duration, opts) {
    this.wind = 1;
    this.flights.forEach((f) => f.resolve());
    return new Promise((resolve) => {
      this.flights = [{ curve, duration, t: 0, resolve, ...opts }];
      this.envelope.visible = true;
      this.envelope.material.opacity = 1;
    });
  }

  updateFlight(dt, time) {
    const f = this.flights[0];
    const env = this.envelope;
    if (!f) {
      if (env.visible) {
        env.material.opacity -= dt * 2.5;
        if (env.material.opacity <= 0) env.visible = false;
      }
      return;
    }
    f.t += dt;
    const u = Math.min(f.t / f.duration, 1);
    const e = easeInOut(u);
    env.position.copy(f.curve.getPointAt(e));
    env.lookAt(this.camera.position);
    const k = f.grow ? 1 - e : 0.4 + e;
    env.rotateZ(Math.sin(time * 3.3) * 0.6 * k);
    env.rotateX(Math.cos(time * 4.1) * 0.7 * k);
    env.rotateY(Math.sin(time * 5.2) * 0.8 * k);
    env.scale.setScalar(f.grow ? 0.35 + 0.65 * e : 1);
    if (f.fade) env.material.opacity = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
    if (u >= 1) {
      this.flights = [];
      if (f.fade) env.visible = false;
      f.resolve();
    }
  }

  /* ---------- 交互 ---------- */
  bindEvents() {
    const el = this.renderer.domElement;
    this._onResize = () => this.resize();
    this._onMove = (e) => {
      const r = el.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.hover = this.pick();
      el.style.cursor = this.hover ? 'pointer' : 'default';
    };
    this._onClick = (e) => {
      this._onMove(e);
      if (!this.hover) return;
      this.person.wave();
      this.onPersonClick?.();
    };
    window.addEventListener('resize', this._onResize);
    el.addEventListener('pointermove', this._onMove);
    el.addEventListener('click', this._onClick);
  }

  pick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObject(this.hitTarget, false).length > 0;
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;
    // 保证横向至少能看到便利店 + 门口那个人
    const halfH = Math.atan(0.6);
    this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(halfH) / aspect)), 42, 78);
    // 竖屏时把镜头往人身上偏一点
    this.camBase.x = aspect < 1 ? -1.6 : -0.6;
    this.lookAt.x = aspect < 1 ? -1.6 : -0.8;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  tick() {
    const now = performance.now();
    const realDt = Math.min((now - this.last) / 1000, 0.25);
    const dt = Math.min(realDt, 0.05);
    this.last = now;
    const t = (this.time += dt);
    this.wind = Math.max(0, this.wind - dt * 0.35);
    const gust = 1 + Math.sin(t * 0.35) * 0.45 + Math.sin(t * 1.3) * 0.15 + this.wind * 3.5;

    // 每 5 秒重新取一次时间/天气，然后慢慢过渡过去
    this.ambTimer -= dt;
    if (this.ambTimer <= 0) {
      this.ambTimer = 5;
      const prev = this.amb;
      this.amb = ambienceAt();
      if (prev.phase !== this.amb.phase || prev.weather !== this.amb.weather) this.onAmbience?.(this.amb);
    }
    this.applyAmbience(Math.min(1, dt * 0.6));

    // 镜头随鼠标轻微晃动 + 呼吸感
    this.camSway.lerp(this.mouse, 0.04);
    this.camera.position.set(
      this.camBase.x + this.camSway.x * 0.45,
      this.camBase.y + this.camSway.y * 0.18 + Math.sin(t * 0.5) * 0.03,
      this.camBase.z,
    );
    this.camera.lookAt(this.lookAt);

    for (const c of this.canopies) {
      const s = 0.02 + 0.012 * gust + this.wind * 0.04;
      c.g.rotation.z = Math.sin(t * 0.9 + c.phase) * s - 0.02;
      c.g.rotation.x = Math.cos(t * 0.7 + c.phase) * s * 0.6;
    }
    for (const c of this.clouds) {
      if (!c.visible) continue;
      c.position.x += c.userData.speed * gust * dt * 0.8;
      if (c.position.x > 120) c.position.x = -120;
    }

    this.person.update(dt, t);
    const petting = this.person.pettingCat;
    this.catTail.rotation.y = Math.sin(t * (petting ? 4 : 1.4)) * (petting ? 0.9 : 0.6);
    this.catHead.rotation.z = petting ? Math.sin(t * 3) * 0.15 : 0;

    const flying = this.flights.length > 0;
    this.hint.position.y = 2.05 + Math.sin(t * 2) * 0.05;
    this.hint.material.opacity += ((flying ? 0 : 1) - this.hint.material.opacity) * 0.1;
    const hk = this.hover ? 1.12 : 1;
    this.hint.scale.set(1.4 * hk, 0.35 * hk, 1);

    this.updatePetals(dt, t, gust);
    this.updateRain(dt, gust);
    this.updateFlight(realDt, t); // 信笺按真实时间飞，低帧率设备也不会让人干等
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this._onResize);
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this._onMove);
    el.removeEventListener('click', this._onClick);
    this.flights.forEach((f) => f.resolve());
    this.disposables.forEach((d) => d.dispose());
    this.textures.forEach((x) => x.dispose());
    this.renderer.dispose();
    el.remove();
  }
}
