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
    const { title, content, category, cover_image, author, status, views } = req.body;
    const article = await db.getById('articles', parseInt(id));
    if (!article) return res.status(404).json({ code: 404, message: '文章不存在' });

    const finalTitle = title !== undefined ? title : article.title;
    const finalContent = content !== undefined ? content : article.content;
    const finalCategory = category !== undefined ? category : article.category;
    const finalCover = cover_image !== undefined ? cover_image : article.cover_image;
    const finalAuthor = author !== undefined ? author : article.author;
    const finalStatus = status !== undefined ? status : article.status;
    const finalViews = views !== undefined ? views : article.views;

    const updated = await db.update(
      'articles', parseInt(id), {},
      'UPDATE articles SET title = ?, content = ?, category = ?, cover_image = ?, author = ?, status = ?, views = ? WHERE id = ?',
      [finalTitle, finalContent, finalCategory, finalCover, finalAuthor, finalStatus, finalViews]
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

router.get('/volunteer-projects', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const keyword = req.query.keyword;

    const predicate = project => {
      if (status && project.status !== status) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!String(project.title || '').toLowerCase().includes(kw)) return false;
      }
      return true;
    };

    let sql = 'SELECT * FROM volunteer_projects';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM volunteer_projects';
    const countParams = [];
    let whereConditions = [];

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
      countParams.push(status);
    }
    if (keyword) {
      whereConditions.push('title LIKE ?');
      params.push(`%${keyword}%`);
      countParams.push(`%${keyword}%`);
    }

    if (whereConditions.length > 0) {
      const whereStr = ' WHERE ' + whereConditions.join(' AND ');
      sql += whereStr;
      countSql += whereStr;
    }

    const result = await db.paginate('volunteer_projects', {
      page, page_size: pageSize, predicate,
      sortBy: 'created_at', sortOrder: 'desc',
      sql, sqlParams: params, countSql, countParams
    });

    const list = [];
    for (const project of result.list) {
      const signupCount = await db.count(
        'volunteer_signups',
        s => s.project_id === project.id && s.status !== 'rejected',
        'SELECT COUNT(*) as c FROM volunteer_signups WHERE project_id = ? AND status != ?',
        [project.id, 'rejected']
      );
      list.push({ ...project, signup_count: signupCount });
    }

    res.json({ code: 200, message: '获取成功', data: { list, total: result.total, page, page_size: pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/volunteer-projects', async (req, res) => {
  try {
    const d = req.body;
    if (!d.title || !d.description) return res.status(400).json({ code: 400, message: '标题和描述不能为空' });

    const project = await db.insert(
      'volunteer_projects',
      {
        title: d.title,
        description: d.description,
        cover_image: d.cover_image || '',
        category: d.category || '',
        location: d.location || '',
        start_time: d.start_time || null,
        end_time: d.end_time || null,
        signup_deadline: d.signup_deadline || null,
        max_participants: d.max_participants || null,
        points_per_hour: d.points_per_hour || 5,
        service_hours: d.service_hours || 0,
        organizer: d.organizer || '',
        contact_person: d.contact_person || '',
        contact_phone: d.contact_phone || '',
        status: d.status || 'recruiting',
        views: 0
      },
      `INSERT INTO volunteer_projects (title, description, cover_image, category, location, start_time, end_time, signup_deadline, max_participants, points_per_hour, service_hours, organizer, contact_person, contact_phone, status, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [d.title, d.description, d.cover_image || '', d.category || '', d.location || '', d.start_time || null, d.end_time || null, d.signup_deadline || null, d.max_participants || null, d.points_per_hour || 5, d.service_hours || 0, d.organizer || '', d.contact_person || '', d.contact_phone || '', d.status || 'recruiting']
    );

    res.json({ code: 200, message: '创建成功', data: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/volunteer-projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await db.getById('volunteer_projects', parseInt(id));
    if (!project) return res.status(404).json({ code: 404, message: '项目不存在' });

    const d = req.body;
    const updated = await db.update(
      'volunteer_projects', parseInt(id), {},
      `UPDATE volunteer_projects SET 
        title = ?, description = ?, cover_image = ?, category = ?,
        location = ?, start_time = ?, end_time = ?, signup_deadline = ?,
        max_participants = ?, points_per_hour = ?, service_hours = ?,
        organizer = ?, contact_person = ?, contact_phone = ?, status = ?
      WHERE id = ?`,
      [
        d.title || project.title,
        d.description || project.description,
        d.cover_image !== undefined ? d.cover_image : project.cover_image,
        d.category !== undefined ? d.category : project.category,
        d.location !== undefined ? d.location : project.location,
        d.start_time || project.start_time,
        d.end_time || project.end_time,
        d.signup_deadline || project.signup_deadline,
        d.max_participants || project.max_participants,
        d.points_per_hour || project.points_per_hour,
        d.service_hours !== undefined ? d.service_hours : project.service_hours,
        d.organizer !== undefined ? d.organizer : project.organizer,
        d.contact_person !== undefined ? d.contact_person : project.contact_person,
        d.contact_phone !== undefined ? d.contact_phone : project.contact_phone,
        d.status || project.status
      ]
    );

    res.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/volunteer-projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await db.getById('volunteer_projects', parseInt(id));
    if (!project) return res.status(404).json({ code: 404, message: '项目不存在' });
    await db.remove('volunteer_projects', parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/volunteer-signups/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const pid = parseInt(projectId);

    let signups;
    let total;

    if (db.useMySQL) {
      let sql = `SELECT s.*, u.real_name, u.username, u.phone, u.branch, u.avatar
                 FROM volunteer_signups s
                 INNER JOIN users u ON s.user_id = u.id
                 WHERE s.project_id = ?`;
      const params = [pid];
      let countSql = 'SELECT COUNT(*) as total FROM volunteer_signups WHERE project_id = ?';
      const countParams = [pid];

      if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
        countSql += ' AND status = ?';
        countParams.push(status);
      }

      sql += ' ORDER BY s.signed_up_at DESC LIMIT ?, ?';
      params.push((page - 1) * pageSize, pageSize);

      signups = await db.exec(sql, params);
      const [cr] = await db.exec(countSql, countParams);
      total = cr.total || 0;
    } else {
      const signupRecords = await db.findMany('volunteer_signups', s => {
        if (s.project_id !== pid) return false;
        if (status && s.status !== status) return false;
        return true;
      });

      const list = [];
      for (const signup of signupRecords) {
        const u = await db.getById('users', signup.user_id);
        list.push({
          ...signup,
          real_name: u ? u.real_name : '未知',
          username: u ? u.username : '未知',
          phone: u ? u.phone : '',
          branch: u ? u.branch : '',
          avatar: u ? u.avatar : ''
        });
      }
      list.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      signups = list.slice(start, end);
    }

    res.json({ code: 200, message: '获取成功', data: { list: signups, total, page, page_size: pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/volunteer-signups/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_opinion } = req.body;
    const signupId = parseInt(id);
    const adminId = req.user.id;
    const adminName = req.user.real_name;

    const signup = await db.getById('volunteer_signups', signupId);
    if (!signup) return res.status(404).json({ code: 404, message: '报名记录不存在' });

    await db.update(
      'volunteer_signups', signupId, {},
      'UPDATE volunteer_signups SET status = ?, review_opinion = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, review_opinion || '', adminId, signupId]
    );

    res.json({ code: 200, message: '审核成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/volunteer-service-records/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const pid = parseInt(projectId);

    let records;
    let total;

    if (db.useMySQL) {
      records = await db.exec(
        `SELECT r.*, u.real_name, u.username
         FROM volunteer_service_records r
         INNER JOIN users u ON r.user_id = u.id
         WHERE r.project_id = ?
         ORDER BY r.service_date DESC
         LIMIT ?, ?`,
        [pid, (page - 1) * pageSize, pageSize]
      );
      const [cr] = await db.exec(
        'SELECT COUNT(*) as total FROM volunteer_service_records WHERE project_id = ?',
        [pid]
      );
      total = cr.total || 0;
    } else {
      const recordList = await db.findMany('volunteer_service_records', r => r.project_id === pid);
      const list = [];
      for (const record of recordList) {
        const u = await db.getById('users', record.user_id);
        list.push({
          ...record,
          real_name: u ? u.real_name : '未知',
          username: u ? u.username : '未知'
        });
      }
      list.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      records = list.slice(start, end);
    }

    res.json({ code: 200, message: '获取成功', data: { list: records, total, page, page_size: pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/volunteer-service-records', async (req, res) => {
  try {
    const d = req.body;
    const adminId = req.user.id;

    if (!d.signup_id || !d.service_date || !d.start_time || !d.end_time) {
      return res.status(400).json({ code: 400, message: '请填写必要信息' });
    }

    const signup = await db.getById('volunteer_signups', parseInt(d.signup_id));
    if (!signup) return res.status(404).json({ code: 404, message: '报名记录不存在' });
    if (signup.status !== 'approved') {
      return res.status(400).json({ code: 400, message: '只有通过审核的报名才能登记服务时长' });
    }

    const project = await db.getById('volunteer_projects', signup.project_id);
    if (!project) return res.status(404).json({ code: 404, message: '项目不存在' });

    const start = new Date(d.start_time);
    const end = new Date(d.end_time);
    const actualHours = Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;

    if (actualHours <= 0) {
      return res.status(400).json({ code: 400, message: '结束时间必须晚于开始时间' });
    }

    const pointsPerHour = project.points_per_hour || 5;
    const pointsAwarded = Math.floor(actualHours * pointsPerHour);

    const record = await db.insert(
      'volunteer_service_records',
      {
        signup_id: signup.id,
        user_id: signup.user_id,
        project_id: signup.project_id,
        service_date: d.service_date,
        start_time: d.start_time,
        end_time: d.end_time,
        actual_hours: actualHours,
        task_description: d.task_description || '',
        checked_by: adminId,
        points_awarded: pointsAwarded,
        status: 'confirmed'
      },
      `INSERT INTO volunteer_service_records (signup_id, user_id, project_id, service_date, start_time, end_time, actual_hours, task_description, checked_by, points_awarded, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [signup.id, signup.user_id, signup.project_id, d.service_date, d.start_time, d.end_time, actualHours, d.task_description || '', adminId, pointsAwarded]
    );

    const user = await db.getById('users', signup.user_id);
    if (user) {
      await db.update(
        'users', signup.user_id, {},
        'UPDATE users SET points = points + ? WHERE id = ?',
        [pointsAwarded]
      );
    }

    await db.insert(
      'points_records',
      { user_id: signup.user_id, points: pointsAwarded, reason: `志愿服务：${project.title}`, type: 'earn' },
      'INSERT INTO points_records (user_id, points, reason, type) VALUES (?, ?, ?, ?)',
      [signup.user_id, pointsAwarded, `志愿服务：${project.title}`, 'earn']
    );

    await db.update(
      'volunteer_signups',
      signup.id,
      {},
      'UPDATE volunteer_signups SET service_hours = service_hours + ?, points_awarded = points_awarded + ? WHERE id = ?',
      [actualHours, pointsAwarded]
    );

    await db.update(
      'volunteer_projects',
      signup.project_id,
      {},
      'UPDATE volunteer_projects SET service_hours = service_hours + ? WHERE id = ?',
      [actualHours]
    );

    res.json({ code: 200, message: '登记成功，积分已发放', data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/volunteer-stats/overview', async (req, res) => {
  try {
    let totalProjects, recruitingProjects, completedProjects;
    let totalVolunteers, totalServiceHours, totalPointsAwarded;

    if (db.useMySQL) {
      const [tp] = await db.exec('SELECT COUNT(*) as c FROM volunteer_projects');
      const [rp] = await db.exec("SELECT COUNT(*) as c FROM volunteer_projects WHERE status = 'recruiting'");
      const [cp] = await db.exec("SELECT COUNT(*) as c FROM volunteer_projects WHERE status = 'completed'");
      const [tv] = await db.exec('SELECT COUNT(DISTINCT user_id) as c FROM volunteer_signups WHERE status = "approved"');
      const [th] = await db.exec('SELECT COALESCE(SUM(actual_hours), 0) as s FROM volunteer_service_records');
      const [tpa] = await db.exec('SELECT COALESCE(SUM(points_awarded), 0) as s FROM volunteer_service_records');

      totalProjects = tp.c;
      recruitingProjects = rp.c;
      completedProjects = cp.c;
      totalVolunteers = tv.c;
      totalServiceHours = th.s;
      totalPointsAwarded = tpa.s;
    } else {
      const projects = await db.getAll('volunteer_projects');
      totalProjects = projects.length;
      recruitingProjects = projects.filter(p => p.status === 'recruiting').length;
      completedProjects = projects.filter(p => p.status === 'completed').length;

      const approvedSignups = await db.findMany('volunteer_signups', s => s.status === 'approved');
      const volunteerSet = new Set(approvedSignups.map(s => s.user_id));
      totalVolunteers = volunteerSet.size;

      const records = await db.getAll('volunteer_service_records');
      totalServiceHours = records.reduce((sum, r) => sum + (r.actual_hours || 0), 0);
      totalPointsAwarded = records.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total_projects: totalProjects,
        recruiting_projects: recruitingProjects,
        completed_projects: completedProjects,
        total_volunteers: totalVolunteers,
        total_service_hours: totalServiceHours,
        total_points_awarded: totalPointsAwarded
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/volunteer-stats/by-category', async (req, res) => {
  try {
    let stats;

    if (db.useMySQL) {
      stats = await db.exec(
        `SELECT category, COUNT(*) as project_count
         FROM volunteer_projects
         WHERE category IS NOT NULL AND category != ''
         GROUP BY category
         ORDER BY project_count DESC`
      );
    } else {
      const projects = await db.getAll('volunteer_projects');
      const categoryMap = {};
      projects.forEach(p => {
        if (p.category) {
          if (!categoryMap[p.category]) {
            categoryMap[p.category] = 0;
          }
          categoryMap[p.category]++;
        }
      });
      stats = Object.entries(categoryMap)
        .map(([category, project_count]) => ({ category, project_count }))
        .sort((a, b) => b.project_count - a.project_count);
    }

    res.json({ code: 200, message: '获取成功', data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/volunteer-stats/ranking', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    let ranking;

    if (db.useMySQL) {
      ranking = await db.exec(
        `SELECT u.id, u.real_name, u.branch, u.avatar,
                COALESCE(SUM(r.actual_hours), 0) as total_hours,
                COALESCE(SUM(r.points_awarded), 0) as total_points
         FROM users u
         LEFT JOIN volunteer_service_records r ON u.id = r.user_id
         WHERE u.role = 'user'
         GROUP BY u.id
         ORDER BY total_hours DESC
         LIMIT ?`,
        [limit]
      );
    } else {
      const users = await db.findMany('users', u => u.role === 'user');
      const allRecords = await db.getAll('volunteer_service_records');

      ranking = users.map(user => {
        const userRecords = allRecords.filter(r => r.user_id === user.id);
        return {
          id: user.id,
          real_name: user.real_name,
          branch: user.branch,
          avatar: user.avatar,
          total_hours: userRecords.reduce((sum, r) => sum + (r.actual_hours || 0), 0),
          total_points: userRecords.reduce((sum, r) => sum + (r.points_awarded || 0), 0)
        };
      }).sort((a, b) => b.total_hours - a.total_hours).slice(0, limit);
    }

    res.json({ code: 200, message: '获取成功', data: ranking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/democratic-reviews', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const year = req.query.year;
    const branch = req.query.branch;
    const keyword = req.query.keyword;

    const predicate = item => {
      if (status && item.status !== status) return false;
      if (year && item.year !== parseInt(year)) return false;
      if (branch && item.branch !== branch) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!String(item.title || '').toLowerCase().includes(kw)) return false;
      }
      return true;
    };

    let sql = 'SELECT * FROM democratic_reviews';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM democratic_reviews';
    const countParams = [];
    let whereConditions = [];

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
      countParams.push(status);
    }
    if (year) {
      whereConditions.push('year = ?');
      params.push(parseInt(year));
      countParams.push(parseInt(year));
    }
    if (branch) {
      whereConditions.push('branch = ?');
      params.push(branch);
      countParams.push(branch);
    }
    if (keyword) {
      whereConditions.push('title LIKE ?');
      params.push(`%${keyword}%`);
      countParams.push(`%${keyword}%`);
    }

    if (whereConditions.length > 0) {
      const whereStr = ' WHERE ' + whereConditions.join(' AND ');
      sql += whereStr;
      countSql += whereStr;
    }

    const result = await db.paginate('democratic_reviews', {
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

    const list = [];
    for (const review of result.list) {
      const creator = await db.getById('users', review.created_by);
      const formItems = db.useMySQL
        ? await db.exec('SELECT * FROM democratic_review_form_items WHERE review_id = ? ORDER BY sort_order', [review.id])
        : (await db.findMany('democratic_review_form_items', fi => fi.review_id === review.id)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      let participantCount = 0;
      if (db.useMySQL) {
        const [pc] = await db.exec('SELECT COUNT(DISTINCT reviewer_id) as c FROM democratic_review_scores WHERE review_id = ?', [review.id]);
        participantCount = pc.c || 0;
      } else {
        const scores = await db.findMany('democratic_review_scores', s => s.review_id === review.id);
        participantCount = new Set(scores.map(s => s.reviewer_id)).size;
      }

      list.push({
        ...review,
        creator_name: creator ? creator.real_name : '未知',
        form_items: formItems,
        participant_count: participantCount
      });
    }

    res.json({ code: 200, message: '获取成功', data: { list, total: result.total, page, page_size: pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/democratic-reviews', async (req, res) => {
  try {
    const d = req.body;
    if (!d.title || !d.year || !d.branch) {
      return res.status(400).json({ code: 400, message: '标题、年份和支部不能为空' });
    }

    const review = await db.insert(
      'democratic_reviews',
      {
        title: d.title,
        year: d.year,
        branch: d.branch,
        description: d.description || '',
        status: d.status || 'draft',
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        created_by: req.user.id
      },
      'INSERT INTO democratic_reviews (title, year, branch, description, status, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [d.title, d.year, d.branch, d.description || '', d.status || 'draft', d.start_date || null, d.end_date || null, req.user.id]
    );

    if (d.form_items && Array.isArray(d.form_items)) {
      for (let i = 0; i < d.form_items.length; i++) {
        const item = d.form_items[i];
        await db.insert(
          'democratic_review_form_items',
          {
            review_id: review.id,
            item_name: item.item_name,
            item_type: item.item_type || 'score',
            max_score: item.max_score || 10,
            options: item.options || '',
            sort_order: i + 1,
            weight: item.weight || 1.0,
            required: item.required !== undefined ? item.required : 1
          },
          'INSERT INTO democratic_review_form_items (review_id, item_name, item_type, max_score, options, sort_order, weight, required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [review.id, item.item_name, item.item_type || 'score', item.max_score || 10, item.options || '', i + 1, item.weight || 1.0, item.required !== undefined ? item.required : 1]
        );
      }
    }

    await db.insert(
      'democratic_review_history',
      {
        review_id: review.id,
        action_type: 'create',
        action_detail: '创建民主评议',
        operator_id: req.user.id,
        operator_name: req.user.real_name
      },
      'INSERT INTO democratic_review_history (review_id, action_type, action_detail, operator_id, operator_name) VALUES (?, ?, ?, ?, ?)',
      [review.id, 'create', '创建民主评议', req.user.id, req.user.real_name]
    );

    res.json({ code: 200, message: '创建成功', data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/democratic-reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);
    const review = await db.getById('democratic_reviews', reviewId);
    if (!review) return res.status(404).json({ code: 404, message: '评议不存在' });

    const d = req.body;

    if (d.status === 'published' && review.status === 'draft') {
      if (!d.start_date && !review.start_date) {
        return res.status(400).json({ code: 400, message: '发布评议需设置开始时间' });
      }
    }

    await db.update(
      'democratic_reviews',
      reviewId,
      {},
      'UPDATE democratic_reviews SET title = ?, year = ?, branch = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE id = ?',
      [
        d.title || review.title,
        d.year || review.year,
        d.branch || review.branch,
        d.description !== undefined ? d.description : review.description,
        d.status || review.status,
        d.start_date || review.start_date,
        d.end_date || review.end_date,
        reviewId
      ]
    );

    if (d.form_items && Array.isArray(d.form_items)) {
      if (db.useMySQL) {
        await db.exec('DELETE FROM democratic_review_form_items WHERE review_id = ?', [reviewId]);
      } else {
        const existingItems = await db.findMany('democratic_review_form_items', fi => fi.review_id === reviewId);
        for (const item of existingItems) {
          await db.remove('democratic_review_form_items', item.id);
        }
      }

      for (let i = 0; i < d.form_items.length; i++) {
        const item = d.form_items[i];
        await db.insert(
          'democratic_review_form_items',
          {
            review_id: reviewId,
            item_name: item.item_name,
            item_type: item.item_type || 'score',
            max_score: item.max_score || 10,
            options: item.options || '',
            sort_order: i + 1,
            weight: item.weight || 1.0,
            required: item.required !== undefined ? item.required : 1
          },
          'INSERT INTO democratic_review_form_items (review_id, item_name, item_type, max_score, options, sort_order, weight, required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [reviewId, item.item_name, item.item_type || 'score', item.max_score || 10, item.options || '', i + 1, item.weight || 1.0, item.required !== undefined ? item.required : 1]
        );
      }
    }

    if (d.status && d.status !== review.status) {
      const statusMessages = {
        published: '发布评议',
        in_progress: '开始评议',
        completed: '完成评议',
        archived: '归档评议'
      };
      await db.insert(
        'democratic_review_history',
        {
          review_id: reviewId,
          action_type: d.status,
          action_detail: statusMessages[d.status] || `状态变更为${d.status}`,
          operator_id: req.user.id,
          operator_name: req.user.real_name
        },
        'INSERT INTO democratic_review_history (review_id, action_type, action_detail, operator_id, operator_name) VALUES (?, ?, ?, ?, ?)',
        [reviewId, d.status, statusMessages[d.status] || `状态变更为${d.status}`, req.user.id, req.user.real_name]
      );
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/democratic-reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await db.getById('democratic_reviews', parseInt(id));
    if (!review) return res.status(404).json({ code: 404, message: '评议不存在' });
    await db.remove('democratic_reviews', parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/democratic-review-stats/overview', async (req, res) => {
  try {
    let totalReviews, inProgressReviews, completedReviews, archivedReviews;
    let totalParticipants, avgScore;

    if (db.useMySQL) {
      const [tr] = await db.exec('SELECT COUNT(*) as c FROM democratic_reviews');
      const [ip] = await db.exec("SELECT COUNT(*) as c FROM democratic_reviews WHERE status = 'in_progress'");
      const [cr] = await db.exec("SELECT COUNT(*) as c FROM democratic_reviews WHERE status = 'completed'");
      const [ar] = await db.exec("SELECT COUNT(*) as c FROM democratic_reviews WHERE status = 'archived'");
      const [tp] = await db.exec('SELECT COUNT(DISTINCT reviewer_id) as c FROM democratic_review_scores');
      const [as] = await db.exec('SELECT AVG(score) as avg FROM democratic_review_scores WHERE review_type = ?', ['mutual']);
      totalReviews = tr.c;
      inProgressReviews = ip.c;
      completedReviews = cr.c;
      archivedReviews = ar.c;
      totalParticipants = tp.c;
      avgScore = as.avg || 0;
    } else {
      const reviews = await db.getAll('democratic_reviews');
      totalReviews = reviews.length;
      inProgressReviews = reviews.filter(r => r.status === 'in_progress').length;
      completedReviews = reviews.filter(r => r.status === 'completed').length;
      archivedReviews = reviews.filter(r => r.status === 'archived').length;

      const scores = await db.getAll('democratic_review_scores');
      const reviewerSet = new Set(scores.map(s => s.reviewer_id));
      totalParticipants = reviewerSet.size;
      const mutualScores = scores.filter(s => s.review_type === 'mutual');
      avgScore = mutualScores.length > 0 ? mutualScores.reduce((sum, s) => sum + (s.score || 0), 0) / mutualScores.length : 0;
    }

    let byYear, byBranch;
    if (db.useMySQL) {
      byYear = await db.exec('SELECT year, COUNT(*) as count FROM democratic_reviews GROUP BY year ORDER BY year DESC');
      byBranch = await db.exec('SELECT branch, COUNT(*) as count FROM democratic_reviews GROUP BY branch ORDER BY count DESC');
    } else {
      const reviews = await db.getAll('democratic_reviews');
      const yearMap = {};
      const branchMap = {};
      reviews.forEach(r => {
        yearMap[r.year] = (yearMap[r.year] || 0) + 1;
        branchMap[r.branch] = (branchMap[r.branch] || 0) + 1;
      });
      byYear = Object.entries(yearMap).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => b.year - a.year);
      byBranch = Object.entries(branchMap).map(([branch, count]) => ({ branch, count })).sort((a, b) => b.count - a.count);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total_reviews: totalReviews,
        in_progress_reviews: inProgressReviews,
        completed_reviews: completedReviews,
        archived_reviews: archivedReviews,
        total_participants: totalParticipants,
        avg_score: Math.round(avgScore * 100) / 100,
        by_year: byYear,
        by_branch: byBranch
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/democratic-review-stats/export/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);

    const review = await db.getById('democratic_reviews', reviewId);
    if (!review) return res.status(404).json({ code: 404, message: '评议不存在' });

    const formItems = db.useMySQL
      ? await db.exec('SELECT * FROM democratic_review_form_items WHERE review_id = ? ORDER BY sort_order', [reviewId])
      : (await db.findMany('democratic_review_form_items', fi => fi.review_id === reviewId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const allUsers = db.useMySQL
      ? await db.exec("SELECT id, real_name, branch FROM users WHERE branch = ? AND role != 'admin'", [review.branch])
      : await db.findMany('users', u => u.branch === review.branch && u.role !== 'admin');

    const allScores = db.useMySQL
      ? await db.exec('SELECT * FROM democratic_review_scores WHERE review_id = ?', [reviewId])
      : await db.findMany('democratic_review_scores', s => s.review_id === reviewId);

    const scoreItems = formItems.filter(fi => fi.item_type === 'score');
    const headers = ['姓名', '支部'];
    scoreItems.forEach(item => {
      headers.push(`互评-${item.item_name}`);
      headers.push(`组织评价-${item.item_name}`);
    });
    headers.push('互评加权均分', '组织评价加权均分', '综合得分');

    const rows = allUsers.map(user => {
      const row = [user.real_name, user.branch];
      const userMutualScores = allScores.filter(s => s.target_user_id === user.id && s.review_type === 'mutual');
      const userOrgScores = allScores.filter(s => s.target_user_id === user.id && s.review_type === 'organization');

      let mutualWeightedSum = 0;
      let mutualTotalWeight = 0;
      let orgWeightedSum = 0;
      let orgTotalWeight = 0;

      for (const item of scoreItems) {
        const mutualItemScores = userMutualScores.filter(s => s.form_item_id === item.id);
        const mutualAvg = mutualItemScores.length > 0
          ? mutualItemScores.reduce((sum, s) => sum + (s.score || 0), 0) / mutualItemScores.length
          : 0;
        row.push(mutualAvg.toFixed(1));

        const orgItemScores = userOrgScores.filter(s => s.form_item_id === item.id);
        const orgAvg = orgItemScores.length > 0
          ? orgItemScores.reduce((sum, s) => sum + (s.score || 0), 0) / orgItemScores.length
          : 0;
        row.push(orgAvg.toFixed(1));

        mutualWeightedSum += mutualAvg * (item.weight || 1);
        mutualTotalWeight += (item.weight || 1);
        orgWeightedSum += orgAvg * (item.weight || 1);
        orgTotalWeight += (item.weight || 1);
      }

      const mutualFinal = mutualTotalWeight > 0 ? mutualWeightedSum / mutualTotalWeight : 0;
      const orgFinal = orgTotalWeight > 0 ? orgWeightedSum / orgTotalWeight : 0;
      const totalFinal = mutualFinal * 0.4 + orgFinal * 0.6;

      row.push(mutualFinal.toFixed(2));
      row.push(orgFinal.toFixed(2));
      row.push(totalFinal.toFixed(2));

      return row;
    });

    rows.sort((a, b) => parseFloat(b[b.length - 1]) - parseFloat(a[a.length - 1]));

    let csv = '\uFEFF';
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=democratic_review_${reviewId}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
