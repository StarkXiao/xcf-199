const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

const calculateDuesAmount = (income, rules) => {
  const activeRules = rules.filter(r => r.status === 'active');
  for (const rule of activeRules) {
    if (rule.calculation_method === 'fixed') {
      return { amount: rule.fixed_amount, ruleId: rule.id };
    }
    if (income >= rule.income_min) {
      if (rule.income_max === null || income <= rule.income_max) {
        return { amount: income * rule.dues_rate, ruleId: rule.id };
      }
    }
  }
  return { amount: 0, ruleId: null };
};

const getBillStatusText = (status) => {
  const statusMap = {
    unpaid: '待缴纳',
    paid: '已缴纳',
    overdue: '已逾期',
    partial: '部分缴纳',
    waived: '已减免'
  };
  return statusMap[status] || status;
};

const getPaymentMethodText = (method) => {
  const methodMap = {
    bank_transfer: '银行转账',
    alipay: '支付宝',
    wechat: '微信支付',
    cash: '现金',
    other: '其他'
  };
  return methodMap[method] || method;
};

router.get('/rules', async (req, res) => {
  try {
    const status = req.query.status;
    let rules;
    if (db.useMySQL) {
      let sql = 'SELECT * FROM party_dues_rules';
      const params = [];
      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      sql += ' ORDER BY income_min ASC';
      rules = await db.exec(sql, params);
    } else {
      rules = await db.getAll('party_dues_rules');
      if (status) {
        rules = rules.filter(r => r.status === status);
      }
      rules.sort((a, b) => a.income_min - b.income_min);
    }
    res.json({ code: 200, message: '获取成功', data: rules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/rules', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { rule_name, income_min, income_max, dues_rate, fixed_amount, calculation_method, effective_date, expiry_date, description } = req.body;
    if (!rule_name || !dues_rate || !effective_date) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }
    const id = await db.insert('party_dues_rules', {
      rule_name,
      income_min: income_min || 0,
      income_max: income_max || null,
      dues_rate,
      fixed_amount: fixed_amount || null,
      calculation_method: calculation_method || 'percentage',
      effective_date,
      expiry_date: expiry_date || null,
      status: 'active',
      description: description || '',
      created_by: req.user.id
    });
    const rule = await db.getOne('party_dues_rules', r => r.id === id, 'SELECT * FROM party_dues_rules WHERE id = ?', [id]);
    res.json({ code: 200, message: '创建成功', data: rule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/rules/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;
    const { rule_name, income_min, income_max, dues_rate, fixed_amount, calculation_method, effective_date, expiry_date, status, description } = req.body;
    await db.update(
      'party_dues_rules',
      r => r.id === parseInt(id),
      { rule_name, income_min, income_max, dues_rate, fixed_amount, calculation_method, effective_date, expiry_date, status, description, updated_at: new Date().toISOString() },
      'UPDATE party_dues_rules SET rule_name = ?, income_min = ?, income_max = ?, dues_rate = ?, fixed_amount = ?, calculation_method = ?, effective_date = ?, expiry_date = ?, status = ?, description = ?, updated_at = ? WHERE id = ?',
      [rule_name, income_min, income_max, dues_rate, fixed_amount, calculation_method, effective_date, expiry_date, status, description, new Date().toISOString(), id]
    );
    const rule = await db.getOne('party_dues_rules', r => r.id === parseInt(id), 'SELECT * FROM party_dues_rules WHERE id = ?', [id]);
    res.json({ code: 200, message: '更新成功', data: rule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/rules/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;
    await db.delete(
      'party_dues_rules',
      r => r.id === parseInt(id),
      'DELETE FROM party_dues_rules WHERE id = ?',
      [id]
    );
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/rules/:id/toggle', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;
    const rule = await db.getOne(
      'party_dues_rules',
      r => r.id === parseInt(id),
      'SELECT * FROM party_dues_rules WHERE id = ?',
      [id]
    );
    if (!rule) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    const newStatus = rule.status === 'active' ? 'inactive' : 'active';
    const now = new Date().toISOString();
    if (db.useMySQL) {
      await db.exec(
        'UPDATE party_dues_rules SET status = ?, updated_at = ? WHERE id = ?',
        [newStatus, now, id]
      );
    } else {
      await db.update(
        'party_dues_rules',
        r => r.id === parseInt(id),
        { status: newStatus, updated_at: now }
      );
    }
    await db.insert('party_dues_history', {
      action_type: 'toggle_rule',
      action_detail: `${newStatus === 'active' ? '启用' : '禁用'}党费规则 ID:${id}`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });
    res.json({ code: 200, message: '操作成功', data: { status: newStatus } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/bills', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const year = req.query.year;
    const month = req.query.month;
    const status = req.query.status;
    const userId = req.user.id;

    const predicate = bill => {
      if (bill.user_id !== userId) return false;
      if (year && bill.bill_year !== parseInt(year)) return false;
      if (month && bill.bill_month !== parseInt(month)) return false;
      if (status && bill.status !== status) return false;
      return true;
    };

    let sql = 'SELECT * FROM party_dues_bills WHERE user_id = ?';
    const params = [userId];
    let countSql = 'SELECT COUNT(*) as c FROM party_dues_bills WHERE user_id = ?';
    const countParams = [userId];
    const whereConditions = [];

    if (year) {
      whereConditions.push('bill_year = ?');
      params.push(year);
      countParams.push(year);
    }
    if (month) {
      whereConditions.push('bill_month = ?');
      params.push(month);
      countParams.push(month);
    }
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
      countParams.push(status);
    }

    if (whereConditions.length > 0) {
      const whereStr = ' AND ' + whereConditions.join(' AND ');
      sql += whereStr;
      countSql += whereStr;
    }

    sql += ' ORDER BY bill_year DESC, bill_month DESC';

    const result = await db.paginate('party_dues_bills', {
      page,
      page_size: pageSize,
      predicate,
      sortBy: 'bill_year',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: result.list.map(b => ({ ...b, status_text: getBillStatusText(b.status) })),
        total: result.total,
        page,
        page_size: pageSize
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/payments', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const userId = req.user.id;

    let sql = 'SELECT p.*, u.real_name, u.branch, u.avatar FROM party_dues_payments p LEFT JOIN users u ON p.user_id = u.id WHERE p.user_id = ? ORDER BY p.payment_date DESC, p.created_at DESC';
    const params = [userId];

    const countSql = 'SELECT COUNT(*) as c FROM party_dues_payments WHERE user_id = ?';
    const countParams = [userId];

    const predicate = p => p.user_id === userId;

    const result = await db.paginate('party_dues_payments', {
      page,
      page_size: pageSize,
      predicate,
      sortBy: 'payment_date',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const list = result.list.map(p => ({
      ...p,
      payment_method_text: getPaymentMethodText(p.payment_method)
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total: result.total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    let bills;
    if (db.useMySQL) {
      bills = await db.exec('SELECT * FROM party_dues_bills WHERE user_id = ?', [userId]);
    } else {
      bills = await db.findMany('party_dues_bills', b => b.user_id === userId);
    }

    const yearBills = bills.filter(b => b.bill_year === currentYear);
    const totalPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.dues_amount, 0);
    const totalUnpaid = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + b.total_amount, 0);
    const yearPaid = yearBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.dues_amount, 0);
    const yearUnpaid = yearBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + b.total_amount, 0);
    const overdueCount = bills.filter(b => b.status === 'overdue').length;

    const latestBill = bills.sort((a, b) => {
      if (a.bill_year !== b.bill_year) return b.bill_year - a.bill_year;
      return b.bill_month - a.bill_month;
    })[0];

    const userConfig = await db.getOne(
      'party_dues_user_config',
      c => c.user_id === userId,
      'SELECT * FROM party_dues_user_config WHERE user_id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total_paid: totalPaid,
        total_unpaid: totalUnpaid,
        year_paid: yearPaid,
        year_unpaid: yearUnpaid,
        overdue_count: overdueCount,
        current_year: currentYear,
        latest_bill: latestBill ? { ...latestBill, status_text: getBillStatusText(latestBill.status) } : null,
        user_config: userConfig
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/my/pay', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bill_ids, payment_method, payment_reference, payment_date } = req.body;

    if (!bill_ids || !Array.isArray(bill_ids) || bill_ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要缴纳的账单' });
    }
    if (!payment_method) {
      return res.status(400).json({ code: 400, message: '请选择支付方式' });
    }

    let bills;
    if (db.useMySQL) {
      const placeholders = bill_ids.map(() => '?').join(',');
      bills = await db.exec(`SELECT * FROM party_dues_bills WHERE id IN (${placeholders}) AND user_id = ?`, [...bill_ids, userId]);
    } else {
      bills = await db.findMany('party_dues_bills', b => bill_ids.includes(b.id) && b.user_id === userId);
    }

    if (bills.length === 0) {
      return res.status(400).json({ code: 400, message: '未找到有效的账单' });
    }

    const totalAmount = bills.reduce((sum, b) => sum + b.total_amount, 0);
    const lateFee = bills.reduce((sum, b) => sum + (b.late_fee || 0), 0);
    const payDate = payment_date || new Date().toISOString().slice(0, 10);

    const paymentId = await db.insert('party_dues_payments', {
      user_id: userId,
      payment_date: payDate,
      payment_amount: totalAmount,
      payment_method,
      payment_reference: payment_reference || '',
      late_fee: lateFee,
      payer_name: req.user.real_name,
      recorded_by: req.user.id,
      status: 'confirmed'
    });

    const now = new Date().toISOString();
    for (const bill of bills) {
      if (db.useMySQL) {
        await db.exec(
          'UPDATE party_dues_bills SET status = ?, paid_amount = ?, paid_at = ?, payment_method = ?, payment_reference = ?, updated_at = ? WHERE id = ?',
          ['paid', bill.total_amount, now, payment_method, payment_reference || '', now, bill.id]
        );
      } else {
        await db.update(
          'party_dues_bills',
          b => b.id === bill.id,
          { status: 'paid', paid_amount: bill.total_amount, paid_at: now, payment_method, payment_reference: payment_reference || '', updated_at: now }
        );
      }

      await db.insert('party_dues_history', {
        bill_id: bill.id,
        payment_id: paymentId,
        action_type: 'pay',
        action_detail: `缴纳${bill.bill_year}年${bill.bill_month}月党费，金额：${bill.total_amount}元`,
        operator_id: req.user.id,
        operator_name: req.user.real_name
      });
    }

    res.json({ code: 200, message: '缴纳成功', data: { payment_id: paymentId, total_amount: totalAmount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/my/remediation', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_year, start_month, end_year, end_month, reason } = req.body;

    if (!start_year || !start_month || !end_year || !end_month || !reason) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }

    const rules = await db.getAll('party_dues_rules');
    const userConfig = await db.getOne(
      'party_dues_user_config',
      c => c.user_id === userId,
      'SELECT * FROM party_dues_user_config WHERE user_id = ?',
      [userId]
    );

    const income = userConfig?.monthly_income || 0;
    const { amount: monthlyAmount } = calculateDuesAmount(income, rules);

    let totalMonths = 0;
    for (let y = start_year; y <= end_year; y++) {
      const startM = y === start_year ? start_month : 1;
      const endM = y === end_year ? end_month : 12;
      totalMonths += endM - startM + 1;
    }

    const baseTotal = monthlyAmount * totalMonths;
    const lateFee = baseTotal * 0.01;
    const totalAmount = baseTotal + lateFee;

    const id = await db.insert('party_dues_remediation', {
      user_id: userId,
      start_year,
      start_month,
      end_year,
      end_month,
      total_months: totalMonths,
      base_total: baseTotal,
      late_fee: lateFee,
      total_amount: totalAmount,
      reason,
      status: 'pending',
      created_by: req.user.id
    });

    await db.insert('party_dues_history', {
      remediation_id: id,
      action_type: 'submit_remediation',
      action_detail: `提交补缴申请：${start_year}年${start_month}月至${end_year}年${end_month}月，共${totalMonths}个月`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    const remediation = await db.getOne(
      'party_dues_remediation',
      r => r.id === id,
      'SELECT * FROM party_dues_remediation WHERE id = ?',
      [id]
    );

    res.json({ code: 200, message: '补缴申请提交成功', data: remediation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/bills', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const year = req.query.year;
    const month = req.query.month;
    const status = req.query.status;
    const branch = req.query.branch;
    const keyword = req.query.keyword;

    let sql = `
      SELECT b.*, u.real_name, u.branch, u.phone 
      FROM party_dues_bills b 
      LEFT JOIN users u ON b.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    let countSql = `
      SELECT COUNT(*) as c 
      FROM party_dues_bills b 
      LEFT JOIN users u ON b.user_id = u.id 
      WHERE 1=1
    `;
    const countParams = [];

    if (year) {
      sql += ' AND b.bill_year = ?';
      countSql += ' AND b.bill_year = ?';
      params.push(year);
      countParams.push(year);
    }
    if (month) {
      sql += ' AND b.bill_month = ?';
      countSql += ' AND b.bill_month = ?';
      params.push(month);
      countParams.push(month);
    }
    if (status) {
      sql += ' AND b.status = ?';
      countSql += ' AND b.status = ?';
      params.push(status);
      countParams.push(status);
    }
    if (branch) {
      sql += ' AND u.branch = ?';
      countSql += ' AND u.branch = ?';
      params.push(branch);
      countParams.push(branch);
    }
    if (keyword) {
      sql += ' AND (u.real_name LIKE ? OR u.phone LIKE ?)';
      countSql += ' AND (u.real_name LIKE ? OR u.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY b.bill_year DESC, b.bill_month DESC, u.branch, u.real_name';

    const result = await db.paginate('party_dues_bills', {
      page,
      page_size: pageSize,
      predicate: () => true,
      sortBy: 'bill_year',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const list = result.list.map(b => ({ ...b, status_text: getBillStatusText(b.status) }));

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total: result.total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/admin/bills/generate', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ code: 400, message: '请指定年月' });
    }

    const users = await db.getAll('users');
    const rules = await db.getAll('party_dues_rules');
    const activeRules = rules.filter(r => r.status === 'active');

    let generatedCount = 0;
    const now = new Date().toISOString();
    const deadline = new Date(year, month - 1, 25).toISOString().slice(0, 10);

    for (const user of users) {
      if (user.role === 'admin') continue;

      let existing;
      if (db.useMySQL) {
        [existing] = await db.exec(
          'SELECT * FROM party_dues_bills WHERE user_id = ? AND bill_year = ? AND bill_month = ?',
          [user.id, year, month]
        );
      } else {
        existing = await db.getOne(
          'party_dues_bills',
          b => b.user_id === user.id && b.bill_year === year && b.bill_month === month
        );
      }

      if (existing) continue;

      const userConfig = await db.getOne(
        'party_dues_user_config',
        c => c.user_id === user.id,
        'SELECT * FROM party_dues_user_config WHERE user_id = ?',
        [user.id]
      );

      if (userConfig?.is_exempt) continue;

      const income = userConfig?.monthly_income || 0;
      const { amount: duesAmount, ruleId } = calculateDuesAmount(income, activeRules);

      if (duesAmount <= 0) continue;

      await db.insert('party_dues_bills', {
        user_id: user.id,
        bill_year: year,
        bill_month: month,
        base_amount: income,
        dues_amount: duesAmount,
        late_fee: 0,
        total_amount: duesAmount,
        status: 'unpaid',
        payment_deadline: deadline,
        rule_id: ruleId,
        generated_at: now
      });

      generatedCount++;
    }

    await db.insert('party_dues_history', {
      action_type: 'generate_bills',
      action_detail: `批量生成${year}年${month}月党费账单，共${generatedCount}条`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '生成成功', data: { generated_count: generatedCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code:  500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/bills/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const year = req.query.year || new Date().getFullYear();

    let bills;
    if (db.useMySQL) {
      bills = await db.exec('SELECT * FROM party_dues_bills WHERE bill_year = ?', [year]);
    } else {
      bills = await db.findMany('party_dues_bills', b => b.bill_year === parseInt(year));
    }

    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.status === 'paid').length;
    const unpaidBills = bills.filter(b => b.status === 'unpaid').length;
    const overdueBills = bills.filter(b => b.status === 'overdue').length;
    const totalDues = bills.reduce((sum, b) => sum + (b.dues_amount || 0), 0);
    const totalPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.dues_amount || 0), 0);
    const totalUnpaid = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        year: parseInt(year),
        total_bills: totalBills,
        paid_bills: paidBills,
        unpaid_bills: unpaidBills,
        overdue_bills: overdueBills,
        total_dues: totalDues,
        total_paid: totalPaid,
        total_unpaid: totalUnpaid
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/bills/:id/mark-paid', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;
    const { payment_method, payment_reference, payment_date } = req.body;

    const bill = await db.getOne(
      'party_dues_bills',
      b => b.id === parseInt(id),
      'SELECT * FROM party_dues_bills WHERE id = ?',
      [id]
    );

    if (!bill) {
      return res.status(404).json({ code: 404, message: '账单不存在' });
    }

    const now = new Date().toISOString();
    const payDate = payment_date || now.slice(0, 10);

    const paymentId = await db.insert('party_dues_payments', {
      user_id: bill.user_id,
      bill_id: bill.id,
      payment_date: payDate,
      payment_amount: bill.total_amount,
      payment_method: payment_method || 'cash',
      payment_reference: payment_reference || '管理员手动标记',
      payer_name: '',
      recorded_by: req.user.id,
      status: 'confirmed'
    });

    if (db.useMySQL) {
      await db.exec(
        'UPDATE party_dues_bills SET status = ?, paid_amount = ?, paid_at = ?, payment_method = ?, payment_reference = ?, updated_at = ? WHERE id = ?',
        ['paid', bill.total_amount, now, payment_method || 'cash', payment_reference || '管理员手动标记', now, id]
      );
    } else {
      await db.update(
        'party_dues_bills',
        b => b.id === parseInt(id),
        {
          status: 'paid',
          paid_amount: bill.total_amount,
          paid_at: now,
          payment_method: payment_method || 'cash',
          payment_reference: payment_reference || '管理员手动标记',
          updated_at: now
        }
      );
    }

    await db.insert('party_dues_history', {
      bill_id: parseInt(id),
      payment_id: paymentId,
      action_type: 'admin_mark_paid',
      action_detail: `管理员标记${bill.bill_year}年${bill.bill_month}月账单已缴，金额：${bill.total_amount}元`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '标记成功', data: { payment_id: paymentId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/payments', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const branch = req.query.branch;
    const keyword = req.query.keyword;

    let sql = `
      SELECT p.*, u.real_name, u.branch, u.phone, u.avatar 
      FROM party_dues_payments p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    let countSql = `
      SELECT COUNT(*) as c 
      FROM party_dues_payments p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE 1=1
    `;
    const countParams = [];

    if (start_date) {
      sql += ' AND p.payment_date >= ?';
      countSql += ' AND p.payment_date >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    if (end_date) {
      sql += ' AND p.payment_date <= ?';
      countSql += ' AND p.payment_date <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }
    if (branch) {
      sql += ' AND u.branch = ?';
      countSql += ' AND u.branch = ?';
      params.push(branch);
      countParams.push(branch);
    }
    if (keyword) {
      sql += ' AND (u.real_name LIKE ? OR u.phone LIKE ? OR p.payment_reference LIKE ?)';
      countSql += ' AND (u.real_name LIKE ? OR u.phone LIKE ? OR p.payment_reference LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const result = await db.paginate('party_dues_payments', {
      page,
      page_size: pageSize,
      predicate: () => true,
      sortBy: 'payment_date',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const list = result.list.map(p => ({
      ...p,
      payment_method_text: getPaymentMethodText(p.payment_method)
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total: result.total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/admin/payments', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { user_id, bill_year, bill_month, payment_amount, payment_method, payment_reference, payment_date, remark } = req.body;

    if (!user_id || !bill_year || !bill_month || !payment_amount || !payment_method) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }

    let bill;
    if (db.useMySQL) {
      [bill] = await db.exec(
        'SELECT * FROM party_dues_bills WHERE user_id = ? AND bill_year = ? AND bill_month = ?',
        [user_id, bill_year, bill_month]
      );
    } else {
      bill = await db.getOne(
        'party_dues_bills',
        b => b.user_id === user_id && b.bill_year === bill_year && b.bill_month === bill_month
      );
    }

    const user = await db.getOne('users', u => u.id === user_id, 'SELECT * FROM users WHERE id = ?', [user_id]);

    const payDate = payment_date || new Date().toISOString().slice(0, 10);
    const paymentId = await db.insert('party_dues_payments', {
      user_id,
      bill_id: bill?.id || null,
      payment_date: payDate,
      payment_amount,
      payment_method,
      payment_reference: payment_reference || '',
      bill_year,
      bill_month,
      payer_name: user?.real_name || '',
      recorded_by: req.user.id,
      remark: remark || '',
      status: 'confirmed'
    });

    if (bill) {
      const now = new Date().toISOString();
      if (db.useMySQL) {
        await db.exec(
          'UPDATE party_dues_bills SET status = ?, paid_amount = ?, paid_at = ?, payment_method = ?, payment_reference = ?, updated_at = ? WHERE id = ?',
          ['paid', payment_amount, now, payment_method, payment_reference || '', now, bill.id]
        );
      } else {
        await db.update(
          'party_dues_bills',
          b => b.id === bill.id,
          { status: 'paid', paid_amount: payment_amount, paid_at: now, payment_method, payment_reference: payment_reference || '', updated_at: now }
        );
      }
    }

    await db.insert('party_dues_history', {
      bill_id: bill?.id || null,
      payment_id: paymentId,
      action_type: 'admin_record',
      action_detail: `管理员登记缴费：${bill_year}年${bill_month}月，金额：${payment_amount}元`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '登记成功', data: { payment_id: paymentId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/remediations', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;

    let sql = `
      SELECT r.*, u.real_name, u.branch, u.phone, u.avatar 
      FROM party_dues_remediation r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    let countSql = `
      SELECT COUNT(*) as c 
      FROM party_dues_remediation r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE 1=1
    `;
    const countParams = [];

    if (status) {
      sql += ' AND r.status = ?';
      countSql += ' AND r.status = ?';
      params.push(status);
      countParams.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const result = await db.paginate('party_dues_remediation', {
      page,
      page_size: pageSize,
      predicate: () => true,
      sortBy: 'created_at',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: result.list, total: result.total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/remediations/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;

    const remediation = await db.getOne(
      'party_dues_remediation',
      r => r.id === parseInt(id),
      'SELECT * FROM party_dues_remediation WHERE id = ?',
      [id]
    );

    if (!remediation) {
      return res.status(404).json({ code: 404, message: '补缴申请不存在' });
    }

    const now = new Date().toISOString();
    if (db.useMySQL) {
      await db.exec(
        'UPDATE party_dues_remediation SET status = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?',
        ['approved', req.user.id, now, now, id]
      );
    } else {
      await db.update(
        'party_dues_remediation',
        r => r.id === parseInt(id),
        { status: 'approved', approved_by: req.user.id, approved_at: now, updated_at: now }
      );
    }

    await db.insert('party_dues_history', {
      remediation_id: parseInt(id),
      action_type: 'approve_remediation',
      action_detail: '管理员审批通过补缴申请',
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '审批通过' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/remediations/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;
    const { reject_reason } = req.body;

    if (!reject_reason) {
      return res.status(400).json({ code: 400, message: '请输入拒绝原因' });
    }

    const remediation = await db.getOne(
      'party_dues_remediation',
      r => r.id === parseInt(id),
      'SELECT * FROM party_dues_remediation WHERE id = ?',
      [id]
    );

    if (!remediation) {
      return res.status(404).json({ code: 404, message: '补缴申请不存在' });
    }

    const now = new Date().toISOString();
    if (db.useMySQL) {
      await db.exec(
        'UPDATE party_dues_remediation SET status = ?, reject_reason = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?',
        ['rejected', reject_reason, req.user.id, now, now, id]
      );
    } else {
      await db.update(
        'party_dues_remediation',
        r => r.id === parseInt(id),
        { status: 'rejected', reject_reason, approved_by: req.user.id, approved_at: now, updated_at: now }
      );
    }

    await db.insert('party_dues_history', {
      remediation_id: parseInt(id),
      action_type: 'reject_remediation',
      action_detail: `管理员拒绝补缴申请，原因：${reject_reason}`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '已拒绝' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/remediations/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }

    let remediations;
    if (db.useMySQL) {
      remediations = await db.exec('SELECT * FROM party_dues_remediation');
    } else {
      remediations = await db.getAll('party_dues_remediation');
    }

    const pending = remediations.filter(r => r.status === 'pending').length;
    const approved = remediations.filter(r => r.status === 'approved').length;
    const rejected = remediations.filter(r => r.status === 'rejected').length;
    const paid = remediations.filter(r => r.status === 'paid').length;

    res.json({
      code: 200,
      message: '获取成功',
      data: { pending, approved, rejected, paid }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/stats/overview', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const currentYear = new Date().getFullYear();

    let bills;
    if (db.useMySQL) {
      bills = await db.exec('SELECT * FROM party_dues_bills WHERE bill_year = ?', [currentYear]);
    } else {
      bills = await db.findMany('party_dues_bills', b => b.bill_year === currentYear);
    }

    let payments;
    if (db.useMySQL) {
      payments = await db.exec('SELECT * FROM party_dues_payments WHERE strftime("%Y", payment_date) = ?', [currentYear.toString()]);
    } else {
      payments = await db.findMany('party_dues_payments', p => p.payment_date?.startsWith(currentYear.toString()));
    }

    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.status === 'paid').length;
    const overdueBills = bills.filter(b => b.status === 'overdue').length;
    const totalDues = bills.reduce((sum, b) => sum + b.dues_amount, 0);
    const totalPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.dues_amount, 0);
    const totalLateFee = bills.reduce((sum, b) => sum + (b.late_fee || 0), 0);
    const paymentCount = payments.length;
    const paymentTotal = payments.reduce((sum, p) => sum + p.payment_amount, 0);

    const users = await db.getAll('users');
    const partyMembers = users.filter(u => u.role !== 'admin').length;

    let remediations;
    if (db.useMySQL) {
      remediations = await db.exec('SELECT * FROM party_dues_remediation');
    } else {
      remediations = await db.getAll('party_dues_remediation');
    }
    const pendingRemediations = remediations.filter(r => r.status === 'pending').length;

    const paymentRate = totalBills > 0 ? ((paidBills / totalBills) * 100).toFixed(2) : 0;

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        current_year: currentYear,
        total_bills: totalBills,
        paid_bills: paidBills,
        overdue_bills: overdueBills,
        total_dues: totalDues,
        total_paid: totalPaid,
        total_late_fee: totalLateFee,
        payment_count: paymentCount,
        payment_total: paymentTotal,
        party_members: partyMembers,
        pending_remediations: pendingRemediations,
        payment_rate: parseFloat(paymentRate)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/stats/by-user', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const year = req.query.year || new Date().getFullYear();

    let sql = `
      SELECT 
        u.id,
        u.real_name,
        u.branch,
        u.phone,
        u.avatar,
        COUNT(b.id) as total_bills,
        SUM(CASE WHEN b.status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
        SUM(CASE WHEN b.status = 'overdue' THEN 1 ELSE 0 END) as overdue_bills,
        SUM(b.dues_amount) as total_dues,
        SUM(CASE WHEN b.status = 'paid' THEN b.dues_amount ELSE 0 END) as paid_amount,
        SUM(b.late_fee) as late_fee
      FROM users u
      LEFT JOIN party_dues_bills b ON u.id = b.user_id AND b.bill_year = ?
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.branch, u.real_name
    `;
    const params = [year];

    let result;
    if (db.useMySQL) {
      result = await db.exec(sql, params);
    } else {
      const users = await db.findMany('users', u => u.role !== 'admin');
      const bills = await db.findMany('party_dues_bills', b => b.bill_year === parseInt(year));
      result = users.map(user => {
        const userBills = bills.filter(b => b.user_id === user.id);
        return {
          id: user.id,
          real_name: user.real_name,
          branch: user.branch,
          phone: user.phone,
          avatar: user.avatar,
          total_bills: userBills.length,
          paid_bills: userBills.filter(b => b.status === 'paid').length,
          overdue_bills: userBills.filter(b => b.status === 'overdue').length,
          total_dues: userBills.reduce((sum, b) => sum + b.dues_amount, 0),
          paid_amount: userBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.dues_amount, 0),
          late_fee: userBills.reduce((sum, b) => sum + (b.late_fee || 0), 0)
        };
      });
      result.sort((a, b) => {
        if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
        return a.real_name.localeCompare(b.real_name);
      });
    }

    const list = result.map(r => ({
      ...r,
      payment_rate: r.total_bills > 0 ? parseFloat(((r.paid_bills / r.total_bills) * 100).toFixed(2)) : 0,
      unpaid_amount: r.total_dues - r.paid_amount
    }));

    res.json({ code: 200, message: '获取成功', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/stats/by-branch', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const year = req.query.year || new Date().getFullYear();

    let sql = `
      SELECT 
        u.branch,
        COUNT(DISTINCT u.id) as member_count,
        COUNT(b.id) as total_bills,
        SUM(CASE WHEN b.status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
        SUM(CASE WHEN b.status = 'overdue' THEN 1 ELSE 0 END) as overdue_bills,
        SUM(b.dues_amount) as total_dues,
        SUM(CASE WHEN b.status = 'paid' THEN b.dues_amount ELSE 0 END) as paid_amount,
        SUM(b.late_fee) as late_fee
      FROM users u
      LEFT JOIN party_dues_bills b ON u.id = b.user_id AND b.bill_year = ?
      WHERE u.role != 'admin' AND u.branch IS NOT NULL
      GROUP BY u.branch
      ORDER BY u.branch
    `;
    const params = [year];

    let result;
    if (db.useMySQL) {
      result = await db.exec(sql, params);
    } else {
      const users = await db.findMany('users', u => u.role !== 'admin' && u.branch);
      const bills = await db.findMany('party_dues_bills', b => b.bill_year === parseInt(year));
      const branchMap = {};
      for (const user of users) {
        if (!branchMap[user.branch]) {
          branchMap[user.branch] = { member_ids: new Set(), bills: [] };
        }
        branchMap[user.branch].member_ids.add(user.id);
      }
      for (const bill of bills) {
        const user = users.find(u => u.id === bill.user_id);
        if (user && branchMap[user.branch]) {
          branchMap[user.branch].bills.push(bill);
        }
      }
      result = Object.entries(branchMap).map(([branch, data]) => ({
        branch,
        member_count: data.member_ids.size,
        total_bills: data.bills.length,
        paid_bills: data.bills.filter(b => b.status === 'paid').length,
        overdue_bills: data.bills.filter(b => b.status === 'overdue').length,
        total_dues: data.bills.reduce((sum, b) => sum + b.dues_amount, 0),
        paid_amount: data.bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.dues_amount, 0),
        late_fee: data.bills.reduce((sum, b) => sum + (b.late_fee || 0), 0)
      }));
      result.sort((a, b) => a.branch.localeCompare(b.branch));
    }

    const list = result.map(r => ({
      ...r,
      payment_rate: r.total_bills > 0 ? parseFloat(((r.paid_bills / r.total_bills) * 100).toFixed(2)) : 0,
      unpaid_amount: r.total_dues - r.paid_amount
    }));

    res.json({ code: 200, message: '获取成功', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/stats/by-month', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const year = req.query.year || new Date().getFullYear();

    let sql = `
      SELECT 
        b.bill_month,
        COUNT(b.id) as total_bills,
        SUM(CASE WHEN b.status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
        SUM(CASE WHEN b.status = 'overdue' THEN 1 ELSE 0 END) as overdue_bills,
        SUM(b.dues_amount) as total_dues,
        SUM(CASE WHEN b.status = 'paid' THEN b.dues_amount ELSE 0 END) as paid_amount,
        SUM(b.late_fee) as late_fee
      FROM party_dues_bills b
      WHERE b.bill_year = ?
      GROUP BY b.bill_month
      ORDER BY b.bill_month
    `;
    const params = [year];

    let result;
    if (db.useMySQL) {
      result = await db.exec(sql, params);
    } else {
      const bills = await db.findMany('party_dues_bills', b => b.bill_year === parseInt(year));
      const monthMap = {};
      for (let m = 1; m <= 12; m++) {
        monthMap[m] = [];
      }
      for (const bill of bills) {
        if (monthMap[bill.bill_month]) {
          monthMap[bill.bill_month].push(bill);
        }
      }
      result = Object.entries(monthMap)
        .filter(([_, data]) => data.length > 0)
        .map(([month, data]) => ({
          bill_month: parseInt(month),
          total_bills: data.length,
          paid_bills: data.filter(b => b.status === 'paid').length,
          overdue_bills: data.filter(b => b.status === 'overdue').length,
          total_dues: data.reduce((sum, b) => sum + b.dues_amount, 0),
          paid_amount: data.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.dues_amount, 0),
          late_fee: data.reduce((sum, b) => sum + (b.late_fee || 0), 0)
        }));
      result.sort((a, b) => a.bill_month - b.bill_month);
    }

    const list = result.map(r => ({
      ...r,
      payment_rate: r.total_bills > 0 ? parseFloat(((r.paid_bills / r.total_bills) * 100).toFixed(2)) : 0,
      unpaid_amount: r.total_dues - r.paid_amount
    }));

    res.json({ code: 200, message: '获取成功', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/user-configs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 50;
    const keyword = req.query.keyword;

    let baseSql = `
      SELECT c.*, u.real_name, u.branch, u.phone, u.avatar, u.username
      FROM party_dues_user_config c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    let countSql = `
      SELECT COUNT(*) as c
      FROM party_dues_user_config c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (keyword) {
      baseSql += ' AND (u.real_name LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)';
      countSql += ' AND (u.real_name LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    baseSql += ' ORDER BY u.branch, u.real_name';

    let configs;
    let total;

    if (db.useMySQL) {
      const countResult = await db.exec(countSql, countParams);
      total = countResult[0]?.c || 0;
      const offset = (page - 1) * pageSize;
      baseSql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);
      configs = await db.exec(baseSql, params);
    } else {
      const allConfigs = await db.getAll('party_dues_user_config');
      const users = await db.getAll('users');
      configs = allConfigs.map(c => {
        const user = users.find(u => u.id === c.user_id);
        return {
          ...c,
          real_name: user?.real_name,
          branch: user?.branch,
          phone: user?.phone,
          avatar: user?.avatar,
          username: user?.username,
          user: user ? {
            id: user.id,
            real_name: user.real_name,
            branch: user.branch,
            phone: user.phone,
            avatar: user.avatar,
            username: user.username
          } : null
        };
      });
      if (keyword) {
        const kw = keyword.toLowerCase();
        configs = configs.filter(c =>
          (c.real_name || '').toLowerCase().includes(kw) ||
          (c.username || '').toLowerCase().includes(kw) ||
          (c.phone || '').toLowerCase().includes(kw)
        );
      }
      configs.sort((a, b) => {
        if (a.branch !== b.branch) return (a.branch || '').localeCompare(b.branch || '');
        return (a.real_name || '').localeCompare(b.real_name || '');
      });
      total = configs.length;
      const start = (page - 1) * pageSize;
      configs = configs.slice(start, start + pageSize);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: configs,
        total,
        page,
        page_size: pageSize
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/admin/user-configs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { user_id, monthly_income, custom_dues_amount, dues_type, exemption_reason, is_exempt, effective_date } = req.body;

    if (!user_id) {
      return res.status(400).json({ code: 400, message: '请选择用户' });
    }

    const existing = db.useMySQL
      ? (await db.exec('SELECT * FROM party_dues_user_config WHERE user_id = ?', [user_id]))[0]
      : await db.getOne('party_dues_user_config', c => c.user_id === parseInt(user_id));

    if (existing) {
      return res.status(400).json({ code: 400, message: '该用户已存在特殊配置' });
    }

    const now = new Date().toISOString();
    const id = await db.insert('party_dues_user_config', {
      user_id: parseInt(user_id),
      monthly_income: monthly_income || null,
      custom_dues_amount: custom_dues_amount || null,
      dues_type: dues_type || 'normal',
      exemption_reason: exemption_reason || '',
      is_exempt: is_exempt || 0,
      effective_date: effective_date || now.slice(0, 10),
      created_by: req.user.id
    });

    const config = await db.getOne(
      'party_dues_user_config',
      c => c.id === id,
      'SELECT * FROM party_dues_user_config WHERE id = ?',
      [id]
    );

    await db.insert('party_dues_history', {
      action_type: 'create_user_config',
      action_detail: `创建用户党费特殊配置，用户ID:${user_id}`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '创建成功', data: config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/admin/user-configs/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { id } = req.params;

    const existing = await db.getOne(
      'party_dues_user_config',
      c => c.id === parseInt(id),
      'SELECT * FROM party_dues_user_config WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ code: 404, message: '配置不存在' });
    }

    await db.delete(
      'party_dues_user_config',
      c => c.id === parseInt(id),
      'DELETE FROM party_dues_user_config WHERE id = ?',
      [id]
    );

    await db.insert('party_dues_history', {
      action_type: 'delete_user_config',
      action_detail: `删除用户党费特殊配置 ID:${id}`,
      operator_id: req.user.id,
      operator_name: req.user.real_name
    });

    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/user-configs/:user_id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }
    const { user_id } = req.params;
    const { monthly_income, custom_dues_amount, dues_type, exemption_reason, is_exempt, effective_date } = req.body;

    let existing;
    if (db.useMySQL) {
      [existing] = await db.exec('SELECT * FROM party_dues_user_config WHERE user_id = ?', [user_id]);
    } else {
      existing = await db.getOne('party_dues_user_config', c => c.user_id === parseInt(user_id));
    }

    const now = new Date().toISOString();
    if (existing) {
      if (db.useMySQL) {
        await db.exec(
          'UPDATE party_dues_user_config SET monthly_income = ?, custom_dues_amount = ?, dues_type = ?, exemption_reason = ?, is_exempt = ?, effective_date = ?, updated_at = ? WHERE user_id = ?',
          [monthly_income, custom_dues_amount, dues_type, exemption_reason, is_exempt, effective_date, now, user_id]
        );
      } else {
        await db.update(
          'party_dues_user_config',
          c => c.user_id === parseInt(user_id),
          { monthly_income, custom_dues_amount, dues_type, exemption_reason, is_exempt, effective_date, updated_at: now }
        );
      }
    } else {
      await db.insert('party_dues_user_config', {
        user_id: parseInt(user_id),
        monthly_income,
        custom_dues_amount,
        dues_type,
        exemption_reason,
        is_exempt,
        effective_date,
        created_by: req.user.id
      });
    }

    const config = await db.getOne(
      'party_dues_user_config',
      c => c.user_id === parseInt(user_id),
      'SELECT * FROM party_dues_user_config WHERE user_id = ?',
      [user_id]
    );

    res.json({ code: 200, message: '保存成功', data: config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
