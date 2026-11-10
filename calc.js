/* =========================================================
 * calc.js —— 核心计算函数（纯函数，不依赖 DOM）
 * 页面加载和表单提交后统一调用这里的函数渲染，避免两套逻辑
 * ========================================================= */

/**
 * 计算每个人的净额
 * 规则：垫付人先垫付全部金额（+amount），每个分摊人应摊 amount / splitters.length（-amount/n）
 * @param {Array<{id, item, amount, payer, splitters:string[], date}>} expenses 支出记录
 * @returns {Array<{name: string, balance: number}>} 正数 = 应收（别人欠他），负数 = 应付（他欠别人）
 */
function calcSplit(expenses) {
  // 用对象累加，key 为成员姓名
  const balanceMap = {};

  expenses.forEach(exp => {
    // 保证每个人都在结果里（即使没有收支也显示 0）
    if (!(exp.payer in balanceMap)) balanceMap[exp.payer] = 0;
    exp.splitters.forEach(name => {
      if (!(name in balanceMap)) balanceMap[name] = 0;
    });

    const share = exp.amount / exp.splitters.length;

    // 垫付人 + 全额
    balanceMap[exp.payer] += exp.amount;
    // 每个参与分摊的人 - 各自份额（垫付人也参与分摊，会自然抵消）
    exp.splitters.forEach(name => {
      balanceMap[name] -= share;
    });
  });

  // 保留两位小数，消除浮点误差
  return Object.keys(balanceMap)
    .map(name => ({ name, balance: round2(balanceMap[name]) }));
}

/**
 * 计算最少转账次数的结算方案（贪心法）
 * 思路：每次让"欠最多的人"还钱给"应收最多的人"，双方余额归零或换人，
 *       n 个人的净额和为 0 时，最多 n-1 次转账即为最优。
 * @param {Array} expenses 支出记录
 * @returns {Array<{from: string, to: string, amount: number}>} from 付给 to，金额 amount
 */
function calcSettlement(expenses) {
  const balances = calcSplit(expenses);

  // 债权人（balance > 0，应收）从大到小；债务人（balance < 0，应付）从小到大（欠最多的在前）
  const creditors = balances.filter(b => b.balance > 0.005)
    .map(b => ({ name: b.name, left: b.balance }))
    .sort((a, b) => b.left - a.left);
  const debtors = balances.filter(b => b.balance < -0.005)
    .map(b => ({ name: b.name, left: -b.balance })) // left = 还需支付的金额
    .sort((a, b) => b.left - a.left);

  const result = [];
  let i = 0, j = 0;

  // 双指针贪心匹配
  while (i < creditors.length && j < debtors.length) {
    const pay = round2(Math.min(creditors[i].left, debtors[j].left));
    if (pay > 0) {
      result.push({ from: debtors[j].name, to: creditors[i].name, amount: pay });
    }
    creditors[i].left = round2(creditors[i].left - pay);
    debtors[j].left = round2(debtors[j].left - pay);

    // 谁先结清谁后移
    if (creditors[i].left <= 0.005) i++;
    if (debtors[j].left <= 0.005) j++;
  }
  return result;
}

/* ---------- 工具函数 ---------- */

// 四舍五入到两位小数
function round2(num) {
  return Math.round(num * 100) / 100;
}

// Date -> "YYYY-MM-DD"
function formatDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 今天日期字符串（供记账默认使用）
function todayStr() {
  return formatDate(new Date());
}
