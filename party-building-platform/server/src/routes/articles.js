const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
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

    let sql = 'SELECT * FROM articles WHERE status = ?';
    const params = ['published'];
    const countSql = 'SELECT COUNT(*) as c FROM articles WHERE status = ?';
    const countParams = ['published'];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
      countSql += ' AND category = ?';
      countParams.push(category);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
      countSql += ' AND (title LIKE ? OR content LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const result = await db.paginate('articles', {
      page,
      page_size: pageSize,
      predicate,
      sortBy: 'created_at',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const listWithExcerpt = result.list.map(article => ({
      ...article,
      excerpt: String(article.content || '').replace(/<[^>]*>/g, '').slice(0, 150) + '...'
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const articles = await db.findMany(
      'articles',
      a => a.status === 'published' && a.category,
      'SELECT DISTINCT category FROM articles WHERE status = ? AND category IS NOT NULL AND category != ?',
      ['published', '']
    );

    let categories;
    if (db.useMySQL) {
      categories = articles.map(a => a.category).filter(Boolean);
    } else {
      categories = [...new Set(articles.map(a => a.category))];
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const article = await db.getById('articles', parseInt(id));

    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    await db.update(
      'articles',
      article.id,
      { views: article.views + 1 },
      'UPDATE articles SET views = views + 1 WHERE id = ?',
      []
    );
    article.views = (article.views || 0) + 1;

    res.json({
      code: 200,
      message: '获取成功',
      data: article
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { duration = 60 } = req.body;
    const articleId = parseInt(id);

    const article = await db.getById('articles', articleId);
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    const existingRecord = await db.findOne(
      'study_records',
      r => r.user_id === userId && r.article_id === articleId,
      'SELECT * FROM study_records WHERE user_id = ? AND article_id = ? LIMIT 1',
      [userId, articleId]
    );

    let pointsEarned = 0;
    if (!existingRecord && duration >= 30) {
      await db.insert(
        'study_records',
        { user_id: userId, article_id: articleId, read_duration: duration, completed: 1 },
        'INSERT INTO study_records (user_id, article_id, read_duration, completed) VALUES (?, ?, ?, 1)',
        [userId, articleId, duration]
      );

      const user = await db.getById('users', userId);
      if (user) {
        await db.update(
          'users',
          userId,
          { points: user.points + 2 },
          'UPDATE users SET points = points + 2 WHERE id = ?',
          []
        );
      }

      await db.insert(
        'points_records',
        { user_id: userId, points: 2, reason: '学习文章获得积分', type: 'earn' },
        'INSERT INTO points_records (user_id, points, reason, type) VALUES (?, 2, ?, ?)',
        [userId, '学习文章获得积分', 'earn']
      );

      pointsEarned = 2;
    } else if (existingRecord) {
      await db.update(
        'study_records',
        existingRecord.id,
        { read_duration: existingRecord.read_duration + duration },
        'UPDATE study_records SET read_duration = read_duration + ? WHERE id = ?',
        [duration]
      );
    }

    res.json({
      code: 200,
      message: '记录成功',
      data: { points_earned: pointsEarned }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
