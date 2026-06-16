const express = require('express');
const db = require('../database');
const config = require('../config');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const type = req.query.type;

    const predicate = notice => {
      if (notice.status !== 'published') return false;
      if (type && notice.type !== type) return false;
      return true;
    };

    let sql = 'SELECT * FROM notices WHERE status = ?';
    const params = ['published'];
    let countSql = 'SELECT COUNT(*) as c FROM notices WHERE status = ?';
    const countParams = ['published'];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    const result = await db.paginate('notices', {
      page,
      page_size: pageSize,
      predicate,
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const listWithExcerpt = result.list.map(notice => ({
      ...notice,
      excerpt: String(notice.content || '').slice(0, 100) + '...'
    }));

    listWithExcerpt.sort((a, b) => {
      if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/types', async (req, res) => {
  try {
    let types;
    if (db.useMySQL) {
      const rows = await db.exec(
        "SELECT DISTINCT type FROM notices WHERE status = 'published' AND type IS NOT NULL AND type != ?",
        ['']
      );
      types = rows.map(r => r.type).filter(Boolean);
    } else {
      const notices = await db.findMany('notices', n => n.status === 'published' && n.type);
      types = [...new Set(notices.map(n => n.type))];
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: types
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await db.getById('notices', parseInt(id));

    if (!notice) {
      return res.status(404).json({ code: 404, message: '通知不存在' });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: notice
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
