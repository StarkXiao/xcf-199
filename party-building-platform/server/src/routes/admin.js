const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', (req, res) => {
  const userCount = db.count('users', u => u.role === 'user');
  const articleCount = db.count('articles');
  const activityCount = db.count('activities');
  const noticeCount = db.count('notices');

  const users = db.findMany('users', u => u.role === 'user');
  const totalPoints = users.reduce((sum, u) => sum + u.points, 0);

  const signups = db.getAll('activity_signups');
  const recentSignups = signups
    .sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at))
    .slice(0, 10)
    .map(signup => {
      const user = db.getById('users', signup.user_id);
      const activity = db.getById('activities', signup.activity_id);
      return {
        real_name: user ? user.real_name : '未知用户',
        title: activity ? activity.title : '未知活动',
        signed_up_at: signup.signed_up_at
      };
    });

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
});

router.get('/articles', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const keyword = req.query.keyword;

  const predicate = article => {
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

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list: result.list,
      total: result.total,
      page,
      page_size: pageSize
    }
  });
});

router.post('/articles', (req, res) => {
  const { title, content, category, cover_image, author, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
  }

  const article = db.insert('articles', {
    title,
    content,
    category: category || '',
    cover_image: cover_image || '',
    author: author || '',
    status: status || 'published',
    views: 0
  });

  res.json({
    code: 200,
    message: '创建成功',
    data: article
  });
});

router.put('/articles/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, category, cover_image, author, status } = req.body;

  const article = db.getById('articles', parseInt(id));
  if (!article) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }

  const updated = db.update('articles', parseInt(id), {
    title: title || article.title,
    content: content || article.content,
    category: category !== undefined ? category : article.category,
    cover_image: cover_image !== undefined ? cover_image : article.cover_image,
    author: author !== undefined ? author : article.author,
    status: status || article.status
  });

  res.json({
    code: 200,
    message: '更新成功',
    data: updated
  });
});

router.delete('/articles/:id', (req, res) => {
  const { id } = req.params;

  const article = db.getById('articles', parseInt(id));
  if (!article) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }

  db.remove('articles', parseInt(id));

  res.json({
    code: 200,
    message: '删除成功'
  });
});

router.get('/activities', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;

  const result = db.paginate('activities', {
    page,
    page_size: pageSize,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const list = result.list.map(activity => ({
    ...activity,
    signup_count: db.count('activity_signups', s => s.activity_id === activity.id && s.status !== 'cancelled')
  }));

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list,
      total: result.total,
      page,
      page_size: pageSize
    }
  });
});

router.post('/activities', (req, res) => {
  const {
    title, description, cover_image, location,
    start_time, end_time, signup_deadline,
    max_participants, points_reward, status
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ code: 400, message: '标题和描述不能为空' });
  }

  const activity = db.insert('activities', {
    title,
    description,
    cover_image: cover_image || '',
    location: location || '',
    start_time: start_time || null,
    end_time: end_time || null,
    signup_deadline: signup_deadline || null,
    max_participants: max_participants || null,
    points_reward: points_reward || 10,
    status: status || 'upcoming'
  });

  res.json({
    code: 200,
    message: '创建成功',
    data: activity
  });
});

router.put('/activities/:id', (req, res) => {
  const { id } = req.params;
  const {
    title, description, cover_image, location,
    start_time, end_time, signup_deadline,
    max_participants, points_reward, status
  } = req.body;

  const activity = db.getById('activities', parseInt(id));
  if (!activity) {
    return res.status(404).json({ code: 404, message: '活动不存在' });
  }

  const updated = db.update('activities', parseInt(id), {
    title: title || activity.title,
    description: description || activity.description,
    cover_image: cover_image !== undefined ? cover_image : activity.cover_image,
    location: location !== undefined ? location : activity.location,
    start_time: start_time || activity.start_time,
    end_time: end_time || activity.end_time,
    signup_deadline: signup_deadline || activity.signup_deadline,
    max_participants: max_participants || activity.max_participants,
    points_reward: points_reward || activity.points_reward,
    status: status || activity.status
  });

  res.json({
    code: 200,
    message: '更新成功',
    data: updated
  });
});

router.delete('/activities/:id', (req, res) => {
  const { id } = req.params;

  const activity = db.getById('activities', parseInt(id));
  if (!activity) {
    return res.status(404).json({ code: 404, message: '活动不存在' });
  }

  db.remove('activities', parseInt(id));

  res.json({
    code: 200,
    message: '删除成功'
  });
});

router.get('/notices', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;

  const result = db.paginate('notices', {
    page,
    page_size: pageSize,
    sortBy: 'priority',
    sortOrder: 'desc'
  });

  const list = result.list.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list,
      total: result.total,
      page,
      page_size: pageSize
    }
  });
});

router.post('/notices', (req, res) => {
  const { title, content, type, priority, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
  }

  const notice = db.insert('notices', {
    title,
    content,
    type: type || 'general',
    priority: priority || 0,
    status: status || 'published'
  });

  res.json({
    code: 200,
    message: '创建成功',
    data: notice
  });
});

router.put('/notices/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, type, priority, status } = req.body;

  const notice = db.getById('notices', parseInt(id));
  if (!notice) {
    return res.status(404).json({ code: 404, message: '通知不存在' });
  }

  const updated = db.update('notices', parseInt(id), {
    title: title || notice.title,
    content: content || notice.content,
    type: type || notice.type,
    priority: priority !== undefined ? priority : notice.priority,
    status: status || notice.status
  });

  res.json({
    code: 200,
    message: '更新成功',
    data: updated
  });
});

router.delete('/notices/:id', (req, res) => {
  const { id } = req.params;

  const notice = db.getById('notices', parseInt(id));
  if (!notice) {
    return res.status(404).json({ code: 404, message: '通知不存在' });
  }

  db.remove('notices', parseInt(id));

  res.json({
    code: 200,
    message: '删除成功'
  });
});

router.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const keyword = req.query.keyword;

  const predicate = user => {
    if (user.role !== 'user') return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      if (!user.username.toLowerCase().includes(kw) && !user.real_name.toLowerCase().includes(kw)) {
        return false;
      }
    }
    return true;
  };

  const result = db.paginate('users', {
    page,
    page_size: pageSize,
    predicate,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const list = result.list.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list,
      total: result.total,
      page,
      page_size: pageSize
    }
  });
});

router.put('/users/:id/points', (req, res) => {
  const { id } = req.params;
  const { points, reason } = req.body;

  const user = db.getById('users', parseInt(id));
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  const newPoints = user.points + points;
  db.update('users', parseInt(id), { points: newPoints });

  db.insert('points_records', {
    user_id: parseInt(id),
    points,
    reason: reason || '管理员调整',
    type: points >= 0 ? 'earn' : 'deduct'
  });

  const updatedUser = db.getById('users', parseInt(id));
  const { password, ...userWithoutPassword } = updatedUser;

  res.json({
    code: 200,
    message: '积分调整成功',
    data: userWithoutPassword
  });
});

router.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  const user = db.getById('users', parseInt(id));
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ code: 400, message: '不能删除管理员账户' });
  }

  db.remove('users', parseInt(id));

  res.json({
    code: 200,
    message: '删除成功'
  });
});

router.get('/activity-signups/:activityId', (req, res) => {
  const { activityId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;

  const signups = db.findMany('activity_signups', s => s.activity_id === parseInt(activityId));
  
  const list = signups.map(signup => {
    const user = db.getById('users', signup.user_id);
    return {
      ...signup,
      real_name: user ? user.real_name : '未知',
      username: user ? user.username : '未知',
      phone: user ? user.phone : '',
      branch: user ? user.branch : ''
    };
  });

  list.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));

  const total = list.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedList = list.slice(start, end);

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list: paginatedList,
      total,
      page,
      page_size: pageSize
    }
  });
});

router.put('/activity-signups/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const signup = db.getById('activity_signups', parseInt(id));
  if (!signup) {
    return res.status(404).json({ code: 404, message: '报名记录不存在' });
  }

  if (status === 'approved' && signup.status !== 'approved') {
    const activity = db.getById('activities', signup.activity_id);
    if (activity) {
      const user = db.getById('users', signup.user_id);
      if (user) {
        db.update('users', signup.user_id, { points: user.points + activity.points_reward });
      }
      db.insert('points_records', {
        user_id: signup.user_id,
        points: activity.points_reward,
        reason: `参加活动：${activity.title}`,
        type: 'earn'
      });
    }
  }

  db.update('activity_signups', parseInt(id), { status });

  res.json({
    code: 200,
    message: '状态更新成功'
  });
});

module.exports = router;
