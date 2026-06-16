const express = require('express');
const db = require('../database');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const type = req.query.type;

  const predicate = notice => {
    if (notice.status !== 'published') return false;
    if (type && notice.type !== type) return false;
    return true;
  };

  const result = db.paginate('notices', {
    page,
    page_size: pageSize,
    predicate,
    sortBy: 'priority',
    sortOrder: 'desc'
  });

  const listWithExcerpt = result.list.map(notice => ({
    ...notice,
    excerpt: notice.content.slice(0, 100) + '...'
  }));

  listWithExcerpt.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list: listWithExcerpt,
      total: result.total,
      page,
      page_size: pageSize
    }
  });
});

router.get('/types', (req, res) => {
  const notices = db.findMany('notices', n => n.status === 'published' && n.type);
  const types = [...new Set(notices.map(n => n.type))];

  res.json({
    code: 200,
    message: '获取成功',
    data: types
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const notice = db.getById('notices', parseInt(id));

  if (!notice) {
    return res.status(404).json({ code: 404, message: '通知不存在' });
  }

  res.json({
    code: 200,
    message: '获取成功',
    data: notice
  });
});

module.exports = router;
