/* =========================================================
 * data.js —— localStorage 读写 + 模拟数据
 * 存储键名：members / expenses
 * ========================================================= */

const STORAGE_KEYS = {
  members: 'dorm_members',
  expenses: 'dorm_expenses'
};

/* ---------- localStorage 读写封装 ---------- */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('读取本地数据失败：', key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// 成员
function getMembers() {
  return loadJSON(STORAGE_KEYS.members, []);
}
function setMembers(list) {
  saveJSON(STORAGE_KEYS.members, list);
}

// 支出
function getExpenses() {
  return loadJSON(STORAGE_KEYS.expenses, []);
}
function setExpenses(list) {
  saveJSON(STORAGE_KEYS.expenses, list);
}

/**
 * 生成日期偏移字符串：今天往前 offset 天
 */
function daysAgo(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return formatDate(d);
}

/* ---------- 模拟数据：4 个室友、10 条支出 ---------- */

function buildMockData() {
  const members = [
    { id: 'm1', name: '张伟' },
    { id: 'm2', name: '李娜' },
    { id: 'm3', name: '王强' },
    { id: 'm4', name: '刘洋' }
  ];

  // splitters 为姓名数组，包含"部分人分摊"的情况
  const expenses = [
    { id: 'e01', item: '周末火锅聚餐',   amount: 168, payer: '张伟', splitters: ['张伟', '李娜', '王强', '刘洋'], date: daysAgo(12) },
    { id: 'e02', item: '桶装水 X2',      amount: 36,  payer: '李娜', splitters: ['张伟', '李娜', '王强', '刘洋'], date: daysAgo(11) },
    { id: 'e03', item: '洗衣液',         amount: 29.9, payer: '王强', splitters: ['王强', '刘洋'],               date: daysAgo(10) },
    { id: 'e04', item: '垃圾袋+清洁剂',  amount: 24.5, payer: '刘洋', splitters: ['张伟', '李娜', '王强', '刘洋'], date: daysAgo(9)  },
    { id: 'e05', item: '电费充值',       amount: 200, payer: '张伟', splitters: ['张伟', '李娜', '王强', '刘洋'], date: daysAgo(8)  },
    { id: 'e06', item: '外卖宵夜',       amount: 76,  payer: '李娜', splitters: ['李娜', '王强'],               date: daysAgo(6)  },
    { id: 'e07', item: '纸巾 8 提',      amount: 39.9, payer: '王强', splitters: ['张伟', '李娜', '王强', '刘洋'], date: daysAgo(5)  },
    { id: 'e08', item: '路由器网费分摊', amount: 120, payer: '刘洋', splitters: ['张伟', '李娜', '王强', '刘洋'], date: daysAgo(4)  },
    { id: 'e09', item: '生日蛋糕',       amount: 88,  payer: '李娜', splitters: ['张伟', '李娜', '刘洋'],       date: daysAgo(2)  },
    { id: 'e10', item: '蔬菜水果',       amount: 54.6, payer: '张伟', splitters: ['张伟', '王强'],               date: daysAgo(1)  }
  ];

  return { members, expenses };
}

/* ---------- 初始化：首次打开时写入模拟数据 ---------- */

function initDataIfNeeded() {
  if (localStorage.getItem(STORAGE_KEYS.members) === null ||
      localStorage.getItem(STORAGE_KEYS.expenses) === null) {
    const mock = buildMockData();
    setMembers(mock.members);
    setExpenses(mock.expenses);
  }
}

// 按 id 生成器（保证唯一性即可）
function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}
