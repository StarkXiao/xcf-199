const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/ranking', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;
    const branch = req.query.branch;

    const predicate = user => {
      if (user.role !== 'user') return false;
      if (branch && user.branch !== branch) return false;
      return true;
    };

    let sql = 'SELECT * FROM users WHERE role = ?';
    const params = ['user'];
    let countSql = 'SELECT COUNT(*) as c FROM users WHERE role = ?';
    const countParams = ['user'];

    if (branch) {
      sql += ' AND branch = ?';
      params.push(branch);
      countSql += ' AND branch = ?';
      countParams.push(branch);
    }

    const result = await db.paginate('users', {
      page,
      page_size: pageSize,
      predicate,
      sortBy: 'points',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const rankedList = result.list.map((item, index) => ({
      id: item.id,
      username: item.username,
      real_name: item.real_name,
      branch: item.branch,
      points: item.points,
      avatar: item.avatar,
      rank: (page - 1) * pageSize + index + 1
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: rankedList,
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

router.get('/my-records', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const userId = req.user.id;

    const result = await db.paginate('points_records', {
      page,
      page_size: pageSize,
      predicate: r => r.user_id === userId,
      sortBy: 'created_at',
      sortOrder: 'desc',
      sql: 'SELECT * FROM points_records WHERE user_id = ?',
      sqlParams: [userId],
      countSql: 'SELECT COUNT(*) as c FROM points_records WHERE user_id = ?',
      countParams: [userId]
    });

    const user = await db.getById('users', userId);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: result.list,
        total: result.total,
        page,
        page_size: pageSize,
        total_points: user ? user.points : 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/branches', async (req, res) => {
  try {
    let branches;
    if (db.useMySQL) {
      const rows = await db.exec(
        'SELECT DISTINCT branch FROM users WHERE branch IS NOT NULL AND branch != ?',
        ['']
      );
      branches = rows.map(r => r.branch).filter(Boolean);
    } else {
      const users = await db.findMany('users', u => u.branch && u.branch !== '');
      branches = [...new Set(users.map(u => u.branch))];
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: branches
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
