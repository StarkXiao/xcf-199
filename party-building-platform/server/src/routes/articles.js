const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const category = req.query.category;
  const keyword = req.query.keyword;

  const predicate = article => {
    if (article.status !== 'published') return false;
    if (category && article.category !== category) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      if (!article.title.toLowerCase().includes(kw) && !article.content.toLowerCase().includes(kw)) {
        return false;
      }
    }
    return true;
  };

  const result = db.paginate('articles', {
    page,
    page_size: pageSize,
    predicate,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const listWithExcerpt = result.list.map(article => ({
    ...article,
    excerpt: article.content.replace(/<[^>]*>/g, '').slice(0, 150) + '...'
  }));

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

router.get('/categories', (req, res) => {
  const articles = db.findMany('articles', a => a.status === 'published' && a.category);
  const categories = [...new Set(articles.map(a => a.category))];

  res.json({
    code: 200,
    message: '获取成功',
    data: categories
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const article = db.getById('articles', parseInt(id));

  if (!article) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }

  db.update('articles', article.id, { views: article.views + 1 });
  article.views += 1;

  res.json({
    code: 200,
    message: '获取成功',
    data: article
  });
});

router.post('/:id/read', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { duration = 60 } = req.body;

  const article = db.getById('articles', parseInt(id));
  if (!article) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }

  const existingRecord = db.findOne('study_records', r => r.user_id === userId && r.article_id === parseInt(id));

  let pointsEarned = 0;
  if (!existingRecord && duration >= 30) {
    db.insert('study_records', {
      user_id: userId,
      article_id: parseInt(id),
      read_duration: duration,
      completed: 1
    });

    const user = db.getById('users', userId);
    if (user) {
      db.update('users', userId, { points: user.points + 2 });
    }

    db.insert('points_records', {
      user_id: userId,
      points: 2,
      reason: '学习文章获得积分',
      type: 'earn'
    });

    pointsEarned = 2;
  } else if (existingRecord) {
    db.update('study_records', existingRecord.id, {
      read_duration: existingRecord.read_duration + duration
    });
  }

  res.json({
    code: 200,
    message: '记录成功',
    data: { points_earned: pointsEarned }
  });
});

module.exports = router;
