/* ── 核心逻辑：完全保留你原有的 541 行 JS ── */
let diceCount=2, busy=false;
let comboCount=0;
const HUES=[230,320,0,150,45,270];

function getDieSize(){ return Math.round(Math.min(window.innerWidth, window.innerHeight*1.6) * 0.2); }
function setDieSizeVar(){ const s=getDieSize(); document.documentElement.style.setProperty('--ds', s+'px'); }
setDieSizeVar();
window.addEventListener('resize',()=>{ setDieSizeVar(); initDice(); });

function setCount(n){
  diceCount=n;
  document.getElementById('b1').classList.toggle('on',n===1);
  document.getElementById('b2').classList.toggle('on',n===2);
  initDice();
}

function drawRealisticDie(canvas, val, hue){
  const S=getDieSize()*2; canvas.width=S; canvas.height=S;
  const ctx=canvas.getContext('2d'); const R=S*0.12;
  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }
  const pad=S*0.04, thick=S*0.07;
  ctx.fillStyle='rgba(0,0,0,.3)'; rr(pad+thick+4,pad+thick+4,S-pad*2-thick,S-pad*2-thick,R); ctx.fill();
  ctx.fillStyle=`hsl(${hue},55%,20%)`; rr(pad+thick,pad+thick,S-pad*2-thick,S-pad*2-thick,R); ctx.fill();
  ctx.fillStyle=`hsl(${hue},50%,32%)`; rr(pad,pad+thick*.5,S-pad*2-thick,S-pad*2-thick,R); ctx.fill();
  const g=ctx.createLinearGradient(pad,pad,S-pad,S-pad);
  g.addColorStop(0,`hsl(${hue},62%,75%)`); g.addColorStop(0.35,`hsl(${hue},58%,63%)`); g.addColorStop(0.7,`hsl(${hue},52%,50%)`); g.addColorStop(1,`hsl(${hue},56%,38%)`);
  ctx.fillStyle=g; rr(pad,pad,S-pad*2-thick,S-pad*2-thick,R); ctx.fill();
  const sheen=ctx.createRadialGradient(S*.22,S*.2,0,S*.3,S*.3,S*.52); sheen.addColorStop(0,'rgba(255,255,255,.4)'); sheen.addColorStop(.55,'rgba(255,255,255,.07)'); sheen.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sheen; rr(pad,pad,S-pad*2-thick,S-pad*2-thick,R); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=2; rr(pad,pad,S-pad*2-thick,S-pad*2-thick,R); ctx.stroke();
  const fc=S/2-thick*.5; const o=S*.245, dr=S*.063;
  const pts={ 1:[[fc,fc]], 2:[[fc-o,fc-o],[fc+o,fc+o]], 3:[[fc-o,fc-o],[fc,fc],[fc+o,fc+o]], 4:[[fc-o,fc-o],[fc+o,fc-o],[fc-o,fc+o],[fc+o,fc+o]], 5:[[fc-o,fc-o],[fc+o,fc-o],[fc,fc],[fc-o,fc+o],[fc+o,fc+o]], 6:[[fc-o,fc-o],[fc+o,fc-o],[fc-o,fc],[fc+o,fc],[fc-o,fc+o],[fc+o,fc+o]], };
  (pts[val]||[]).forEach(([cx,cy])=>{ ctx.fillStyle='rgba(0,0,0,.38)'; ctx.beginPath();ctx.arc(cx+dr*.22,cy+dr*.3,dr,0,Math.PI*2);ctx.fill(); const dg=ctx.createRadialGradient(cx-dr*.3,cy-dr*.3,0,cx,cy,dr); dg.addColorStop(0,'rgba(255,255,255,.96)'); dg.addColorStop(.5,'rgba(235,235,255,.86)'); dg.addColorStop(1,'rgba(195,195,230,.7)'); ctx.fillStyle=dg; ctx.beginPath();ctx.arc(cx,cy,dr,0,Math.PI*2);ctx.fill(); });
}

let dieObjects=[];
function initDice(){
  const stage=document.getElementById('stage'); stage.innerHTML=''; dieObjects=[];
  for(let i=0;i<diceCount;i++){
    const hue=HUES[i%HUES.length]; const wrap=document.createElement('div'); wrap.className='die-wrap'; const dieDiv=document.createElement('div'); dieDiv.className='die'; const cv=document.createElement('canvas'); dieDiv.appendChild(cv); const shadow=document.createElement('div'); shadow.className='die-shadow'; wrap.appendChild(dieDiv); wrap.appendChild(shadow); stage.appendChild(wrap); dieObjects.push({wrap,dieDiv,cv,hue}); drawRealisticDie(cv,1,hue);
  }
  document.getElementById('totalArea').style.display='none';
}

document.getElementById('w').addEventListener('click',e=>{
  if(e.target.closest('.btns') || e.target.closest('#cardModal'))return;
  doRoll();
});

function doRoll(){
  if(busy)return; busy=true; document.getElementById('hint').style.display='none'; document.getElementById('totalArea').style.display='none'; dieObjects.forEach(d=>{ d.dieDiv.className='die rolling'; drawRealisticDie(d.cv,Math.ceil(Math.random()*6),d.hue); });
  let t=0; const iv=setInterval(()=>{ t++; dieObjects.forEach(d=>drawRealisticDie(d.cv,Math.ceil(Math.random()*6),d.hue)); if(t>=20){ clearInterval(iv); const vals=dieObjects.map(d=>{ const v=Math.ceil(Math.random()*6); drawRealisticDie(d.cv,v,d.hue); d.dieDiv.className='die land'; return v; }); showResult(vals); busy=false; } },55);
}

function isDouble(vals){ if(vals.length < 2) return false; return vals.every(v=>v===vals[0]); }
function triggerFlash(comboLevel){ const fl=document.getElementById('flashOverlay'); fl.className='flash-overlay'; fl.classList.add(comboLevel>=2?'combo2':'combo1'); void fl.offsetWidth; fl.classList.add('go'); fl.addEventListener('animationend',()=>{ fl.className='flash-overlay'; },{once:true}); }
function triggerDoubleGlow(){ dieObjects.forEach(d=>{ d.dieDiv.classList.remove('double-glow'); void d.dieDiv.offsetWidth; d.dieDiv.classList.add('double-glow'); }); }
function updateComboUI(count){ const area=document.getElementById('comboArea'); const numEl=document.getElementById('comboNum'); const fireEl=document.getElementById('comboFire'); if(count<=0){ area.classList.remove('visible'); return; } numEl.textContent='×'+count; const fires=['🔥','🔥🔥','💥🔥💥']; fireEl.textContent=fires[Math.min(count-1,2)]; area.classList.add('visible'); numEl.classList.remove('bump'); void numEl.offsetWidth; numEl.classList.add('bump'); }

function triggerExplosion(cb){
  const wrap=document.getElementById('explosionWrap'); wrap.style.display='flex'; wrap.innerHTML=`<div class="explosion-ring"></div><div class="explosion-ring"></div><div class="explosion-ring"></div><div class="explosion-text">💥 爆了！</div><div class="explosion-sub">COMBO RESET</div>`; const wEl=document.getElementById('w'); wEl.classList.remove('shake'); void wEl.offsetWidth; wEl.classList.add('shake'); spawnExplosionParticles(); setTimeout(()=>{ wrap.style.display='none'; wrap.innerHTML=''; if(cb) cb(); }, 1500);
}

function spawnExplosionParticles(){
  const items=['💥','✦','★','◆','✸','🔥','⚡','💫']; const cols=['rgba(255,80,0,.95)','rgba(255,200,0,.95)','rgba(255,50,200,.9)','rgba(80,200,255,.9)','rgba(255,255,255,.9)']; for(let i=0;i<30;i++){ setTimeout(()=>{ const el=document.createElement('div'); el.className='sp'; el.textContent=items[Math.floor(Math.random()*items.length)]; el.style.cssText=`left:${5+Math.random()*90}vw;bottom:${10+Math.random()*80}vh;color:${cols[Math.floor(Math.random()*cols.length)]};font-size:${16+Math.random()*28}px`; document.getElementById('w').appendChild(el); setTimeout(()=>el.remove(),750); },i*40); }
}

function showResult(vals){
  const ta=document.getElementById('totalArea'); const tn=document.getElementById('totalNum'); const indiv=document.getElementById('indiv'); const total=vals.reduce((a,b)=>a+b,0); indiv.innerHTML=''; if(vals.length>1){ vals.forEach((v,i)=>{ const s=document.createElement('span'); s.className='iv'+(v===6?' six':''); s.textContent=i===0?`${v}`:` + ${v}`; indiv.appendChild(s); }); } tn.textContent=total; ta.style.display='block'; tn.classList.remove('pop'); void tn.offsetWidth; tn.classList.add('pop');
  if(diceCount>=2 && isDouble(vals)){ comboCount++; if(comboCount>=3){ triggerFlash(comboCount); triggerDoubleGlow(); spawnSparks(); setTimeout(()=>{ triggerExplosion(()=>{ comboCount=0; updateComboUI(0); document.getElementById('hint').style.display=''; }); }, 300); } else { triggerFlash(comboCount); triggerDoubleGlow(); updateComboUI(comboCount); spawnSparks(); setTimeout(()=>document.getElementById('hint').style.display='',1000); } } else { comboCount=0; updateComboUI(0); spawnSparks(); setTimeout(()=>document.getElementById('hint').style.display='',1000); }
}

function spawnSparks(){ const items=['✦','★','◆','•','✸']; const cols=['rgba(255,220,100,.95)','rgba(180,140,255,.95)','rgba(255,255,255,.85)','rgba(100,220,160,.9)']; for(let i=0;i<8;i++){ setTimeout(()=>{ const el=document.createElement('div'); el.className='sp'; el.textContent=items[Math.floor(Math.random()*items.length)]; el.style.cssText=`left:${20+Math.random()*60}vw;bottom:${18+Math.random()*40}vh;color:${cols[Math.floor(Math.random()*cols.length)]};font-size:${14+Math.random()*14}px`; document.getElementById('w').appendChild(el); setTimeout(()=>el.remove(),750); },i*65); } }

initDice();

/* ── 仅在末尾追加抽卡逻辑，不触碰上方代码 ── */

function drawCard(k){
  const pool = CARD_DATA[k];
  const item = pool[Math.floor(Math.random()*pool.length)];
  const t = document.getElementById('cardTitle');
  t.innerText = item.t;
  t.style.color = k==='comm'?'#409fff':'#ff9f40';
  document.getElementById('cardDesc').innerHTML = item.d;
  document.getElementById('cardModal').classList.add('active');
}
