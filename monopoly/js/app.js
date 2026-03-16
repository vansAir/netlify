const API = 'https://monopoly.z-zzz.site/api'; 
let currentUser = null;
let adminPassword = null;
let allPlayersCache = [];

// ===== Cookie 工具 =====
function setCookie(name, val, days=365) {
  document.cookie = `${name}=${encodeURIComponent(val)};max-age=${days*86400};path=/`;
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function delCookie(name) {
  document.cookie = `${name}=;max-age=0;path=/`;
}

// ===== Toast =====
function toast(msg, type='info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 2800);
}

// ===== 格式化金额 =====
function formatCoins(k) {
  k = Math.floor(Number(k));
  if (k >= 1000) {
    const m = Math.floor(k / 1000);
    const rem = k % 1000;
    return rem > 0 ? `${m}M ${rem}K` : `${m}M`;
  }
  return `${k}K`;
}

function formatCoinsShort(k) {
  k = Math.floor(Number(k));
  if (k >= 1000) return `${(k/1000).toFixed(k%1000===0?0:1)}M`;
  return `${k}K`;
}

// ===== 快捷金额与单位切换 =====
// 切换单位按钮高亮并设置 hidden input
function switchUnit(el, unitId, val) {
  document.getElementById(unitId).value = val;
  const parent = el.parentElement;
  parent.querySelectorAll('.unit-opt').forEach(opt => opt.classList.remove('active'));
  el.classList.add('active');
}

// 同步 UI 状态（被快捷按钮调用时触发）
function updateUnitUI(unitId, unitVal) {
  const hiddenInput = document.getElementById(unitId);
  if (!hiddenInput) return;
  const parent = hiddenInput.parentElement;
  parent.querySelectorAll('.unit-opt').forEach(opt => {
    if (parseInt(opt.getAttribute('data-val')) === unitVal) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
}

function setAmt(inputId, unitId, amount, unit) {
  document.getElementById(inputId).value = amount;
  document.getElementById(unitId).value = unit;
  updateUnitUI(unitId, unit);
}

// ===== 计算K值 =====
function getKValue(inputId, unitId) {
  const val = parseFloat(document.getElementById(inputId).value);
  const unit = parseInt(document.getElementById(unitId).value);
  if (isNaN(val) || val <= 0) return null;
  return Math.floor(val * unit);
}

// ===== 初始化 =====
async function init() {
  const name = getCookie('monopoly_user');
  if (name) {
    const res = await fetch(`${API}/verify?name=${encodeURIComponent(name)}`).then(r=>r.json()).catch(()=>null);
    if (res && res.success) {
      currentUser = { name, coins: res.coins };
      showMainApp();
    } else {
      delCookie('monopoly_user');
      showPage('loginPage');
    }
  } else {
    showPage('loginPage');
  }
}

// ===== 登录 =====
async function doLogin() {
  const name = document.getElementById('loginName').value.trim();
  if (!name) { toast('请输入昵称！', 'error'); return; }
  try {
    const res = await fetch(`${API}/login?name=${encodeURIComponent(name)}`).then(r=>r.json());
    if (res.success) {
      setCookie('monopoly_user', res.name);
      currentUser = { name: res.name, coins: res.coins };
      toast(res.newPlayer ? `欢迎 ${res.name}！你已加入游戏 🎲` : `欢迎回来，${res.name}！`, 'success');
      setTimeout(showMainApp, 500);
    } else {
      toast(res.msg || '登录失败', 'error');
    }
  } catch(e) { toast('无法连接服务器', 'error'); }
}

document.getElementById('loginName').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// ===== 显示主应用 =====
function showMainApp() {
  document.getElementById('bottomNav').style.display = 'flex';
  showTab('home');
}

// ===== 页面切换 =====
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showTab(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${tab}`).classList.add('active');
  if (tab === 'home') {
    showPage('homePage');
    loadPlayers();
  } else if (tab === 'transfer') {
    showPage('transferPage');
    initTransferPage();
  } else if (tab === 'admin') {
    showPage('adminPage');
    if (adminPassword) loadAdminPlayers();
  }
}

function showAdminTab() {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-admin').classList.add('active');
  showPage('adminPage');
  if (adminPassword) loadAdminPlayers();
}

function goAdmin() {
  showPage('adminPage');
  document.getElementById('bottomNav').style.display = 'none';
}

function backFromAdmin() {
  if (currentUser) {
    showMainApp();
  } else {
    showPage('loginPage');
  }
}

// ===== 加载玩家列表 =====
async function loadPlayers() {
  try {
    const res = await fetch(`${API}/players`).then(r=>r.json());
    if (!res.success) return;
    allPlayersCache = res.players;

    const me = res.players.find(p => p.name === currentUser?.name);
    if (currentUser) {
      if (!me) {
        delCookie('monopoly_user');
        currentUser = null;
        adminPassword = null;
        document.getElementById('bottomNav').style.display = 'none';
        toast('⚠️ 账号已被删除，请重新登录', 'error');
        setTimeout(() => showPage('loginPage'), 1200);
        return;
      }
      currentUser.coins = me.coins;
    }

    if (currentUser) {
      document.getElementById('myBalance').innerHTML = `
        <div class="balance-label">我的余额</div>
        <div class="balance-amount">${formatCoinsShort(currentUser.coins)}</div>
        <div class="balance-name">👤 ${currentUser.name}</div>
      `;
    }

    const list = document.getElementById('playerList');
    if (res.players.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无玩家 🎲</div>';
      return;
    }

    list.innerHTML = res.players.map((p, i) => {
      const rankClass = i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-n';
      const isMe = p.name === currentUser?.name;
      const coins = Math.floor(Number(p.coins));
      let coinsDisplay = formatCoinsShort(coins);
      let coinsSub = '';
      if (coins >= 1000 && coins % 1000 !== 0) coinsSub = `(${coins % 1000}K)`;

      return `
        <div class="player-item">
          <div class="player-rank ${rankClass}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
            <span class="player-name ${isMe ? 'player-self' : ''}">${p.name}${isMe ? ' 👈' : ''}</span>
          <div class="player-coins">
            <span class="coins-main">${coinsDisplay}</span>
            ${coinsSub ? `<span class="coins-sub">${coinsSub}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    document.getElementById('playerList').innerHTML = '<div class="empty-state">⚠️ 加载失败，请刷新</div>';
  }
}

// ===== 转账页初始化 =====
async function initTransferPage() {
  await loadPlayers();
  const others = allPlayersCache.filter(p => p.name !== currentUser?.name);
  const grid = document.getElementById('transferToGrid');
  const display = document.getElementById('transferSelectedDisplay');
  window._transferTo = null;
  display.textContent = '';

  if (!others.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">暂无其他玩家</div>';
    return;
  }
  grid.innerHTML = others.map(p => `
    <button class="player-select-btn" onclick="selectTransferTarget('${p.name}', '${formatCoinsShort(p.coins)}', this)">
      <span class="psb-name">👤 ${p.name}</span>
      <span class="psb-coins">${formatCoinsShort(p.coins)}</span>
    </button>
  `).join('');
}

function selectTransferTarget(name, coins, el) {
  document.querySelectorAll('#transferToGrid .player-select-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  window._transferTo = name;
  document.getElementById('transferSelectedDisplay').textContent = `✅ 已选：${name}（${coins}）`;
}

// ===== 玩家转账 =====
async function doTransfer() {
  const to = window._transferTo;
  const amount = getKValue('transferAmt', 'transferUnit');
  if (!to) { toast('请选择转账对象', 'error'); return; }
  if (!amount) { toast('请输入有效金额', 'error'); return; }
  if (amount > currentUser.coins) {
    toast(`余额不足！当前 ${formatCoinsShort(currentUser.coins)}`, 'error'); return;
  }
  try {
    const res = await fetch(`${API}/transfer?from=${encodeURIComponent(currentUser.name)}&to=${encodeURIComponent(to)}&amount=${amount}`).then(r=>r.json());
    if (res.success) {
      currentUser.coins = res.fromCoins;
      toast(`✅ 成功转账 ${formatCoinsShort(amount)} 给 ${to}`, 'success');
      document.getElementById('transferAmt').value = '';
      window._transferTo = null;
      initTransferPage();
    } else {
      toast(res.msg || '转账失败', 'error');
    }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 银行还款 =====
async function doPayBank() {
  const amount = getKValue('bankAmt', 'bankUnit');
  if (!amount) { toast('请输入有效金额', 'error'); return; }
  if (amount > currentUser.coins) {
    toast(`余额不足！当前 ${formatCoinsShort(currentUser.coins)}`, 'error'); return;
  }
  try {
    const res = await fetch(`${API}/paybank?name=${encodeURIComponent(currentUser.name)}&amount=${amount}`).then(r=>r.json());
    if (res.success) {
      currentUser.coins = res.coins;
      toast(`🏛️ 已还款 ${formatCoinsShort(amount)} 给银行`, 'success');
      document.getElementById('bankAmt').value = '';
    } else {
      toast(res.msg || '还款失败', 'error');
    }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 管理员验证 =====
async function verifyAdmin() {
  const pwd = document.getElementById('adminPwd').value;
  try {
    const res = await fetch(`${API}/admin/verify?password=${pwd}`).then(r=>r.json());
    if (res.success) {
      adminPassword = pwd;
      document.getElementById('adminLock').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      document.getElementById('bottomNav').style.display = 'flex';
      toast('🔓 管理员模式已解锁', 'success');
      loadAdminPlayers();
    } else {
      toast('密码错误！', 'error');
    }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 加载管理员玩家列表 =====
async function loadAdminPlayers() {
  try {
    const res = await fetch(`${API}/players`).then(r=>r.json());
    if (!res.success) return;
    allPlayersCache = res.players;

    const grid = document.getElementById('addTargetGrid');
    const display = document.getElementById('addTargetSelectedDisplay');
    window._addTarget = null;
    if (display) display.textContent = '';
    if (grid) {
      grid.innerHTML = res.players.length
        ? res.players.map(p => `
          <button class="player-select-btn" onclick="selectAddTarget('${p.name}', '${formatCoinsShort(p.coins)}', this)">
            <span class="psb-name">👤 ${p.name}</span>
            <span class="psb-coins">${formatCoinsShort(p.coins)}</span>
          </button>
        `).join('')
        : '<div class="empty-state" style="grid-column:1/-1">暂无玩家</div>';
    }

    const list = document.getElementById('adminPlayerList');
    if (res.players.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无玩家</div>';
      return;
    }
    list.innerHTML = res.players.map(p => `
      <div class="player-checkbox-item">
        <input type="checkbox" class="player-cb" value="${p.name}">
        <span style="flex:1;color:var(--cream);font-size:14px">${p.name}</span>
        <span style="color:var(--gold);font-size:14px">${formatCoinsShort(p.coins)}</span>
      </div>
    `).join('');
  } catch(e) { toast('加载失败', 'error'); }
}

function selectAddTarget(name, coins, el) {
  document.querySelectorAll('#addTargetGrid .player-select-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  window._addTarget = name;
  document.getElementById('addTargetSelectedDisplay').textContent = `✅ 已选：${name}（${coins}）`;
}

// ===== 全选 =====
function toggleSelectAll(cb) {
  document.querySelectorAll('.player-cb').forEach(c => c.checked = cb.checked);
}

// ===== 重置游戏 =====
async function doReset() {
  if (!confirm('确定要将所有玩家金币归零吗？此操作不可撤销！')) return;
  try {
    const res = await fetch(`${API}/admin/reset?password=${adminPassword}`).then(r=>r.json());
    if (res.success) {
      toast('🔄 游戏已重置，所有玩家金币归零', 'success');
      loadAdminPlayers();
    } else { toast(res.msg, 'error'); }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 统一发放 =====
async function doGiveAll() {
  const amount = getKValue('giveAmt', 'giveUnit');
  if (!amount) { toast('请输入有效金额', 'error'); return; }
  try {
    const res = await fetch(`${API}/admin/giveall?password=${adminPassword}&amount=${amount}`).then(r=>r.json());
    if (res.success) {
      toast(`🎁 已向 ${res.count} 名玩家各发放 ${formatCoinsShort(amount)}`, 'success');
      document.getElementById('giveAmt').value = '';
      loadAdminPlayers();
    } else { toast(res.msg, 'error'); }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 单独增加 =====
async function doAddCoins() {
  const name = window._addTarget;
  const amount = getKValue('addAmt', 'addUnit');
  if (!name) { toast('请选择玩家', 'error'); return; }
  if (!amount) { toast('请输入有效金额', 'error'); return; }
  try {
    const res = await fetch(`${API}/admin/addcoins?password=${adminPassword}&name=${encodeURIComponent(name)}&amount=${amount}`).then(r=>r.json());
    if (res.success) {
      toast(`✅ 已为 ${name} 增加 ${formatCoinsShort(amount)}`, 'success');
      document.getElementById('addAmt').value = '';
      loadAdminPlayers();
    } else { toast(res.msg, 'error'); }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 删除玩家 =====
async function doDelete() {
  const checked = [...document.querySelectorAll('.player-cb:checked')].map(c => c.value);
  if (checked.length === 0) { toast('请选择要删除的玩家', 'error'); return; }
  if (!confirm(`确定删除：${checked.join('、')} 吗？`)) return;
  try {
    const res = await fetch(`${API}/admin/delete?password=${adminPassword}&names=${encodeURIComponent(checked.join(','))}`).then(r=>r.json());
    if (res.success) {
      toast(`🗑️ 已删除 ${res.deleted.join('、')}`, 'success');
      document.getElementById('selectAll').checked = false;
      loadAdminPlayers();
    } else { toast(res.msg, 'error'); }
  } catch(e) { toast('网络错误', 'error'); }
}

// ===== 启动 =====
window.addEventListener('load', init);