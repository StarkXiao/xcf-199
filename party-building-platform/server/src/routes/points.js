const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/ranking', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || 20;
  const branch = req.query.branch;

  const predicate = user => {
    if (user.role !== 'user') return false;
    if (branch && user.branch !== branch) return false;
    return true;
  };

  const result = db.paginate('users', {
    page,
    page_size: pageSize,
    predicate,
    sortBy: 'points',
    sortOrder: 'desc'
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
});

router.get('/my-records', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const userId = req.user.id;

  const result = db.paginate('points_records', {
    page,
    page_size: pageSize,
    predicate: r => r.user_id === userId,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const user = db.getById('users', userId);

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
});

router.get('/branches', (req, res) => {
  const users = db.findMany('users', u => u.branch && u.branch !== '');
  const branches = [...new Set(users.map(u => u.branch))];

  res.json({
    code: 200,
    message: '获取成功',
    data: branches
  });
});

module.exports = router;
