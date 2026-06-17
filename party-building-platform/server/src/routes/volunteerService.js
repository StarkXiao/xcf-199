const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

const getSignupCount = async (projectId) => {
  return await db.count(
    'volunteer_signups',
    s => s.project_id === projectId && s.status !== 'rejected',
    'SELECT COUNT(*) as c FROM volunteer_signups WHERE project_id = ? AND status != ?',
    [projectId, 'rejected']
  );
};

const getApprovedSignupCount = async (projectId) => {
  return await db.count(
    'volunteer_signups',
    s => s.project_id === projectId && s.status === 'approved',
    'SELECT COUNT(*) as c FROM volunteer_signups WHERE project_id = ? AND status = ?',
    [projectId, 'approved']
  );
};

const getAverageRating = async (projectId) => {
  if (db.useMySQL) {
    const [result] = await db.exec(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM volunteer_reviews WHERE project_id = ?',
      [projectId]
    );
    return { avg_rating: result.avg_rating || 0, review_count: result.count || 0 };
  } else {
    const reviews = await db.findMany('volunteer_reviews', r => r.project_id === projectId);
    if (reviews.length === 0) return { avg_rating: 0, review_count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { avg_rating: sum / reviews.length, review_count: reviews.length };
  }
};

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const category = req.query.category;
    const keyword = req.query.keyword;

    const predicate = project => {
      if (status && project.status !== status) return false;
      if (category && project.category !== category) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!String(project.title || '').toLowerCase().includes(kw) &&
            !String(project.description || '').toLowerCase().includes(kw)) return false;
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
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
      countParams.push(category);
    }
    if (keyword) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (whereConditions.length > 0) {
      const whereStr = ' WHERE ' + whereConditions.join(' AND ');
      sql += whereStr;
      countSql += whereStr;
    }

    const result = await db.paginate('volunteer_projects', {
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
    for (const project of result.list) {
      const signupCount = await getSignupCount(project.id);
      const rating = await getAverageRating(project.id);
      list.push({
        ...project,
        signup_count: signupCount,
        avg_rating: rating.avg_rating,
        review_count: rating.review_count
      });
    }

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    let categories;
    if (db.useMySQL) {
      categories = await db.exec(
        'SELECT DISTINCT category FROM volunteer_projects WHERE category IS NOT NULL AND category != ""'
      );
    } else {
      const projects = await db.getAll('volunteer_projects');
      const categorySet = new Set();
      projects.forEach(p => {
        if (p.category) categorySet.add(p.category);
      });
      categories = Array.from(categorySet).map(c => ({ category: c }));
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: categories.map(c => c.category)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id);

    const project = await db.getById('volunteer_projects', projectId);
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }

    await db.update(
      'volunteer_projects', projectId, {},
      'UPDATE volunteer_projects SET views = views + 1 WHERE id = ?',
      [projectId]
    );
    project.views = (project.views || 0) + 1;

    const signupCount = await getSignupCount(projectId);
    const rating = await getAverageRating(projectId);

    const result = {
      ...project,
      signup_count: signupCount,
      avg_rating: rating.avg_rating,
      review_count: rating.review_count
    };

    if (req.user) {
      const signup = await db.findOne(
        'volunteer_signups',
        s => s.user_id === req.user.id && s.project_id === projectId,
        'SELECT * FROM volunteer_signups WHERE user_id = ? AND project_id = ? LIMIT 1',
        [req.user.id, projectId]
      );
      
      const activeStatuses = ['pending', 'approved'];
      result.is_signed_up = signup && activeStatuses.includes(signup.status) ? true : false;
      result.signup_status = signup ? signup.status : null;
      result.signup_id = signup ? signup.id : null;

      if (signup && signup.status === 'approved') {
        const serviceRecords = await db.findMany(
          'volunteer_service_records',
          r => r.user_id === req.user.id && r.project_id === projectId
        );
        result.total_service_hours = serviceRecords.reduce((sum, r) => sum + (r.actual_hours || 0), 0);
        result.total_points_awarded = signup.points_awarded || 0;
      }

      const review = await db.findOne(
        'volunteer_reviews',
        r => r.user_id === req.user.id && r.project_id === projectId,
        'SELECT * FROM volunteer_reviews WHERE user_id = ? AND project_id = ? LIMIT 1',
        [req.user.id, projectId]
      );
      result.has_reviewed = review ? true : false;
      result.my_review = review || null;
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/signup', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const projectId = parseInt(id);
    const { signup_reason, skills } = req.body;

    const project = await db.getById('volunteer_projects', projectId);
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }

    if (project.status !== 'recruiting') {
      return res.status(400).json({ code: 400, message: '该项目当前不接受报名' });
    }

    const now = new Date();
    if (project.signup_deadline && now > new Date(project.signup_deadline)) {
      return res.status(400).json({ code: 400, message: '报名已截止' });
    }

    const existingSignup = await db.findOne(
      'volunteer_signups',
      s => s.user_id === userId && s.project_id === projectId,
      'SELECT * FROM volunteer_signups WHERE user_id = ? AND project_id = ? LIMIT 1',
      [userId, projectId]
    );

    if (existingSignup && !['rejected', 'cancelled'].includes(existingSignup.status)) {
      return res.status(400).json({ code: 400, message: '已报名该项目' });
    }

    const approvedCount = await getApprovedSignupCount(projectId);
    if (project.max_participants && approvedCount >= project.max_participants) {
      return res.status(400).json({ code: 400, message: '报名人数已满' });
    }

    if (existingSignup) {
      await db.update(
        'volunteer_signups',
        existingSignup.id,
        { status: 'pending', signup_reason: signup_reason || '', skills: skills || '' },
        'UPDATE volunteer_signups SET status = ?, signup_reason = ?, skills = ?, signed_up_at = NOW() WHERE id = ?',
        ['pending', signup_reason || '', skills || '']
      );
    } else {
      await db.insert(
        'volunteer_signups',
        { user_id: userId, project_id: projectId, status: 'pending', signup_reason: signup_reason || '', skills: skills || '' },
        'INSERT INTO volunteer_signups (user_id, project_id, status, signup_reason, skills) VALUES (?, ?, ?, ?, ?)',
        [userId, projectId, 'pending', signup_reason || '', skills || '']
      );
    }

    res.json({
      code: 200,
      message: '报名成功，等待审核'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const projectId = parseInt(id);

    const signup = await db.findOne(
      'volunteer_signups',
      s => s.user_id === userId && s.project_id === projectId,
      'SELECT * FROM volunteer_signups WHERE user_id = ? AND project_id = ? LIMIT 1',
      [userId, projectId]
    );

    if (!signup) {
      return res.status(400).json({ code: 400, message: '未报名该项目' });
    }

    if (signup.status === 'approved') {
      return res.status(400).json({ code: 400, message: '已通过审核的报名不能取消，请联系管理员' });
    }

    await db.update(
      'volunteer_signups',
      signup.id,
      { status: 'cancelled' },
      'UPDATE volunteer_signups SET status = ? WHERE id = ?',
      ['cancelled']
    );

    res.json({
      code: 200,
      message: '取消报名成功'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/signups', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const userId = req.user.id;

    let signups;
    let total;

    if (db.useMySQL) {
      let sql = `SELECT s.*, p.title, p.cover_image, p.category, p.location, p.start_time, p.end_time, p.status as project_status, p.points_per_hour
                 FROM volunteer_signups s
                 INNER JOIN volunteer_projects p ON s.project_id = p.id
                 WHERE s.user_id = ?`;
      const params = [userId];
      let countSql = 'SELECT COUNT(*) as total FROM volunteer_signups WHERE user_id = ?';
      const countParams = [userId];

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
        if (s.user_id !== userId) return false;
        if (status && s.status !== status) return false;
        return true;
      });

      const list = [];
      for (const signup of signupRecords) {
        const project = await db.getById('volunteer_projects', signup.project_id);
        if (project) {
          list.push({
            ...signup,
            title: project.title,
            cover_image: project.cover_image,
            category: project.category,
            location: project.location,
            start_time: project.start_time,
            end_time: project.end_time,
            project_status: project.status,
            points_per_hour: project.points_per_hour
          });
        }
      }
      list.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      signups = list.slice(start, end);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: signups, total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/service-records', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const userId = req.user.id;

    let records;
    let total;

    if (db.useMySQL) {
      records = await db.exec(
        `SELECT r.*, p.title as project_title, p.category as project_category
         FROM volunteer_service_records r
         INNER JOIN volunteer_projects p ON r.project_id = p.id
         WHERE r.user_id = ?
         ORDER BY r.service_date DESC
         LIMIT ?, ?`,
        [userId, (page - 1) * pageSize, pageSize]
      );
      const [cr] = await db.exec(
        'SELECT COUNT(*) as total FROM volunteer_service_records WHERE user_id = ?',
        [userId]
      );
      total = cr.total || 0;
    } else {
      const recordList = await db.findMany('volunteer_service_records', r => r.user_id === userId);
      const list = [];
      for (const record of recordList) {
        const project = await db.getById('volunteer_projects', record.project_id);
        list.push({
          ...record,
          project_title: project ? project.title : '未知项目',
          project_category: project ? project.category : ''
        });
      }
      list.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      records = list.slice(start, end);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: records, total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    let totalProjects, totalHours, totalPoints;

    if (db.useMySQL) {
      const [tp] = await db.exec(
        "SELECT COUNT(DISTINCT project_id) as count FROM volunteer_signups WHERE user_id = ? AND status = 'approved'",
        [userId]
      );
      const [th] = await db.exec(
        'SELECT COALESCE(SUM(actual_hours), 0) as total FROM volunteer_service_records WHERE user_id = ?',
        [userId]
      );
      const [tpo] = await db.exec(
        'SELECT COALESCE(SUM(points_awarded), 0) as total FROM volunteer_signups WHERE user_id = ? AND status = ?',
        [userId, 'approved']
      );
      totalProjects = tp.count;
      totalHours = th.total;
      totalPoints = tpo.total;
    } else {
      const signups = await db.findMany('volunteer_signups', s => s.user_id === userId && s.status === 'approved');
      totalProjects = signups.length;
      totalPoints = signups.reduce((sum, s) => sum + (s.points_awarded || 0), 0);

      const records = await db.findMany('volunteer_service_records', r => r.user_id === userId);
      totalHours = records.reduce((sum, r) => sum + (r.actual_hours || 0), 0);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total_projects: totalProjects,
        total_hours: totalHours,
        total_points: totalPoints
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;

    let reviews;
    let total;

    if (db.useMySQL) {
      reviews = await db.exec(
        `SELECT r.*, u.real_name, u.avatar
         FROM volunteer_reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.project_id = ?
         ORDER BY r.created_at DESC
         LIMIT ?, ?`,
        [projectId, (page - 1) * pageSize, pageSize]
      );
      const [cr] = await db.exec(
        'SELECT COUNT(*) as total FROM volunteer_reviews WHERE project_id = ?',
        [projectId]
      );
      total = cr.total || 0;
    } else {
      const reviewList = await db.findMany('volunteer_reviews', r => r.project_id === projectId);
      const list = [];
      for (const review of reviewList) {
        const user = await db.getById('users', review.user_id);
        list.push({
          ...review,
          real_name: user ? user.real_name : '未知用户',
          avatar: user ? user.avatar : null
        });
      }
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      reviews = list.slice(start, end);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: reviews, total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/reviews', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const projectId = parseInt(id);
    const { rating, content } = req.body;

    const project = await db.getById('volunteer_projects', projectId);
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }

    const signup = await db.findOne(
      'volunteer_signups',
      s => s.user_id === userId && s.project_id === projectId && s.status === 'approved',
      "SELECT * FROM volunteer_signups WHERE user_id = ? AND project_id = ? AND status = 'approved' LIMIT 1",
      [userId, projectId]
    );

    if (!signup) {
      return res.status(400).json({ code: 400, message: '只有通过审核的志愿者才能评价' });
    }

    const existingReview = await db.findOne(
      'volunteer_reviews',
      r => r.user_id === userId && r.project_id === projectId,
      'SELECT * FROM volunteer_reviews WHERE user_id = ? AND project_id = ? LIMIT 1',
      [userId, projectId]
    );

    if (existingReview) {
      return res.status(400).json({ code: 400, message: '您已经评价过该项目' });
    }

    const review = await db.insert(
      'volunteer_reviews',
      { user_id: userId, project_id: projectId, signup_id: signup.id, rating: rating || 5, content: content || '' },
      'INSERT INTO volunteer_reviews (user_id, project_id, signup_id, rating, content) VALUES (?, ?, ?, ?, ?)',
      [userId, projectId, signup.id, rating || 5, content || '']
    );

    res.json({
      code: 200,
      message: '评价成功',
      data: review
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
