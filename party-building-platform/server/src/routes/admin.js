const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    let userCount, articleCount, activityCount, noticeCount, totalPoints, recentSignups;

    if (db.useMySQL) {
      const [uc] = await db.exec("SELECT COUNT(*) as c FROM users WHERE role = 'user'");
      const [ac] = await db.exec('SELECT COUNT(*) as c FROM articles');
      const [actc] = await db.exec('SELECT COUNT(*) as c FROM activities');
      const [nc] = await db.exec('SELECT COUNT(*) as c FROM notices');
      const [tp] = await db.exec("SELECT COALESCE(SUM(points), 0) as s FROM users WHERE role = 'user'");
      const rs = await db.exec(
        `SELECT 
           (SELECT real_name FROM users WHERE id = s.user_id) as real_name,
           (SELECT title FROM activities WHERE id = s.activity_id) as title,
           s.signed_up_at
         FROM activity_signups s ORDER BY s.signed_up_at DESC LIMIT 10`
      );
      userCount = uc.c; articleCount = ac.c; activityCount = actc.c; noticeCount = nc.c;
      totalPoints = tp.s || 0; recentSignups = rs;
    } else {
      userCount = await db.count('users', u => u.role === 'user');
      articleCount = await db.count('articles');
      activityCount = await db.count('activities');
      noticeCount = await db.count('notices');
      const users = await db.findMany('users', u => u.role === 'user');
      totalPoints = users.reduce((sum, u) => sum + (u.points || 0), 0);
      const signups = await db.getAll('activity_signups');
      signups.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));
      recentSignups = await Promise.all(signups.slice(0, 10).map(async signup => {
        const user = await db.getById('users', signup.user_id);
        const activity = await db.getById('activities', signup.activity_id);
        return {
          real_name: user ? user.real_name : '未知用户',
          title: activity ? activity.title : '未知活动',
          signed_up_at: signup.signed_up_at
        };
      }));
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        user_count: userCount,
        article_count: articleCount,
        activity_count: activityCount,
        notice_count: noticeCount,
        total_points: totalPoints,
        recent_signups: recentSignups
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/articles', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const keyword = req.query.keyword;

    const predicate = article => {
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!String(article.title || '').toLowerCase().includes(kw) &&
            !String(article.content || '').toLowerCase().includes(kw)) return false;
      }
      return true;
    };

    let sql = 'SELECT * FROM articles';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM articles';
    const countParams = [];

    if (keyword) {
      sql += ' WHERE title LIKE ? OR content LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`);
      countSql += ' WHERE title LIKE ? OR content LIKE ?';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const result = await db.paginate('articles', {
      page, page_size: pageSize, predicate,
      sortBy: 'created_at', sortOrder: 'desc',
      sql, sqlParams: params, countSql, countParams
    });

    res.json({ code: 200, message: '获取成功', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/articles', async (req, res) => {
  try {
    const { title, content, category, cover_image, author, status } = req.body;
    if (!title || !content) {
      return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
    }
    const article = await db.insert(
      'articles',
      { title, content, category: category || '', cover_image: cover_image || '', author: author || '', status: status || 'published', views: 0 },
      'INSERT INTO articles (title, content, category, cover_image, author, status, views) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [title, content, category || '', cover_image || '', author || '', status || 'published']
    );
    res.json({ code: 200, message: '创建成功', data: article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, cover_image, author, status } = req.body;
    const article = await db.getById('articles', parseInt(id));
    if (!article) return res.status(404).json({ code: 404, message: '文章不存在' });

    const finalTitle = title || article.title;
    const finalContent = content || article.content;
    const finalCategory = category !== undefined ? category : article.category;
    const finalCover = cover_image !== undefined ? cover_image : article.cover_image;
    const finalAuthor = author !== undefined ? author : article.author;
    const finalStatus = status || article.status;

    const updated = await db.update(
      'articles', parseInt(id), {},
      'UPDATE articles SET title = ?, content = ?, category = ?, cover_image = ?, author = ?, status = ? WHERE id = ?',
      [finalTitle, finalContent, finalCategory, finalCover, finalAuthor, finalStatus]
    );
    res.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await db.getById('articles', parseInt(id));
    if (!article) return res.status(404).json({ code: 404, message: '文章不存在' });
    await db.remove('articles', parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/activities', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;

    const result = await db.paginate('activities', {
      page, page_size: pageSize,
      sortBy: 'created_at', sortOrder: 'desc',
      sql: 'SELECT * FROM activities',
      sqlParams: [],
      countSql: 'SELECT COUNT(*) as c FROM activities',
      countParams: []
    });

    const list = [];
    for (const activity of result.list) {
      const c = await db.count(
        'activity_signups',
        s => s.activity_id === activity.id && s.status !== 'cancelled',
        'SELECT COUNT(*) as c FROM activity_signups WHERE activity_id = ? AND status != ?',
        [activity.id, 'cancelled']
      );
      list.push({ ...activity, signup_count: c });
    }

    res.json({ code: 200, message: '获取成功', data: { list, total: result.total, page, page_size: pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/activities', async (req, res) => {
  try {
    const { title, description, cover_image, location, start_time, end_time, signup_deadline, max_participants, points_reward, status } = req.body;
    if (!title || !description) return res.status(400).json({ code: 400, message: '标题和描述不能为空' });
    const activity = await db.insert(
      'activities',
      { title, description, cover_image: cover_image || '', location: location || '', start_time: start_time || null, end_time: end_time || null, signup_deadline: signup_deadline || null, max_participants: max_participants || null, points_reward: points_reward || 10, status: status || 'upcoming' },
      'INSERT INTO activities (title, description, cover_image, location, start_time, end_time, signup_deadline, max_participants, points_reward, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, cover_image || '', location || '', start_time || null, end_time || null, signup_deadline || null, max_participants || null, points_reward || 10, status || 'upcoming']
    );
    res.json({ code: 200, message: '创建成功', data: activity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await db.getById('activities', parseInt(id));
    if (!activity) return res.status(404).json({ code: 404, message: '活动不存在' });

    const d = req.body;
    const updated = await db.update(
      'activities', parseInt(id), {},
      `UPDATE activities SET 
        title = ?, description = ?, cover_image = ?, location = ?,
        start_time = ?, end_time = ?, signup_deadline = ?,
        max_participants = ?, points_reward = ?, status = ?
      WHERE id = ?`,
      [
        d.title || activity.title,
        d.description || activity.description,
        d.cover_image !== undefined ? d.cover_image : activity.cover_image,
        d.location !== undefined ? d.location : activity.location,
        d.start_time || activity.start_time,
        d.end_time || activity.end_time,
        d.signup_deadline || activity.signup_deadline,
        d.max_participants || activity.max_participants,
        d.points_reward || activity.points_reward,
        d.status || activity.status
      ]
    );
    res.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await db.getById('activities', parseInt(id));
    if (!activity) return res.status(404).json({ code: 404, message: '活动不存在' });
    await db.remove('activities', parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/notices', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;

    const result = await db.paginate('notices', {
      page, page_size: pageSize,
      sortBy: 'priority', sortOrder: 'desc',
      sql: 'SELECT * FROM notices',
      sqlParams: [],
      countSql: 'SELECT COUNT(*) as c FROM notices',
      countParams: []
    });

    result.list.sort((a, b) => {
      if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({ code: 200, message: '获取成功', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/notices', async (req, res) => {
  try {
    const { title, content, type, priority, status } = req.body;
    if (!title || !content) return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
    const notice = await db.insert(
      'notices',
      { title, content, type: type || 'general', priority: priority || 0, status: status || 'published' },
      'INSERT INTO notices (title, content, type, priority, status) VALUES (?, ?, ?, ?, ?)',
      [title, content, type || 'general', priority || 0, status || 'published']
    );
    res.json({ code: 200, message: '创建成功', data: notice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await db.getById('notices', parseInt(id));
    if (!notice) return res.status(404).json({ code: 404, message: '通知不存在' });
    const d = req.body;
    const updated = await db.update(
      'notices', parseInt(id), {},
      'UPDATE notices SET title = ?, content = ?, type = ?, priority = ?, status = ? WHERE id = ?',
      [
        d.title || notice.title,
        d.content || notice.content,
        d.type || notice.type,
        d.priority !== undefined ? d.priority : notice.priority,
        d.status || notice.status
      ]
    );
    res.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await db.getById('notices', parseInt(id));
    if (!notice) return res.status(404).json({ code: 404, message: '通知不存在' });
    await db.remove('notices', parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const keyword = req.query.keyword;

    const predicate = user => {
      if (user.role !== 'user') return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!String(user.username || '').toLowerCase().includes(kw) &&
            !String(user.real_name || '').toLowerCase().includes(kw)) return false;
      }
      return true;
    };

    let sql = "SELECT id, username, real_name, phone, branch, role, points, avatar, created_at, updated_at FROM users WHERE role = ?";
    const params = ['user'];
    let countSql = "SELECT COUNT(*) as c FROM users WHERE role = ?";
    const countParams = ['user'];

    if (keyword) {
      sql += ' AND (username LIKE ? OR real_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
      countSql += ' AND (username LIKE ? OR real_name LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const result = await db.paginate('users', {
      page, page_size: pageSize, predicate,
      sortBy: 'created_at', sortOrder: 'desc',
      sql, sqlParams: params, countSql, countParams
    });

    res.json({ code: 200, message: '获取成功', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/users/:id/points', async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;
    const userId = parseInt(id);
    const user = await db.getById('users', userId);
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });

    await db.update(
      'users', userId, {},
      'UPDATE users SET points = points + ? WHERE id = ?',
      [points]
    );
    await db.insert(
      'points_records',
      { user_id: userId, points, reason: reason || '管理员调整', type: points >= 0 ? 'earn' : 'deduct' },
      'INSERT INTO points_records (user_id, points, reason, type) VALUES (?, ?, ?, ?)',
      [userId, points, reason || '管理员调整', points >= 0 ? 'earn' : 'deduct']
    );

    const updatedUser = await db.getById('users', userId);
    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ code: 200, message: '积分调整成功', data: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.getById('users', parseInt(id));
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ code: 400, message: '不能删除管理员账户' });
    await db.remove('users', parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/activity-signups/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const aid = parseInt(activityId);

    let signups;
    if (db.useMySQL) {
      signups = await db.exec(
        `SELECT s.*, u.real_name, u.username, u.phone, u.branch 
         FROM activity_signups s 
         INNER JOIN users u ON s.user_id = u.id 
         WHERE s.activity_id = ? 
         ORDER BY s.signed_up_at DESC 
         LIMIT ${(page - 1) * pageSize}, ${pageSize}`,
        [aid]
      );
      const [cr] = await db.exec('SELECT COUNT(*) as total FROM activity_signups WHERE activity_id = ?', [aid]);
      res.json({ code: 200, message: '获取成功', data: { list: signups, total: cr.total || 0, page, page_size: pageSize } });
    } else {
      const signupRecords = await db.findMany('activity_signups', s => s.activity_id === aid);
      const list = [];
      for (const signup of signupRecords) {
        const u = await db.getById('users', signup.user_id);
        list.push({
          ...signup,
          real_name: u ? u.real_name : '未知',
          username: u ? u.username : '未知',
          phone: u ? u.phone : '',
          branch: u ? u.branch : ''
        });
      }
      list.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));
      const total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      res.json({ code: 200, message: '获取成功', data: { list: list.slice(start, end), total, page, page_size: pageSize } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/activity-signups/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const signupId = parseInt(id);

    const signup = await db.getById('activity_signups', signupId);
    if (!signup) return res.status(404).json({ code: 404, message: '报名记录不存在' });

    if (status === 'approved' && signup.status !== 'approved') {
      const activity = await db.getById('activities', signup.activity_id);
      if (activity) {
        const user = await db.getById('users', signup.user_id);
        if (user) {
          await db.update(
            'users', signup.user_id, {},
            'UPDATE users SET points = points + ? WHERE id = ?',
            [activity.points_reward]
          );
        }
        await db.insert(
          'points_records',
          { user_id: signup.user_id, points: activity.points_reward, reason: `参加活动：${activity.title}`, type: 'earn' },
          'INSERT INTO points_records (user_id, points, reason, type) VALUES (?, ?, ?, ?)',
          [signup.user_id, activity.points_reward, `参加活动：${activity.title}`, 'earn']
        );
      }
    }

    await db.update(
      'activity_signups', signupId, {},
      'UPDATE activity_signups SET status = ? WHERE id = ?',
      [status]
    );

    res.json({ code: 200, message: '状态更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
