/* =========================================================
 * app.js —— 页面渲染与交互（统一调用 calc.js 的核心函数）
 * ========================================================= */

// "我"默认取第一个成员（首页展示"我的净额"）
function getMe() {
  const members = getMembers();
  return members.length ? members[0].name : '';
}

/* ============ 页面切换（底部导航） ============ */

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + name);
  });
  document.querySelectorAll('.tabbar .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.page === name);
  });
  // 每次切换页面都重新渲染，保证数据最新
  renderPage(name);
  window.scrollTo(0, 0);
}

/* ============ 渲染调度：所有页面共用 calc.js 的函数 ============ */

function renderPage(name) {
  switch (name) {
    case 'home':    renderHome();    break;
    case 'add':     renderAddForm(); break;
    case 'bills':   renderBills();   break;
    case 'members': renderMembers(); break;
  }
}

/* ============ 首页 ============ */

function renderHome() {
  const expenses = getExpenses();
  const me = getMe();

  // --- 卡片1：我的净额（调用 calcSplit） ---
  const splits = calcSplit(expenses);
  const mine = splits.find(s => s.name === me);
  const bal = mine ? mine.balance : 0;
  document.getElementById('home-me-label').textContent = `${me} 的净额`;
  document.getElementById('home-my-balance').textContent =
    (bal > 0 ? '+' : '') + bal.toFixed(2) + ' 元';
  document.getElementById('home-my-balance-desc').textContent =
    bal > 0 ? '应收：别人欠你' : (bal < 0 ? '应付：你欠别人' : '账目已结平');

  // --- 结算建议（调用 calcSettlement） ---
  const settleList = document.getElementById('home-settle-list');
  const plans = calcSettlement(expenses);
  if (plans.length === 0) {
    settleList.innerHTML = '<li class="settle-empty">账目已结清，暂无转账需要</li>';
  } else {
    settleList.innerHTML = plans.map(p => `
      <li>
        <span>${p.from}</span>
        <span class="settle-arrow">付给</span>
        <span>${p.to}</span>
        <span class="settle-amount">${p.amount.toFixed(2)} 元</span>
      </li>
    `).join('');
  }

  // --- 最近 3 条账单（按日期倒序） ---
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  document.getElementById('home-recent-bills').innerHTML = renderBillItems(recent);
}

/* ============ 账单列表 HTML 生成（首页与账单页共用） ============ */

function renderBillItems(list) {
  if (list.length === 0) {
    return '<li class="settle-empty">还没有账单，去记一笔吧</li>';
  }
  return list.map(exp => `
    <li class="bill-item">
      <div class="bill-icon">${escHtml(exp.payer).charAt(0)}</div>
      <div class="bill-info">
        <div class="bill-title">${escHtml(exp.item)}</div>
        <div class="bill-meta">${exp.date} · ${escHtml(exp.payer)}垫付 · ${exp.splitters.length}人分摊</div>
      </div>
      <div class="bill-amount"><span class="rmb">¥</span>${exp.amount.toFixed(2)}</div>
    </li>
  `).join('');
}

/* ============ 记账页 ============ */

function renderAddForm() {
  const members = getMembers();

  // 垫付人下拉框
  const payerSel = document.getElementById('add-payer');
  payerSel.innerHTML = members.map(m =>
    `<option value="${escHtml(m.name)}">${escHtml(m.name)}</option>`
  ).join('');

  // 分摊人多选（默认全员勾选）
  const box = document.getElementById('add-splitters');
  box.innerHTML = members.map(m => `
    <label class="splitter-chip checked">
      <input type="checkbox" value="${escHtml(m.name)}" checked>${escHtml(m.name)}
    </label>
  `).join('');
  bindChipToggle(box);

  // 全选 / 取消全选
  const allBtn = document.getElementById('btn-select-all');
  allBtn.onclick = () => {
    const chips = box.querySelectorAll('input[type="checkbox"]');
    const allChecked = [...chips].every(c => c.checked);
    chips.forEach(c => { c.checked = !allChecked; });
    syncChipStyle(box);
    allBtn.textContent = allChecked ? '全选' : '取消全选';
  };
}

// 分摊人 chip 点击样式切换
function bindChipToggle(box) {
  box.querySelectorAll('.splitter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = chip.querySelector('input');
      input.checked = !input.checked;
      syncChipStyle(box);
    });
  });
}

function syncChipStyle(box) {
  box.querySelectorAll('.splitter-chip').forEach(chip => {
    chip.classList.toggle('checked', chip.querySelector('input').checked);
  });
}

// 提交新账单
function handleAddSubmit(e) {
  e.preventDefault();

  const item = document.getElementById('add-item').value.trim();
  const amount = parseFloat(document.getElementById('add-amount').value);
  const payer = document.getElementById('add-payer').value;
  const splitters = [...document.querySelectorAll('#add-splitters input:checked')]
    .map(c => c.value);

  // 表单校验
  if (!item) { showToast('请填写事项'); return; }
  if (!(amount > 0)) { showToast('请填写正确金额'); return; }
  if (splitters.length === 0) { showToast('请至少选择一名分摊人'); return; }

  // 写入 localStorage
  const expenses = getExpenses();
  expenses.push({
    id: genId('e'),
    item,
    amount: round2(amount),
    payer,
    splitters,
    date: todayStr()
  });
  setExpenses(expenses);

  // 重置表单、提示、返回首页
  document.getElementById('form-add').reset();
  showToast('记账成功');
  switchPage('home');
}

/* ============ 账单页 ============ */

function renderBills() {
  const expenses = [...getExpenses()].sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById('bills-list').innerHTML = renderBillItems(expenses);
}

/* ============ 成员页 ============ */

function renderMembers() {
  const members = getMembers();
  const me = getMe();
  const expenses = getExpenses();

  document.getElementById('member-list').innerHTML = members.map(m => {
    // 统计该成员相关的账单数
    const count = expenses.filter(e => e.payer === m.name || e.splitters.includes(m.name)).length;
    return `
      <li class="member-item">
        <div class="member-avatar">${escHtml(m.name).charAt(0)}</div>
        <div class="member-name">${escHtml(m.name)}</div>
        <span class="member-tag">${count} 笔账单</span>
        <button class="member-del" data-id="${m.id}">删除</button>
      </li>
    `;
  }).join('') || '<li class="settle-empty">暂无成员，先添加一位吧</li>';

  // 删除需二次确认
  document.querySelectorAll('.member-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const member = members.find(m => m.id === btn.dataset.id);
      const ok = confirm(`确定删除成员「${member.name}」吗？\n（其历史账单记录将保留）`);
      if (!ok) return;

      // 从成员列表移除
      setMembers(members.filter(m => m.id !== member.id));

      showToast('已删除 ' + member.name);
      renderMembers();
    });
  });
}

// 添加成员
function handleMemberSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('member-name');
  const name = input.value.trim();

  if (!name) { showToast('请输入姓名'); return; }
  const members = getMembers();
  if (members.some(m => m.name === name)) {
    showToast('该成员已存在');
    return;
  }

  members.push({ id: genId('m'), name });
  setMembers(members);
  input.value = '';
  showToast('已添加 ' + name);
  renderMembers();
}

/* ============ Toast 提示 ============ */

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

/* ============ 工具：HTML 转义，防注入 ============ */

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============ 初始化入口 ============ */

document.addEventListener('DOMContentLoaded', () => {
  // 首次打开写入模拟数据
  initDataIfNeeded();

  // 底部导航点击
  document.getElementById('tabbar').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) switchPage(tab.dataset.page);
  });

  // 表单事件绑定
  document.getElementById('form-add').addEventListener('submit', handleAddSubmit);
  document.getElementById('form-member').addEventListener('submit', handleMemberSubmit);

  // 首屏渲染
  renderPage('home');
});
